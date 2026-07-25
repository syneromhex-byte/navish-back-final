import { createQueue, QueueNames } from '../config/redis';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { uploadToS3, buildS3Key } from '../config/aws';
import { S3Prefix } from '../types';
import { ModelStatus } from '@prisma/client';

export const initThumbnailWorker = () => {
  const queue = createQueue(QueueNames.THUMBNAIL);

  queue.process('generate-thumbnail', async (job) => {
    const { modelId, s3Key, format } = job.data;
    logger.info(`Starting thumbnail generation for Model ${modelId}`);

    try {
      // 1. Mock rendering / processing delay
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 2. Generate a default fallback WebP preview (mock image buffer)
      // In production, headless chromium or a node-three-renderer would render the GLB
      // Here we upload a mock beautiful placeholder WebP (1x1 transparent for now, or valid image)
      const mockWebp = Buffer.from(
        'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
        'base64'
      );
      const thumbnailKey = buildS3Key(S3Prefix.THUMBNAILS, 'models', `${modelId}.webp`);
      const thumbnailUrl = await uploadToS3(thumbnailKey, mockWebp, 'image/webp');

      // 3. Update Model
      await prisma.model.update({
        where: { id: modelId },
        data: {
          thumbnailUrl,
        },
      });

      logger.info(`Successfully completed thumbnail generation for Model ${modelId}`);
      return { thumbnailUrl };
    } catch (err: any) {
      logger.error(`Thumbnail generation failed for Model ${modelId}`, { error: err.message });
      throw err;
    }
  });

  return queue;
};
