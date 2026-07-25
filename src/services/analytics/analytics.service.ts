import { prisma } from '../../config/database';
import { AnalyticsEventType } from '@prisma/client';
import { getQueues, QueueNames } from '../../config/redis';

export class AnalyticsService {
  async logEvent(data: {
    projectId?: string;
    entityType: string;
    entityId: string;
    eventType: AnalyticsEventType;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    duration?: number;
    metadata?: object;
  }) {
    // We can directly persist or queue it to keep API response times minimal
    const queues = getQueues();
    await queues[QueueNames.ANALYTICS].add('ingest-event', data);
  }

  async getProjectAnalytics(projectId: string, startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days default
    const end = endDate || new Date();

    const range = { gte: start, lte: end };

    const [events, viewCount, uniqueUsers, materialChanges] = await prisma.$transaction([
      prisma.analytics.findMany({
        where: { projectId, createdAt: range },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.analytics.count({
        where: { projectId, eventType: AnalyticsEventType.PROJECT_VIEW, createdAt: range },
      }),
      prisma.analytics.findMany({
        where: { projectId, createdAt: range, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.analytics.count({
        where: { projectId, eventType: AnalyticsEventType.MATERIAL_CHANGE, createdAt: range },
      }),
    ]);

    return {
      summary: {
        totalViews: viewCount,
        uniqueViewers: uniqueUsers.length,
        materialSwaps: materialChanges,
        dateRange: { start, end },
      },
      recentEvents: events,
    };
  }

  async generateCSVReport(projectId: string): Promise<string> {
    const events = await prisma.analytics.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        eventType: true,
        entityType: true,
        entityId: true,
        userId: true,
        createdAt: true,
        metadata: true,
      },
    });

    let csvContent = 'Event Type,Entity Type,Entity ID,User ID,Timestamp,Metadata\n';
    for (const e of events) {
      const metaStr = e.metadata ? JSON.stringify(e.metadata).replace(/"/g, '""') : '';
      csvContent += `${e.eventType},${e.entityType},${e.entityId},${e.userId || 'anonymous'},${e.createdAt.toISOString()},"${metaStr}"\n`;
    }

    return csvContent;
  }
}

export const analyticsService = new AnalyticsService();
