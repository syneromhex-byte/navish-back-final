import { createQueue, QueueNames } from '../config/redis';
import { prisma } from '../config/database';
import { shareService } from '../services/share/share.service';
import { deleteFromS3 } from '../config/aws';
import { logger } from '../config/logger';
import { UploadStatus } from '@prisma/client';

export const initCronJobs = async () => {
  const queue = createQueue(QueueNames.CLEANUP);

  // Process cleanup jobs
  queue.process('daily-cleanup', async (job) => {
    logger.info('Daily maintenance cleanup starting...');

    let expiredLinksCount = 0;
    let purgedUploadSessions = 0;

    try {
      // 1. Expire stale share links
      expiredLinksCount = await shareService.expireStaleLinks();

      // 2. Clean out expired uploading sessions (older than 24h)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const abandonedSessions = await prisma.uploadSession.findMany({
        where: {
          status: UploadStatus.UPLOADING,
          createdAt: { lte: dayAgo },
        },
      });

      for (const s of abandonedSessions) {
        try {
          await deleteFromS3(s.s3Key);
        } catch {
          // File might not have been fully sent — that's fine
        }
      }

      const purgeResult = await prisma.uploadSession.deleteMany({
        where: {
          status: { in: [UploadStatus.UPLOADING, UploadStatus.ABORTED] },
          createdAt: { lte: dayAgo },
        },
      });
      purgedUploadSessions = purgeResult.count;

      logger.info('Daily maintenance cleanup successfully finished', {
        expiredLinksCount,
        purgedUploadSessions,
      });

      return { expiredLinksCount, purgedUploadSessions };
    } catch (err: any) {
      logger.error('Error executing daily maintenance cleanup', { error: err.message });
      throw err;
    }
  });

  // Schedule repeatable cron job: run every night at 2:00 AM
  await queue.add(
    'daily-cleanup',
    {},
    {
      repeat: { cron: '0 2 * * *' },
      jobId: 'daily-maintenance-event', // Prevents double registering
    },
  );

  logger.info('Cron engine successfully registered daily-cleanup (2:00 AM)');
  return queue;
};
