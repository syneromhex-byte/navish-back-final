import { shareRepository } from '../../repositories/share.repository';
import { projectRepository } from '../../repositories/project.repository';
import { signViewerToken } from '../../auth/jwt/jwt';
import { hashToken } from '../../utils/crypto';
import { ApiError } from '../../utils/ApiError';
import { ShareLinkStatus } from '@prisma/client';
import type { CreateShareLinkDto, AccessShareLinkDto, UpdateShareLinkDto } from '../../validators/share.validator';
import { env } from '../../config/env';

export class ShareService {
  async createShareLink(dto: CreateShareLinkDto, createdById: string) {
    const project = await projectRepository.findById(dto.projectId);
    if (!project) throw ApiError.notFound('Project not found');

    const { shareLink, rawToken } = await shareRepository.create(dto, createdById);

    const shareUrl = `${env.FRONTEND_URL}/view/${rawToken}`;

    return { shareLink, shareUrl, rawToken };
  }

  async accessShareLink(dto: AccessShareLinkDto, ip?: string) {
    // Hash raw token → look up DB
    const tokenHash = hashToken(dto.token);
    const shareLink = await shareRepository.findByTokenHash(tokenHash);

    if (!shareLink) throw ApiError.notFound('Share link not found or expired');
    if (shareLink.status !== ShareLinkStatus.ACTIVE) {
      throw ApiError.forbidden(`This link has been ${shareLink.status.toLowerCase()}`);
    }

    // Check expiry
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      await shareRepository.expireStale();
      throw ApiError.forbidden('This share link has expired');
    }

    // Check access count
    if (shareLink.maxAccessCount && shareLink.accessCount >= shareLink.maxAccessCount) {
      throw ApiError.forbidden('This share link has reached its maximum access count');
    }

    // Check password
    const passwordOk = await shareRepository.verifyPassword(shareLink, dto.password);
    if (!passwordOk) throw ApiError.unauthorized('Incorrect share link password');

    // Record access
    await shareRepository.recordAccess(shareLink.id, ip);

    // Issue Viewer JWT
    const viewerToken = signViewerToken({
      sub: shareLink.id,
      projectId: shareLink.projectId,
      type: 'viewer',
      allowDownload: shareLink.allowDownload,
    });

    return {
      viewerToken,
      project: shareLink.project,
      allowDownload: shareLink.allowDownload,
      expiresIn: '4h',
    };
  }

  async getShareLinksByProject(projectId: string) {
    return shareRepository.findByProject(projectId);
  }

  async getShareLinkById(id: string) {
    const link = await shareRepository.findById(id);
    if (!link) throw ApiError.notFound('Share link not found');
    return link;
  }

  async updateShareLink(id: string, dto: UpdateShareLinkDto) {
    const link = await shareRepository.findById(id);
    if (!link) throw ApiError.notFound('Share link not found');
    return shareRepository.update(id, dto);
  }

  async revokeShareLink(id: string, userId: string): Promise<void> {
    const link = await shareRepository.findById(id);
    if (!link) throw ApiError.notFound('Share link not found');
    await shareRepository.revoke(id, userId);
  }

  async expireStaleLinks(): Promise<number> {
    return shareRepository.expireStale();
  }
}

export const shareService = new ShareService();
