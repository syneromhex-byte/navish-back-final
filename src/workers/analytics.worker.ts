import { createQueue, QueueNames } from '../config/redis';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export const initAnalyticsWorker = () => {
  const queue = createQueue(QueueNames.ANALYTICS);

  queue.process('ingest-event', async (job) => {
    const data = job.data;
    logger.debug(`Ingesting telemetry event: ${data.eventType}`);

    try {
      await prisma.analytics.create({
        data: {
          projectId: data.projectId,
          entityType: data.entityType,
          entityId: data.entityId,
          eventType: data.eventType,
          userId: data.userId,
          sessionId: data.sessionId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          duration: data.duration,
          metadata: data.metadata || {},
        },
      });

      return { success: true };
    } catch (err: any) {
      logger.error('Failed to ingest analytics telemetry event', { error: err.message });
      throw err;
    }
  });

  return queue;
};
