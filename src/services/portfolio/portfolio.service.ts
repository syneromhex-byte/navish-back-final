import { PrismaClient, PortfolioItem, ModelFormat, ModelStatus } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import { socketService } from '../../sockets';
import { uploadToS3, buildS3Key } from '../../config/aws';
import { S3Prefix } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const prisma = new PrismaClient();

function parseBoolean(val: any, defaultValue = true): boolean {
  if (val === undefined || val === null) return defaultValue;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    if (lower === 'false' || lower === '0' || lower === 'off') return false;
    if (lower === 'true' || lower === '1' || lower === 'on') return true;
  }
  return Boolean(val);
}

export class PortfolioService {
  async uploadPortfolioFile(file: Express.Multer.File, userId: string, meta: any = {}): Promise<PortfolioItem> {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    // Save to storage path /uploads/portfolio/ (S3Prefix.PORTFOLIO = 'portfolio')
    const key = buildS3Key(S3Prefix.PORTFOLIO, filename);
    const fileUrl = await uploadToS3(key, file.buffer, file.mimetype);

    const isImage = file.mimetype.startsWith('image/') && !file.originalname.endsWith('.hdr');
    const title = meta.title || meta.name || file.originalname.replace(/\.[^.]+$/, '');
    const category = meta.category || 'Residential';
    const isPublic = parseBoolean(meta.isPublic, true);

    const modelUrl = isImage ? (meta.modelUrl || null) : fileUrl;
    const thumbnailUrl = isImage ? fileUrl : (meta.thumbnailUrl || null);
    const formatStr = ext.replace('.', '').toUpperCase();

    const item = await prisma.portfolioItem.create({
      data: {
        title,
        category,
        description: meta.description || null,
        modelUrl,
        thumbnailUrl,
        sizeBytes: BigInt(file.size),
        format: formatStr,
        isPublic,
        createdById: userId,
      },
    });

    // Also sync to Model table so 3D model list and viewer find it
    if (!isImage || modelUrl) {
      const formatEnum = formatStr === '3DS' ? ModelFormat.THREE_DS : (ModelFormat[formatStr as keyof typeof ModelFormat] ?? ModelFormat.GLB);
      await prisma.model.create({
        data: {
          id: item.id,
          name: title,
          description: meta.description || null,
          format: formatEnum,
          status: ModelStatus.READY,
          fileSize: BigInt(file.size),
          originalName: file.originalname,
          storagePath: key,
          publicUrl: modelUrl || fileUrl,
          thumbnailUrl,
          isPortfolio: true,
          isPublic,
          uploadedById: userId,
        },
      }).catch(() => {});
    }

    try {
      const io = socketService.getIO();
      io.emit('portfolio:created', item);
    } catch {
      // Suppress if socket service isn't active
    }

    return item;
  }

  async createPortfolioItem(data: any, userId: string): Promise<PortfolioItem> {
    const title = data.title || data.name || 'Untitled Project';
    const modelUrl = data.modelUrl || data.fileUrl || data.model_url || null;
    const thumbnailUrl = data.thumbnailUrl || data.coverImageUrl || data.thumbnail_url || null;
    const isPublic = parseBoolean(data.isPublic, true);
    const category = data.category || 'Residential';
    const formatStr = data.format ? data.format.replace('.', '').toUpperCase() : (modelUrl ? path.extname(modelUrl).replace('.', '').toUpperCase() : null);

    // If projectId is supplied, update that project's isPublic flag to true as well
    if (data.projectId) {
      await prisma.project.update({
        where: { id: data.projectId },
        data: { isPublic: true, status: 'PUBLISHED' },
      }).catch(() => {});
    }

    const item = await prisma.portfolioItem.create({
      data: {
        title,
        category,
        description: data.description || null,
        modelUrl,
        thumbnailUrl,
        sizeBytes: data.sizeBytes ? BigInt(data.sizeBytes) : null,
        format: formatStr,
        isPublic,
        createdById: userId,
      },
    });

    if (modelUrl) {
      const formatEnum = formatStr === '3DS' ? ModelFormat.THREE_DS : (ModelFormat[(formatStr || 'GLB') as keyof typeof ModelFormat] ?? ModelFormat.GLB);
      await prisma.model.create({
        data: {
          id: item.id,
          name: title,
          description: data.description || null,
          format: formatEnum,
          status: ModelStatus.READY,
          fileSize: data.sizeBytes ? BigInt(data.sizeBytes) : BigInt(0),
          originalName: `${title}.${(formatStr || 'glb').toLowerCase()}`,
          storagePath: modelUrl,
          publicUrl: modelUrl,
          thumbnailUrl,
          isPortfolio: true,
          isPublic,
          uploadedById: userId,
        },
      }).catch(() => {});
    }

    try {
      const io = socketService.getIO();
      io.emit('portfolio:created', item);
    } catch {
      // Suppress if socket service isn't active
    }

    return item;
  }

  async getPortfolioItemById(id: string): Promise<PortfolioItem> {
    const item = await prisma.portfolioItem.findUnique({
      where: { id },
    });
    if (!item) throw ApiError.notFound('Portfolio item not found');
    return item;
  }

  async listPortfolioItems(query?: { category?: string; search?: string }, userRole?: string): Promise<PortfolioItem[]> {
    const isAdminOrArchitect = userRole === 'ADMIN' || userRole === 'ARCHITECT';
    const category = query?.category;
    const search = query?.search;

    const where: any = {
      ...(isAdminOrArchitect ? {} : { NOT: { isPublic: false } }),
    };

    // ONLY filter by category if it's provided AND NOT 'all'
    if (category && category.trim() !== '' && category.trim().toLowerCase() !== 'all') {
      where.category = {
        equals: category.trim(),
        mode: 'insensitive',
      };
    }

    if (search && search.trim() !== '') {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const items = await prisma.portfolioItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Also fetch models from Model table where isPortfolio is true
    const portfolioModelWhere: any = {
      isPortfolio: true,
      deletedAt: null,
      ...(isAdminOrArchitect ? {} : { NOT: { isPublic: false } }),
    };

    if (search && search.trim() !== '') {
      portfolioModelWhere.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const portfolioModels = await prisma.model.findMany({
      where: portfolioModelWhere,
      orderBy: { createdAt: 'desc' },
    });

    const existingIds = new Set(items.map((i) => i.id));
    for (const m of portfolioModels) {
      if (!existingIds.has(m.id)) {
        items.push({
          id: m.id,
          title: m.name,
          category: category || 'Residential',
          description: m.description || null,
          modelUrl: m.publicUrl || m.storagePath,
          thumbnailUrl: m.thumbnailUrl || null,
          sizeBytes: m.fileSize,
          format: m.format,
          isPublic: m.isPublic,
          createdById: m.uploadedById,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        });
      }
    }

    return items;
  }

  async updatePortfolioItem(id: string, data: any, userId: string, role: string): Promise<PortfolioItem> {
    const item = await this.getPortfolioItemById(id);
    if (item.createdById !== userId && role !== 'ADMIN') {
      throw ApiError.forbidden('You do not have permission to update this item');
    }

    const updatedData = { ...data };
    if (updatedData.isPublic !== undefined) {
      updatedData.isPublic = parseBoolean(updatedData.isPublic, true);
    }

    const updated = await prisma.portfolioItem.update({
      where: { id },
      data: updatedData,
    });

    await prisma.model.update({
      where: { id },
      data: {
        ...(data.title || data.name ? { name: data.title || data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.isPublic !== undefined ? { isPublic: parseBoolean(data.isPublic, true) } : {}),
      },
    }).catch(() => {});

    return updated;
  }

  async deletePortfolioItem(id: string, userId: string, role: string): Promise<void> {
    const item = await this.getPortfolioItemById(id);
    if (item.createdById !== userId && role !== 'ADMIN') {
      throw ApiError.forbidden('You do not have permission to delete this item');
    }
    await prisma.portfolioItem.delete({
      where: { id },
    });

    await prisma.model.delete({
      where: { id },
    }).catch(() => {});

    try {
      const io = socketService.getIO();
      io.emit('portfolio:deleted', { id });
    } catch {
      // Suppress if socket service isn't active
    }
  }
}

export const portfolioService = new PortfolioService();
