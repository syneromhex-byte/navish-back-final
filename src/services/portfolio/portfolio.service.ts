import { PrismaClient, PortfolioItem } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';
import { socketService } from '../../sockets';

const prisma = new PrismaClient();

export class PortfolioService {
  async createPortfolioItem(data: any, userId: string): Promise<PortfolioItem> {
    const title = data.title || data.name || 'Untitled Project';
    const modelUrl = data.modelUrl || data.fileUrl || data.model_url || null;
    const thumbnailUrl = data.thumbnailUrl || data.coverImageUrl || data.thumbnail_url || null;
    const isPublic = data.isPublic !== undefined ? Boolean(data.isPublic) : true;
    const category = data.category || 'Residential';

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
        format: data.format || null,
        isPublic,
        createdById: userId,
      },
    });

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

  async listPortfolioItems(userRole?: string): Promise<PortfolioItem[]> {
    const isAdminOrArchitect = userRole === 'ADMIN' || userRole === 'ARCHITECT';
    return await prisma.portfolioItem.findMany({
      where: isAdminOrArchitect ? {} : { isPublic: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePortfolioItem(id: string, data: any, userId: string, role: string): Promise<PortfolioItem> {
    const item = await this.getPortfolioItemById(id);
    if (item.createdById !== userId && role !== 'ADMIN') {
      throw ApiError.forbidden('You do not have permission to update this item');
    }
    return await prisma.portfolioItem.update({
      where: { id },
      data,
    });
  }

  async deletePortfolioItem(id: string, userId: string, role: string): Promise<void> {
    const item = await this.getPortfolioItemById(id);
    if (item.createdById !== userId && role !== 'ADMIN') {
      throw ApiError.forbidden('You do not have permission to delete this item');
    }
    await prisma.portfolioItem.delete({
      where: { id },
    });

    try {
      const io = socketService.getIO();
      io.emit('portfolio:deleted', { id });
    } catch {
      // Suppress if socket service isn't active
    }
  }
}

export const portfolioService = new PortfolioService();
