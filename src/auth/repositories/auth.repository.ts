import { prisma } from '../../config/database';

export class AuthRepository {
  // ── Find user by email ──────────────────────────────────────────────────────
  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        permissions: { include: { permission: { select: { name: true } } } },
      },
    });
  }

  // ── Find user by ID ────────────────────────────────────────────────────────
  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        permissions: { include: { permission: { select: { name: true } } } },
      },
    });
  }

  // ── Create password reset token ────────────────────────────────────────────
  async createPasswordReset(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    // Invalidate existing reset tokens
    await prisma.passwordReset.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.passwordReset.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  // ── Validate password reset token ──────────────────────────────────────────
  async validatePasswordReset(tokenHash: string) {
    return prisma.passwordReset.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  // ── Consume password reset token ───────────────────────────────────────────
  async consumePasswordReset(id: string, hashedPassword: string, userId: string): Promise<void> {
    await prisma.$transaction([
      prisma.passwordReset.update({ where: { id }, data: { usedAt: new Date() } }),
      prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword, passwordChangedAt: new Date() },
      }),
    ]);
  }

  // ── Create email verification token ───────────────────────────────────────
  async createEmailVerification(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await prisma.emailVerification.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  // ── Consume email verification token ──────────────────────────────────────
  async consumeEmailVerification(tokenHash: string): Promise<boolean> {
    const record = await prisma.emailVerification.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });

    if (!record) return false;

    await prisma.$transaction([
      prisma.emailVerification.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date(), status: 'ACTIVE' },
      }),
    ]);

    return true;
  }

  // ── Update last login ───────────────────────────────────────────────────────
  async updateLastLogin(userId: string, ip?: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        loginCount: { increment: 1 },
      },
    });
  }
}

export const authRepository = new AuthRepository();
export default authRepository;
