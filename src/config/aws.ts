import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';
import { logger } from './logger';
import fs from 'fs';
import path from 'path';

// Determine if we should mock S3 using local filesystem
const isLocalMock =
  env.AWS_ACCESS_KEY_ID === 'minioadmin' ||
  env.AWS_ACCESS_KEY_ID === 'your-aws-access-key-id' ||
  !env.AWS_ACCESS_KEY_ID;

if (isLocalMock) {
  logger.info('⚡ AWS S3 Client: Offline local filesystem mock activated.');
}

// ── S3 Client ─────────────────────────────────────────────────────────────────
export const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  ...(env.AWS_S3_ENDPOINT
    ? {
        endpoint: env.AWS_S3_ENDPOINT,
        forcePathStyle: true, // Required for MinIO
      }
    : {}),
});

const BUCKET = env.AWS_S3_BUCKET;

// ── Upload a buffer ───────────────────────────────────────────────────────────
export const uploadToS3 = async (
  key: string,
  body: Buffer,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<string> => {
  if (isLocalMock) {
    const filePath = path.join(__dirname, '../../storage', key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await fs.promises.writeFile(filePath, body);
    return getS3Url(key);
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
    }),
  );
  return getS3Url(key);
};

// ── Generate presigned GET URL ────────────────────────────────────────────────
export const getPresignedGetUrl = async (key: string, expiresIn = 86400): Promise<string> => {
  if (isLocalMock) {
    return getS3Url(key);
  }
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
};

// ── Generate presigned PUT URL (direct browser upload) ───────────────────────
export const getPresignedPutUrl = async (
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> => {
  if (isLocalMock) {
    return `${env.APP_URL}/api/${env.API_VERSION}/uploads/local-put?key=${encodeURIComponent(key)}`;
  }
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn },
  );
};

// ── Delete an object ──────────────────────────────────────────────────────────
export const deleteFromS3 = async (key: string): Promise<void> => {
  if (isLocalMock) {
    const filePath = path.join(__dirname, '../../storage', key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
    return;
  }
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};

// ── Delete multiple objects ───────────────────────────────────────────────────
export const deleteManyFromS3 = async (keys: string[]): Promise<void> => {
  if (!keys.length) return;
  if (isLocalMock) {
    for (const key of keys) {
      await deleteFromS3(key);
    }
    return;
  }
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
};

// ── Check if object exists ────────────────────────────────────────────────────
export const objectExistsInS3 = async (key: string): Promise<boolean> => {
  if (isLocalMock) {
    const filePath = path.join(__dirname, '../../storage', key);
    return fs.existsSync(filePath);
  }
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
};

// ── Multipart upload helpers ──────────────────────────────────────────────────
export const initiateMultipartUpload = async (
  key: string,
  contentType: string,
): Promise<string> => {
  if (isLocalMock) {
    return `local-multipart-${Date.now()}`;
  }
  const res = await s3.send(
    new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
  );
  if (!res.UploadId) throw new Error('Failed to initiate multipart upload');
  return res.UploadId;
};

export const getPresignedPartUrl = async (
  key: string,
  uploadId: string,
  partNumber: number,
  expiresIn = 3600,
): Promise<string> => {
  if (isLocalMock) {
    return `${env.APP_URL}/api/${env.API_VERSION}/uploads/local-put?key=${encodeURIComponent(key)}&uploadId=${uploadId}&partNumber=${partNumber}`;
  }
  return getSignedUrl(
    s3,
    new UploadPartCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId, PartNumber: partNumber }),
    { expiresIn },
  );
};

export const completeMultipartUpload = async (
  key: string,
  uploadId: string,
  parts: { ETag: string; PartNumber: number }[],
): Promise<string> => {
  if (isLocalMock) {
    const filePath = path.join(__dirname, '../../storage', key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const partFiles = parts
      .map((p) => ({
        partNumber: p.PartNumber,
        path: path.join(__dirname, `../../storage/temp-parts-${uploadId}-${p.PartNumber}`),
      }))
      .sort((a, b) => a.partNumber - b.partNumber);

    const writeStream = fs.createWriteStream(filePath);
    for (const pf of partFiles) {
      if (fs.existsSync(pf.path)) {
        const buffer = await fs.promises.readFile(pf.path);
        writeStream.write(buffer);
        await fs.promises.unlink(pf.path);
      }
    }
    writeStream.end();
    return getS3Url(key);
  }

  await s3.send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }),
  );
  return getS3Url(key);
};

export const abortMultipartUpload = async (key: string, uploadId: string): Promise<void> => {
  if (isLocalMock) {
    // Clean up temporary parts
    const tempPrefix = `temp-parts-${uploadId}-`;
    const tempDir = path.join(__dirname, '../../storage');
    if (fs.existsSync(tempDir)) {
      const files = await fs.promises.readdir(tempDir);
      for (const file of files) {
        if (file.startsWith(tempPrefix)) {
          await fs.promises.unlink(path.join(tempDir, file));
        }
      }
    }
    logger.warn('Local multipart upload aborted', { key, uploadId });
    return;
  }
  await s3.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId }));
  logger.warn('Multipart upload aborted', { key, uploadId });
};

// ── List objects with prefix ──────────────────────────────────────────────────
export const listS3Objects = async (prefix: string): Promise<string[]> => {
  if (isLocalMock) {
    return [];
  }
  const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }));
  return (res.Contents ?? []).map((obj) => obj.Key ?? '').filter(Boolean);
};

// ── Build public URL ──────────────────────────────────────────────────────────
export const getS3Url = (key: string): string => {
  if (isLocalMock) {
    return `${env.APP_URL}/storage/${key}`;
  }
  if (env.AWS_S3_ENDPOINT) {
    // MinIO / custom endpoint
    return `${env.AWS_S3_ENDPOINT}/${BUCKET}/${key}`;
  }
  return `https://${BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
};

// ── Build S3 key ──────────────────────────────────────────────────────────────
export const buildS3Key = (...parts: string[]): string =>
  parts.join('/').replace(/\/+/g, '/');

export const getModelUrl = async (keyOrId: string, fileName?: string): Promise<string> => {
  const key = fileName ? buildS3Key('models', keyOrId, fileName) : keyOrId;
  return getPresignedGetUrl(key, 86400);
};

