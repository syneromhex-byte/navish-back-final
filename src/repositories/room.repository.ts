import { prisma } from '../config/database';
import { buildPaginationMeta, buildPrismaSkipTake } from '../utils/pagination';

export class RoomRepository {
  async create(projectId: string, data: { name: string; description?: string; sortOrder?: number; dimensions?: object }) {
    return prisma.room.create({
      data: { projectId, ...data } as any,
      include: { _count: { select: { models: true } } },
    });
  }

  async findById(id: string) {
    return prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: {
        models: {
          include: {
            model: {
              select: { id: true, name: true, format: true, status: true, thumbnailUrl: true },
            },
          },
        },
        lighting: { take: 1, where: { isActive: true } },
        environments: { take: 1, where: { isDefault: true } },
      },
    });
  }

  async findByProject(projectId: string) {
    return prisma.room.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { models: true } },
        lighting: { take: 1, where: { isActive: true } },
      },
    });
  }

  async update(id: string, data: Partial<{ name: string; description: string | null; sortOrder: number; dimensions: object | null }>) {
    return prisma.room.update({
      where: { id },
      data: data as any,
    });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.room.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async assignModel(roomId: string, modelId: string, data: { position?: object; rotation?: object; scale?: object; sortOrder?: number }) {
    return prisma.roomModel.upsert({
      where: { roomId_modelId: { roomId, modelId } },
      create: { roomId, modelId, ...data } as any,
      update: data as any,
    });
  }

  async removeModel(roomId: string, modelId: string): Promise<void> {
    await prisma.roomModel.delete({ where: { roomId_modelId: { roomId, modelId } } });
  }
}

export const roomRepository = new RoomRepository();
