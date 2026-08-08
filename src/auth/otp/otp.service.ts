import { hashToken, verifyTokenHash } from '../../utils/crypto';
import { emailService } from '../email/email.service';
import { otpRepository } from '../repositories/otp.repository';
import { userRepository } from '../../repositories/user.repository';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../config/logger';

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

export class OtpService {
  /**
   * General-purpose 6-digit OTP code generator.
   */
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate an OTP record, save hashed value, and dispatch it to user.
   */
  async generateAndSendOtp(email: string, purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'): Promise<void> {
    logger.debug(`[OtpService] generateAndSendOtp called → email=${email} purpose=${purpose}`);

    const code = this.generateCode();
    const codeHash = hashToken(code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    logger.debug(`[OtpService] OTP generated — expiresAt=${expiresAt.toISOString()}`);

    // Clean up any stale or previous OTPs for this email + purpose to avoid abuse
    await otpRepository.deleteManyByEmailAndPurpose(email, purpose);
    logger.debug(`[OtpService] Stale OTPs cleared for email=${email} purpose=${purpose}`);

    // Save hashed OTP to database
    await otpRepository.create(email, codeHash, purpose, expiresAt);
    logger.debug(`[OtpService] OTP record saved to database for email=${email}`);

    // Retrieve user name if available
    const user = await userRepository.findByEmail(email);
    const name = user ? `${user.firstName} ${user.lastName}` : 'Valued User';

    logger.debug(`[OtpService] Dispatching ${purpose} email to ${email}`);

    // Dispatch email notification containing OTP using standard public methods
    if (purpose === 'PASSWORD_RESET') {
      await emailService.sendPasswordResetOtp(email, name, code);
    } else {
      await emailService.sendVerificationOtp(email, name, code);
    }

    logger.info(`[OtpService] OTP email dispatched successfully → email=${email} purpose=${purpose}`);
  }

  /**
   * Verify direct OTP match, handle lockout/retry threshold attempts and validity windows.
   */
  async verifyOtp(email: string, code: string, purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'): Promise<boolean> {
    logger.debug(`[OtpService] verifyOtp called: email=${email}, code=${code}, purpose=${purpose}`);

    const record = await otpRepository.findLatestByEmailAndPurpose(email, purpose);

    if (!record) {
      logger.warn(`[OtpService] No OTP record found for email=${email}, purpose=${purpose}`);
      throw ApiError.badRequest('No active verification request found for this email address');
    }

    if (new Date() > record.expiresAt) {
      await otpRepository.delete(record.id);
      throw ApiError.badRequest('Verification code has expired. Please request a new code.');
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await otpRepository.delete(record.id);
      throw ApiError.forbidden('Maximum verification attempts exceeded. Please request a new code.');
    }

    const matches = verifyTokenHash(code, record.codeHash);
    if (!matches) {
      await otpRepository.incrementAttempts(record.id, record.attempts);
      throw ApiError.badRequest(`Incorrect verification code. Attempts remaining: ${OTP_MAX_ATTEMPTS - record.attempts - 1}`);
    }

    // Success! Consume/Delete the OTP record
    await otpRepository.delete(record.id);
    return true;
  }
}

export const otpService = new OtpService();
export default otpService;
