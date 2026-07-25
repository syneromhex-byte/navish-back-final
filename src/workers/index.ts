import { logger } from '../config/logger';
import { initThumbnailWorker } from './thumbnail.worker';
import { initUploadWorker } from './upload.worker';
import { initEmailWorker } from './email.worker';
import { initAnalyticsWorker } from './analytics.worker';
import { initCronJobs } from './cron';

export const startWorkers = async () => {
  logger.info('Starting Bull background queue processors...');

  try {
    initThumbnailWorker();
    initUploadWorker();
    initEmailWorker();
    initAnalyticsWorker();
    await initCronJobs();

    logger.info('🚀 All background queue workers started successfully');
  } catch (error: any) {
    logger.error('Failed to initialize workers', { error: error.message });
  }
};
