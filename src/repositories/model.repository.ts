import { prisma } from '../config/database';
import { buildPaginationMeta, buildPrismaSkipTake } from '../utils/pagination';
import { Prisma, ModelStatus } from '@prisma/client';

export class ModelRepository {
  async findById(id: string) {
    return prisma.model.findFirst({
      where: { id, deletedAt: null },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 5 },
        materials: true,
        textures: { include: { texture: true } },
        _count: { select: { roomAssignments: true } },
      },
    });
  }

  async findMany(query: {
    page: number;
    limit: number;
    search?: string;
    status?: ModelStatus;
    format?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page, limit, search, status, format, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: Prisma.ModelWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(format ? { format: format as any } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { authorName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await prisma.$transaction([
      prisma.model.count({ where }),
      prisma.model.findMany({
        where,
        ...buildPrismaSkipTake(page, limit),
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true, name: true, format: true, status: true, fileSize: true,
          storagePath: true, thumbnailUrl: true, createdAt: true, updatedAt: true,
          _count: { select: { roomAssignments: true } },
        },
      }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async updateStatus(id: string, status: ModelStatus, error?: string) {
    return prisma.model.update({
      where: { id },
      data: {
        status,
        ...(status === ModelStatus.READY ? { processedAt: new Date() } : {}),
        ...(error ? { errorMessage: error } : {}),
      },
    });
  }

  async updateThumbnail(id: string, thumbnailUrl: string) {
    return prisma.model.update({ where: { id }, data: { thumbnailUrl } });
  }

  async updateMetadata(id: string, metadata: {
    boundingBox?: object;
    dimensions?: object;
    polyCount?: number;
    vertexCount?: number;
    textureCount?: number;
    hasDraco?: boolean;
    hasKtx2?: boolean;
  }) {
    return prisma.model.update({ where: { id }, data: metadata });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.model.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async createVersion(modelId: string, version: number, storagePath: string, fileSize: bigint, createdBy: string, checksum?: string) {
    return prisma.modelVersion.create({
      data: { modelId, version, storagePath, fileSize, checksum, createdBy },
    });
  }

  async getNextVersion(modelId: string): Promise<number> {
    const latest = await prisma.modelVersion.findFirst({
      where: { modelId },
      orderBy: { version: 'desc' },
    });
    return (latest?.version ?? 0) + 1;
  }
}

export const modelRepository = new ModelRepository();
