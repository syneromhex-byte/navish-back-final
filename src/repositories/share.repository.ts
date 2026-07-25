import { prisma } from '../config/database';
import { generateTokenPair } from '../utils/crypto';
import { hashPassword, verifyPassword } from '../auth/bcrypt';
import type { CreateShareLinkDto, UpdateShareLinkDto } from '../validators/share.validator';
import { ShareLinkStatus } from '@prisma/client';

export class ShareRepository {
  async create(data: CreateShareLinkDto, createdById: string): Promise<{ shareLink: object; rawToken: string }> {
    const { raw, hash } = generateTokenPair(32);
    const passwordHash = data.password ? await hashPassword(data.password) : null;

    const shareLink = await prisma.shareLink.create({
      data: {
        projectId: data.projectId,
        clientId: data.clientId,
        tokenHash: hash,
        passwordHash,
        expiresAt: data.expiresAt,
        maxAccessCount: data.maxAccessCount,
        allowDownload: data.allowDownload ?? false,
        isOneTime: data.isOneTime ?? false,
        createdById,
      },
      include: {
        project: { select: { id: true, name: true, slug: true } },
      },
    });

    return { shareLink, rawToken: raw };
  }

  async findByTokenHash(tokenHash: string) {
    return prisma.shareLink.findFirst({
      where: { tokenHash, status: ShareLinkStatus.ACTIVE },
      include: {
        project: {
          include: {
            rooms: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
          },
        },
        client: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.shareLink.findUnique({
      where: { id },
      include: { project: true, client: true },
    });
  }

  async findByProject(projectId: string) {
    return prisma.shareLink.findMany({
      where: { projectId, status: ShareLinkStatus.ACTIVE },
      include: { client: { select: { companyName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyPassword(shareLink: { passwordHash: string | null }, password?: string): Promise<boolean> {
    if (!shareLink.passwordHash) return true; // No password set
    if (!password) return false;
    return verifyPassword(password, shareLink.passwordHash);
  }

  async recordAccess(id: string, ip?: string): Promise<void> {
    await prisma.$transaction([
      prisma.shareLink.update({
        where: { id },
        data: { accessCount: { increment: 1 }, lastAccessedAt: new Date(), lastAccessedIp: ip },
      }),
      prisma.shareAccessLog.create({ data: { shareLinkId: id, ipAddress: ip } }),
    ]);
  }

  async revoke(id: string, revokedById: string): Promise<void> {
    await prisma.shareLink.update({
      where: { id },
      data: { status: ShareLinkStatus.REVOKED, revokedAt: new Date(), revokedById },
    });
  }

  async update(id: string, data: UpdateShareLinkDto) {
    const passwordHash = data.password !== undefined
      ? (data.password ? await hashPassword(data.password) : null)
      : undefined;

    return prisma.shareLink.update({
      where: { id },
      data: {
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
        ...(data.maxAccessCount !== undefined ? { maxAccessCount: data.maxAccessCount } : {}),
        ...(data.allowDownload !== undefined ? { allowDownload: data.allowDownload } : {}),
        ...(passwordHash !== undefined ? { passwordHash } : {}),
      },
    });
  }

  async expireStale(): Promise<number> {
    const result = await prisma.shareLink.updateMany({
      where: {
        status: ShareLinkStatus.ACTIVE,
        expiresAt: { lte: new Date() },
      },
      data: { status: ShareLinkStatus.EXPIRED },
    });
    return result.count;
  }
}

export const shareRepository = new ShareRepository();
