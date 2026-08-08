import { createQueue, QueueNames } from '../config/redis';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ModelStatus, UploadStatus } from '@prisma/client';

export const initUploadWorker = () => {
  const queue = createQueue(QueueNames.UPLOAD);

  queue.process('process-model', async (job) => {
    const { modelId, uploadSessionId, s3Key, format, userId, projectId, roomId } = job.data;
    logger.info(`Starting high-perf metadata extraction for Model ${modelId}`);

    try {
      // 1. Simulate GLTF/OBJ parsing and optimizations (e.g. Draco compression, polygon count check)
      await new Promise((resolve) => setTimeout(resolve, 4000));

      const model = await prisma.model.findUnique({ where: { id: modelId } });
      const origSize = model?.fileSize || BigInt(5000000);
      const isCompressible = ['GLB', 'GLTF', 'FBX', 'OBJ'].includes(format || 'GLB');
      const compressionRatio = isCompressible ? 0.45 : 0.0;
      const optimizedSize = BigInt(Math.floor(Number(origSize) * (1 - compressionRatio)));
      const storageSaved = origSize - optimizedSize;
      const processingTime = 4200;

      const mockMetadata = {
        polyCount: Math.floor(Math.random() * 50000) + 5000,
        vertexCount: Math.floor(Math.random() * 90000) + 8000,
        textureCount: Math.floor(Math.random() * 5),
        hasDraco: format === 'GLB' || format === 'GLTF',
        hasKtx2: false,
        dimensions: { width: 1.8, height: 2.1, depth: 0.9 },
        boundingBox: {
          min: { x: -0.9, y: 0, z: -0.45 },
          max: { x: 0.9, y: 2.1, z: 0.45 },
        },
      };

      // 2. Transact: update model to READY and upload session to COMPLETED
      await prisma.$transaction([
        prisma.model.update({
          where: { id: modelId },
          data: {
            status: ModelStatus.READY,
            processedAt: new Date(),
            originalSize: origSize,
            optimizedSize,
            compressionRatio,
            storageSaved,
            processingTime,
            ...mockMetadata,
          },
        }),
        prisma.uploadSession.update({
          where: { id: uploadSessionId },
          data: {
            status: UploadStatus.COMPLETED,
          },
        }),
      ]);

      // 3. Auto-placement context (if roomId/projectId passed)
      if (roomId) {
        await prisma.roomModel.create({
          data: {
            roomId,
            modelId,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
        });
        logger.info(`Automatically placed model ${modelId} inside Room ${roomId}`);
      }

      if (projectId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (project) {
          const prevMeta = (project.metadata as Record<string, any>) || {};
          await prisma.project.update({
            where: { id: projectId },
            data: {
              metadata: {
                ...prevMeta,
                modelId,
                model_id: modelId,
                fileUrl: model?.publicUrl || prevMeta.fileUrl || prevMeta.modelUrl,
                modelUrl: model?.publicUrl || prevMeta.modelUrl || prevMeta.fileUrl,
              },
            },
          });
        }
      }

      logger.info(`Successfully completed processing for Model ${modelId}`);
      return { success: true };
    } catch (err: any) {
      logger.error(`Model processing failed for Model ${modelId}`, { error: err.message });
      await prisma.$transaction([
        prisma.model.update({
          where: { id: modelId },
          data: {
            status: ModelStatus.ERROR,
            errorMessage: err.message,
          },
        }),
        prisma.uploadSession.update({
          where: { id: uploadSessionId },
          data: {
            status: UploadStatus.FAILED,
          },
        }),
      ]);
      throw err;
    }
  });

  return queue;
};
