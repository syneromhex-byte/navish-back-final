import { authRepository } from '../repositories/auth.repository';
import { userRepository } from '../../repositories/user.repository';
import { signAccessToken, signRefreshToken } from '../jwt/jwt';
import { hashPassword, verifyPassword } from '../bcrypt';
import { storeRefreshToken, revokeRefreshToken, rotateRefreshToken } from '../refresh/refreshToken';
import { generateTokenPair, hashToken } from '../../utils/crypto';
import { ApiError } from '../../utils/ApiError';
import { emailService } from '../email/email.service';
import { auditLogger, logger } from '../../config/logger';
import { env } from '../../config/env';
import type {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ResetPasswordOtpDto,
  VerifyEmailOtpDto,
  ResendOtpDto,
} from '../validators/auth.validator';
import { UserRole, UserStatus } from '@prisma/client';
import { otpService } from '../otp/otp.service';
import { prisma } from '../../config/database';
import { verifiedEmailStore } from './verified-email.store';

export class AuthService {
  async login(dto: LoginDto, meta?: { ip?: string; deviceInfo?: string }) {
    // 1. Find user
    const user = await authRepository.findByEmail(dto.email);

    if (!user) {
      auditLogger.warn('Failed login attempt', {
        action: 'FAILED_LOGIN',
        email: dto.email,
        reason: 'User not found',
        ipAddress: meta?.ip,
      });
      throw ApiError.unauthorized('User not found');
    }

    if (user.deletedAt) {
      auditLogger.warn('Failed login attempt', {
        action: 'FAILED_LOGIN',
        actorId: user.id,
        email: dto.email,
        reason: 'Account is deleted',
        ipAddress: meta?.ip,
      });
      throw ApiError.unauthorized('Account not found');
    }

    if (user.status === UserStatus.SUSPENDED) {
      auditLogger.warn('Failed login attempt', {
        action: 'FAILED_LOGIN',
        actorId: user.id,
        email: dto.email,
        reason: 'Account is suspended',
        ipAddress: meta?.ip,
      });
      throw ApiError.forbidden('Account suspended. Contact support.');
    }

    if (user.status === UserStatus.INACTIVE) {
      auditLogger.warn('Failed login attempt', {
        action: 'FAILED_LOGIN',
        actorId: user.id,
        email: dto.email,
        reason: 'Account is inactive',
        ipAddress: meta?.ip,
      });
      throw ApiError.forbidden('Account is inactive.');
    }

    // 2. Verify password
    const passwordValid = await verifyPassword(dto.password, user.password);
    if (!passwordValid) {
      auditLogger.warn('Failed login attempt', {
        action: 'FAILED_LOGIN',
        actorId: user.id,
        email: dto.email,
        reason: 'Invalid password',
        ipAddress: meta?.ip,
      });
      throw ApiError.unauthorized('Invalid email or password');
    }

    // 3. Build permissions
    const permissions = user.permissions.map((p: any) => p.permission.name);

    // 4. Sign tokens
    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      permissions,
    });

    const refreshToken = signRefreshToken(user.id, dto.deviceId);

    // 5. Store refresh token
    await storeRefreshToken(user.id, refreshToken, dto.deviceId, {
      ipAddress: meta?.ip,
      deviceInfo: meta?.deviceInfo,
    });

    // 6. Update login metadata
    await authRepository.updateLastLogin(user.id, meta?.ip);

    // 7. Audit log success
    auditLogger.info('User login successful', {
      action: 'LOGIN',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta?.ip,
    });

    const { password: _pw, ...safeUser } = user;

    return {
      accessToken,
      refreshToken,
      user: safeUser,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    };
  }

  async register(dto: RegisterDto, meta?: { ip?: string }) {
    // 1. Gate: Email must have passed OTP verification in Redis
    const isEmailVerified = await verifiedEmailStore.has(dto.email);
    if (!isEmailVerified) {
      throw ApiError.badRequest(
        'Email verification required. Please verify your email address via OTP before registering.',
      );
    }

    // 2. Check email uniqueness
    const existing = await authRepository.findByEmail(dto.email);
    if (existing) throw ApiError.conflict('Email already registered');

    // 3. Hash password before database repository call
    const hashedPassword = await hashPassword(dto.password);

    // 4. Create user — pre-verified, active immediately
    const user = await userRepository.createVerified({
      ...dto,
      password: hashedPassword,
      role: (dto.role as UserRole) ?? UserRole.CLIENT,
    });

    // 5. Consume the verified-email store session from Redis
    await verifiedEmailStore.consume(dto.email);

    auditLogger.info('User registered successfully', {
      action: 'REGISTER',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta?.ip,
    });

    return user;
  }

  async refreshTokens(oldRefreshToken: string, meta?: { ip?: string; deviceInfo?: string }) {
    const newRefreshToken = await rotateRefreshToken(oldRefreshToken, meta);

    const payload = signRefreshToken !== null ? (await import('../jwt/jwt')).verifyRefreshToken(newRefreshToken) : { sub: '' };
    const user = await authRepository.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('User not found');

    const permissions = user.permissions.map((p: any) => p.permission.name);
    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email, permissions });

    auditLogger.info('User refreshed access tokens', {
      action: 'REFRESH',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta?.ip,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string, userId: string): Promise<void> {
    try {
      await revokeRefreshToken(refreshToken, userId);
    } catch {
      // Already revoked
    }

    auditLogger.info('User logout successful', {
      action: 'LOGOUT',
      actorId: userId,
      entityType: 'User',
      entityId: userId,
    });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await authRepository.findByEmail(dto.email);
    if (!user) return; // Silently succeed to prevent email enumeration

    // Create and send OTP code
    await otpService.generateAndSendOtp(user.email, 'PASSWORD_RESET');

    // Generate link-based reset token if needed, and send template for compatibility
    const { raw, hash } = generateTokenPair();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await authRepository.createPasswordReset(user.id, hash, expiresAt);
    await emailService.sendPasswordResetLink(user.email, `${user.firstName}`, raw);

    auditLogger.info('User password reset OTP issued', {
      action: 'OTP_SENT',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const record = await authRepository.validatePasswordReset(tokenHash);
    if (!record) throw ApiError.badRequest('Invalid or expired reset token');

    const hashedPassword = await hashPassword(dto.password);
    await authRepository.consumePasswordReset(record.id, hashedPassword, record.userId);

    auditLogger.info('User password reset via link successful', {
      action: 'PASSWORD_RESET',
      actorId: record.userId,
      entityType: 'User',
      entityId: record.userId,
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const success = await authRepository.consumeEmailVerification(tokenHash);
    if (!success) throw ApiError.badRequest('Invalid or expired verification token');

    // Retrieve userId
    const verification = await prisma.emailVerification.findFirst({ where: { tokenHash } });
    if (verification) {
      auditLogger.info('User email verified via link', {
        action: 'EMAIL_VERIFIED',
        actorId: verification.userId,
        entityType: 'User',
        entityId: verification.userId,
      });
    }
  }

  /**
   * POST /verify-email-otp — unified flow supporting pre-registration registration Redis sessions
   * and post-registration fallback compatibility.
   */
  async verifyEmailOtp(dto: VerifyEmailOtpDto): Promise<void> {
    // 1. Verify OTP code matches what was stored
    await otpService.verifyOtp(dto.email, dto.code, 'EMAIL_VERIFICATION');

    // 2. Identify if user account exists
    const user = await authRepository.findByEmail(dto.email);
    if (user) {
      // Post-registration flow: update verification status directly in DB
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          status: UserStatus.ACTIVE,
        },
      });
      auditLogger.info('User email verified via OTP success', {
        action: 'EMAIL_VERIFIED',
        actorId: user.id,
        entityType: 'User',
        entityId: user.id,
      });
      logger.debug(`[AuthService] Post-registration OTP verified for existing user: ${dto.email}`);
    } else {
      // Pre-registration flow: save session record in Redis verified store
      await verifiedEmailStore.set(dto.email);
      auditLogger.info('Pre-registration email verified via OTP', {
        action: 'OTP_VERIFIED',
        entityType: 'EmailVerificationLine',
        entityId: dto.email,
      });
      logger.debug(`[AuthService] Pre-registration OTP verified for new user: ${dto.email} (saved to Redis)`);
    }
  }

  async verifyOtp(dto: VerifyEmailOtpDto): Promise<void> {
    // Unify pre-registration and post-registration flow under verifyEmailOtp
    await this.verifyEmailOtp(dto);
  }

  async resetPasswordOtp(dto: ResetPasswordOtpDto): Promise<void> {
    // 1. Verify OTP matches database record
    await otpService.verifyOtp(dto.email, dto.code, 'PASSWORD_RESET');

    // 2. Locate user record
    const user = await authRepository.findByEmail(dto.email);
    if (!user) throw ApiError.notFound('User not found');

    // 3. Hash and store password
    const hashedPassword = await hashPassword(dto.password);
    await userRepository.updatePassword(user.id, hashedPassword);

    auditLogger.info('User password reset via OTP successful', {
      action: 'PASSWORD_RESET',
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
    });
  }

  async sendOtp(email: string, name?: string): Promise<{ message: string }> {
    const existing = await authRepository.findByEmail(email);
    if (existing) throw ApiError.conflict('Email already registered');

    await otpService.generateAndSendOtp(email, 'EMAIL_VERIFICATION');

    auditLogger.info('Pre-registration verification OTP sent', {
      action: 'OTP_SENT',
      entityType: 'Email',
      entityId: email,
    });

    return { message: 'OTP sent successfully.' };
  }

  async resendOtp(dto: ResendOtpDto): Promise<void> {
    // Standardize otp dispatching
    await otpService.generateAndSendOtp(dto.email, dto.purpose);

    auditLogger.info('Verification OTP resent', {
      action: 'OTP_SENT',
      entityType: 'Email',
      entityId: dto.email,
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await authRepository.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) throw ApiError.badRequest('Current password is incorrect');

    const hashedPassword = await hashPassword(newPassword);
    await userRepository.updatePassword(userId, hashedPassword);

    auditLogger.info('User password modified via settings', {
      action: 'PASSWORD_RESET',
      actorId: userId,
      entityType: 'User',
      entityId: userId,
    });
  }

  async getMe(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    const { password: _pw, ...safeUser } = user;
    return safeUser;
  }
}

export const authService = new AuthService();
export default authService;
