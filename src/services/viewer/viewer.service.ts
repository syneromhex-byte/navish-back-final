import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { ViewerSession } from '../../types';

const VIEWER_SESSION_PREFIX = 'viewer:session:';
const LIVE_VIEWERS_KEY = 'viewer:live:';

export class ViewerService {
  async getSessionState(projectId: string, roomId?: string): Promise<ViewerSession | null> {
    const key = `${VIEWER_SESSION_PREFIX}${projectId}:${roomId || 'default'}`;
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  async saveSessionState(projectId: string, roomId: string | undefined, state: ViewerSession): Promise<void> {
    const key = `${VIEWER_SESSION_PREFIX}${projectId}:${roomId || 'default'}`;
    // Save for 24 hours
    await redis.setex(key, 86400, JSON.stringify(state));
  }

  async addLiveViewer(projectId: string, userId: string): Promise<number> {
    const key = `${LIVE_VIEWERS_KEY}${projectId}`;
    await redis.sadd(key, userId);
    return redis.scard(key);
  }

  async removeLiveViewer(projectId: string, userId: string): Promise<number> {
    const key = `${LIVE_VIEWERS_KEY}${projectId}`;
    await redis.srem(key, userId);
    return redis.scard(key);
  }

  async getLiveViewerCount(projectId: string): Promise<number> {
    const key = `${LIVE_VIEWERS_KEY}${projectId}`;
    return redis.scard(key);
  }

  async saveScreenshotMetadata(projectId: string, roomId: string, storagePath: string, publicUrl: string, userId: string) {
    return prisma.analytics.create({
      data: {
        projectId,
        entityType: 'room',
        entityId: roomId,
        eventType: 'SCREENSHOT',
        userId,
        metadata: {
          storagePath,
          publicUrl,
        },
      },
    });
  }
}

export const viewerService = new ViewerService();
