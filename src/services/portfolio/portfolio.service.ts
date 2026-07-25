import { PrismaClient, PortfolioItem } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';

const prisma = new PrismaClient();

export class PortfolioService {
  async createPortfolioItem(data: any, userId: string): Promise<PortfolioItem> {
    const item = await prisma.portfolioItem.create({
      data: {
        ...data,
        createdById: userId,
      },
    });
    return item;
  }

  async getPortfolioItemById(id: string): Promise<PortfolioItem> {
    const item = await prisma.portfolioItem.findUnique({
      where: { id },
    });
    if (!item) throw ApiError.notFound('Portfolio item not found');
    return item;
  }

  async listPortfolioItems(): Promise<PortfolioItem[]> {
    return await prisma.portfolioItem.findMany({
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
  }
}

export const portfolioService = new PortfolioService();
