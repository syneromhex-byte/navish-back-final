import { prisma } from '../config/database';
import type { UpsertLightingDto } from '../validators/lighting.validator';

export class LightingRepository {
  async upsert(roomId: string, data: UpsertLightingDto) {
    const existing = await prisma.lighting.findFirst({ where: { roomId, isActive: true } });

    if (existing) {
      return prisma.lighting.update({ where: { id: existing.id }, data });
    }

    return prisma.lighting.create({ data: { roomId, ...data } });
  }

  async findByRoom(roomId: string) {
    return prisma.lighting.findMany({ where: { roomId }, orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    return prisma.lighting.findUnique({ where: { id }, include: { environment: true } });
  }

  async update(id: string, data: Partial<UpsertLightingDto>) {
    return prisma.lighting.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.lighting.delete({ where: { id } });
  }

  async setActive(roomId: string, lightingId: string): Promise<void> {
    await prisma.$transaction([
      prisma.lighting.updateMany({ where: { roomId }, data: { isActive: false } }),
      prisma.lighting.update({ where: { id: lightingId }, data: { isActive: true } }),
    ]);
  }
}

export const lightingRepository = new LightingRepository();
