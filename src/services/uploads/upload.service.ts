import {
  initiateMultipartUpload,
  uploadToS3,
  getPresignedPutUrl,
  getPresignedPartUrl,
  getPresignedGetUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  buildS3Key,
  getS3Url,
} from '../../config/aws';
import { prisma } from '../../config/database';
import { getQueues, QueueNames } from '../../config/redis';
import { computeChecksum, generateSecureToken } from '../../utils/crypto';
import { sanitizeFilename, getExtension, getMimeTypeFromExtension } from '../../utils/fileHelper';
import { ApiError } from '../../utils/ApiError';
import { S3Prefix } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { ModelFormat, ModelStatus, UploadStatus } from '@prisma/client';
import type { InitiateUploadDto, CompleteUploadDto } from '../../validators/upload.validator';
import { env, multipartThresholdBytes } from '../../config/env';
import { socketService } from '../../sockets';

const PRESIGNED_EXPIRY = 3600; // 1 hour
const PART_SIZE = 10 * 1024 * 1024; // 10 MB per part

export class UploadService {
  async initiateUpload(dto: InitiateUploadDto, userId: string) {
    const safeFilename = sanitizeFilename(dto.fileName);
    const ext = getExtension(safeFilename);
    const mimeType = dto.mimeType || getMimeTypeFromExtension(ext);

    const sessionId = uuidv4();
    const s3Key = buildS3Key(S3Prefix.TEMP, userId, `${sessionId}.${ext}`);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const isMultipart = dto.fileSize > multipartThresholdBytes;
    const partCount = dto.parts ?? (isMultipart ? Math.ceil(dto.fileSize / PART_SIZE) : 1);

    let s3UploadId: string | undefined;
    let presignedUrl: string | undefined;
    let presignedParts: { partNumber: number; presignedUrl: string }[] | undefined;

    if (isMultipart && partCount > 1) {
      // S3 Multipart
      s3UploadId = await initiateMultipartUpload(s3Key, mimeType);
      presignedParts = await Promise.all(
        Array.from({ length: partCount }, (_, i) =>
          getPresignedPartUrl(s3Key, s3UploadId!, i + 1, PRESIGNED_EXPIRY).then((url) => ({
            partNumber: i + 1,
            presignedUrl: url,
          })),
        ),
      );
    } else {
      // Single presigned PUT
      presignedUrl = await getPresignedPutUrl(s3Key, mimeType, PRESIGNED_EXPIRY);
    }

    // Persist session
    await prisma.uploadSession.create({
      data: {
        id: sessionId,
        userId,
        s3Key,
        s3UploadId,
        fileName: safeFilename,
        mimeType,
        fileSize: BigInt(dto.fileSize),
        status: UploadStatus.UPLOADING,
        chunkCount: partCount,
        expiresAt,
      },
    });

    return {
      uploadSessionId: sessionId,
      s3Key,
      ...(s3UploadId ? { uploadId: s3UploadId } : {}),
      ...(presignedUrl ? { presignedUrl } : {}),
      ...(presignedParts ? { presignedParts } : {}),
      isMultipart,
      expiresAt,
    };
  }

  async completeUpload(dto: CompleteUploadDto, userId: string) {
    const session = await prisma.uploadSession.findUnique({ where: { id: dto.uploadSessionId } });
    if (!session) throw ApiError.notFound('Upload session not found');
    if (session.userId !== userId) throw ApiError.forbidden('Session does not belong to you');
    if (session.status !== UploadStatus.UPLOADING) {
      throw ApiError.badRequest(`Upload session is ${session.status}, not UPLOADING`);
    }

    let finalKey = session.s3Key;
    let publicUrl: string;

    if (session.s3UploadId && dto.parts?.length) {
      // Complete S3 multipart
      const parts = dto.parts.map((p) => ({ ETag: p.eTag, PartNumber: p.partNumber }));
      publicUrl = await completeMultipartUpload(session.s3Key, session.s3UploadId, parts);
    } else {
      publicUrl = getS3Url(session.s3Key);
    }

    // Determine format from extension
    const ext = getExtension(session.fileName).toUpperCase();
    const format = ext === '3DS' ? ModelFormat.THREE_DS : (ModelFormat[ext as keyof typeof ModelFormat] ?? ModelFormat.GLB);

    // Create Model record
    const modelName = dto.modelName ?? session.fileName.replace(/\.[^.]+$/, '');

    // Move from temp to models prefix
    const modelKey = buildS3Key(S3Prefix.MODELS, userId, `${session.id}.${getExtension(session.fileName)}`);

    const model = await prisma.model.create({
      data: {
        name: modelName,
        format,
        status: ModelStatus.PROCESSING,
        fileSize: session.fileSize,
        originalName: session.fileName,
        storagePath: modelKey,
        publicUrl,
        mimeType: session.mimeType,
        uploadedById: userId,
      },
    });

    // Update session
    await prisma.uploadSession.update({
      where: { id: session.id },
      data: { status: UploadStatus.PROCESSING, completedAt: new Date() },
    });

    // Enqueue processing job safely (does not fail upload if Redis is offline)
    try {
      const queues = getQueues();
      await queues[QueueNames.THUMBNAIL].add('generate-thumbnail', {
        modelId: model.id,
        s3Key: modelKey,
        format,
      });

      await queues[QueueNames.UPLOAD].add('process-model', {
        modelId: model.id,
        uploadSessionId: session.id,
        s3Key: modelKey,
        format,
        userId,
        ...(dto.projectId ? { projectId: dto.projectId } : {}),
        ...(dto.roomId ? { roomId: dto.roomId } : {}),
      });
    } catch (err: any) {
      // Redis offline or queue error log
    }

    const presignedGetUrl = await getPresignedGetUrl(modelKey, PRESIGNED_EXPIRY);

    return {
      ...model,
      modelUrl: publicUrl,
      presignedUrl: presignedGetUrl,
    };
  }

  async abortUpload(uploadSessionId: string, userId: string): Promise<void> {
    const session = await prisma.uploadSession.findUnique({ where: { id: uploadSessionId } });
    if (!session) throw ApiError.notFound('Upload session not found');
    if (session.userId !== userId) throw ApiError.forbidden('Session does not belong to you');

    if (session.s3UploadId) {
      await abortMultipartUpload(session.s3Key, session.s3UploadId);
    }

    await prisma.uploadSession.update({
      where: { id: uploadSessionId },
      data: { status: UploadStatus.ABORTED },
    });
  }

  async getSessionStatus(uploadSessionId: string, userId: string) {
    const session = await prisma.uploadSession.findUnique({
      where: { id: uploadSessionId },
      include: { user: { select: { id: true } } },
    });
    if (!session) throw ApiError.notFound('Upload session not found');
    if (session.userId !== userId) throw ApiError.forbidden('Access denied');
    return session;
  }

  async handleDirectUploadStream(
    sessionId: string,
    stream: NodeJS.ReadableStream,
    totalBytes: number,
    userId: string
  ): Promise<any> {
    const session = await prisma.uploadSession.findUnique({ where: { id: sessionId } });
    if (!session) throw ApiError.notFound('Upload session not found');
    if (session.userId !== userId) throw ApiError.forbidden('Upload session does not belong to you');

    let bytesReceived = 0;
    const startTime = Date.now();

    const emitProgress = (percentage: number, uploadedMb: number, totalMb: number, speed: number, remainingTime: number, bytesReceived: number, totalBytes: number, speedBytesPerSec: number) => {
      try {
        const io = socketService.getIO();
        io.to(`user:${userId}`).emit('upload-progress', {
          sessionId,
          percentage: Math.round(percentage * 100) / 100,
          uploadedBytes: bytesReceived,
          totalBytes,
          uploadedMB: Math.round(uploadedMb * 100) / 100,
          totalMB: Math.round(totalMb * 100) / 100,
          speedBytesPerSec: Math.round(speedBytesPerSec),
          speed: Math.round(speed * 100) / 100,
          estimatedRemainingTime: Math.round(remainingTime),
          remainingMs: Math.round(remainingTime * 1000),
        });
      } catch (err: any) {
        // Suppress if socket service isn't active
      }
    };

    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk) => {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(buf);
        bytesReceived += buf.length;
        const elapsedSeconds = (Date.now() - startTime) / 1000 || 0.001;
        const percentage = (bytesReceived / totalBytes) * 100;
        const uploadedMb = bytesReceived / (1024 * 1024);
        const totalMb = totalBytes / (1024 * 1024);
        
        const speedBytesPerSec = bytesReceived / elapsedSeconds;
        const speedMbPerSec = speedBytesPerSec / (1024 * 1024);
        
        const remainingBytes = totalBytes - bytesReceived;
        const remainingSeconds = remainingBytes / (speedBytesPerSec || 1);

        emitProgress(percentage, uploadedMb, totalMb, speedMbPerSec, remainingSeconds, bytesReceived, totalBytes, speedBytesPerSec);
      });

      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));
    });

    const fileBuffer = Buffer.concat(chunks);
    await uploadToS3(session.s3Key, fileBuffer, session.mimeType);

    // Complete the upload process
    return this.completeUpload({
      uploadSessionId: sessionId,
      modelName: session.fileName.replace(/\.[^.]+$/, ''),
    }, userId);
  }
}

export const uploadService = new UploadService();
