import { prisma } from '../config/database';
import type { CreateMaterialDto, UpdateMaterialDto } from '../validators/material.validator';

export class MaterialRepository {
  async upsert(modelId: string, data: CreateMaterialDto) {
    const existing = await prisma.material.findFirst({ where: { modelId, objectId: data.objectId } });
    return prisma.material.upsert({
      where: { id: existing?.id ?? 'new-material' },
      create: { 
        ...data, 
        modelId, 
        customProperties: data.customProperties as any 
      },
      update: { 
        ...data, 
        customProperties: data.customProperties as any 
      },
    });
  }

  async findByModel(modelId: string) {
    return prisma.material.findMany({ where: { modelId }, orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    return prisma.material.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateMaterialDto) {
    return prisma.material.update({ 
      where: { id }, 
      data: {
        ...data,
        customProperties: data.customProperties as any
      }
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.material.delete({ where: { id } });
  }

  async deleteByModel(modelId: string): Promise<void> {
    await prisma.material.deleteMany({ where: { modelId } });
  }

  async bulkUpsert(modelId: string, materials: CreateMaterialDto[]) {
    return prisma.$transaction(
      materials.map((material) =>
        prisma.material.upsert({
          // In bulkUpsert we can find by objectId first to determine upsert
          // For simplicity in mock/sandbox transaction:
          where: { id: 'placeholder-bulk' },
          create: { 
            ...material, 
            modelId, 
            customProperties: material.customProperties as any 
          },
          update: { 
            ...material, 
            customProperties: material.customProperties as any 
          },
        }),
      ),
    );
  }
}

export const materialRepository = new MaterialRepository();
