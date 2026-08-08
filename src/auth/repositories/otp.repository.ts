import { prisma } from '../../config/database';

export class OtpRepository {
  async deleteManyByEmailAndPurpose(email: string, purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'): Promise<void> {
    await prisma.otp.deleteMany({
      where: { email, purpose },
    });
  }

  async create(email: string, codeHash: string, purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET', expiresAt: Date) {
    return prisma.otp.create({
      data: { email, codeHash, purpose, expiresAt },
    });
  }

  async findLatestByEmailAndPurpose(email: string, purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') {
    return prisma.otp.findFirst({
      where: { email, purpose },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.otp.delete({
      where: { id },
    });
  }

  async incrementAttempts(id: string, currentAttempts: number): Promise<void> {
    await prisma.otp.update({
      where: { id },
      data: { attempts: currentAttempts + 1 },
    });
  }
}

export const otpRepository = new OtpRepository();
