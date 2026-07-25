import { prisma } from '../../config/database';
import { uploadToS3, buildS3Key, getPresignedGetUrl } from '../../config/aws';
import { sanitizeFilename, getExtension } from '../../utils/fileHelper';
import { computeChecksum } from '../../utils/crypto';
import { ApiError } from '../../utils/ApiError';
import { S3Prefix } from '../../types';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { buildPaginationMeta, buildPrismaSkipTake } from '../../utils/pagination';
import { Prisma } from '@prisma/client';

export class TextureService {
  async uploadTexture(file: Express.Multer.File, userId: string) {
    const safeName = sanitizeFilename(file.originalname);
    const ext = getExtension(safeName);
    const key = buildS3Key(S3Prefix.TEXTURES, userId, `${uuidv4()}.${ext}`);
    const checksum = computeChecksum(file.buffer);

    // Get image metadata if applicable
    let width: number | undefined, height: number | undefined, channels: number | undefined, hasAlpha = false;
    try {
      const meta = await sharp(file.buffer).metadata();
      width = meta.width;
      height = meta.height;
      channels = meta.channels;
      hasAlpha = meta.hasAlpha ?? false;
    } catch {
      // Not a standard image (KTX2, Basis, etc.) — skip
    }

    // Generate thumbnail for image textures
    let thumbnailUrl: string | undefined;
    try {
      const thumbBuffer = await sharp(file.buffer).resize(256, 256, { fit: 'cover' }).webp({ quality: 75 }).toBuffer();
      const thumbKey = buildS3Key(S3Prefix.THUMBNAILS, 'textures', `${uuidv4()}.webp`);
      thumbnailUrl = await uploadToS3(thumbKey, thumbBuffer, 'image/webp');
    } catch {
      // Binary textures — no thumbnail
    }

    // Upload to S3
    const publicUrl = await uploadToS3(key, file.buffer, file.mimetype);

    const texture = await prisma.texture.create({
      data: {
        name: safeName,
        fileSize: BigInt(file.size),
        originalName: file.originalname,
        storagePath: key,
        publicUrl,
        thumbnailUrl,
        mimeType: file.mimetype,
        width,
        height,
        channels,
        hasAlpha,
        checksum,
        uploadedById: userId,
      },
    });

    return texture;
  }

  async getTextureById(id: string) {
    const texture = await prisma.texture.findFirst({ where: { id, deletedAt: null } });
    if (!texture) throw ApiError.notFound('Texture not found');
    return texture;
  }

  async listTextures(query: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = query;

    const where: Prisma.TextureWhereInput = {
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [total, data] = await prisma.$transaction([
      prisma.texture.count({ where }),
      prisma.texture.findMany({
        where,
        ...buildPrismaSkipTake(page, limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async deleteTexture(id: string): Promise<void> {
    const texture = await prisma.texture.findUnique({ where: { id } });
    if (!texture) throw ApiError.notFound('Texture not found');
    await prisma.texture.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getSignedUrl(id: string): Promise<string> {
    const texture = await this.getTextureById(id);
    return getPresignedGetUrl(texture.storagePath);
  }
}

export const textureService = new TextureService();
