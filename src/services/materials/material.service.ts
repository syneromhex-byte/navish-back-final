import { materialRepository } from '../../repositories/material.repository';
import { modelRepository } from '../../repositories/model.repository';
import { ApiError } from '../../utils/ApiError';
import type { CreateMaterialDto, UpdateMaterialDto } from '../../validators/material.validator';

export class MaterialService {
  async upsertMaterial(modelId: string, dto: CreateMaterialDto) {
    const model = await modelRepository.findById(modelId);
    if (!model) throw ApiError.notFound('Model not found');
    return materialRepository.upsert(modelId, dto);
  }

  async getMaterialsByModel(modelId: string) {
    return materialRepository.findByModel(modelId);
  }

  async getMaterialById(id: string) {
    const mat = await materialRepository.findById(id);
    if (!mat) throw ApiError.notFound('Material not found');
    return mat;
  }

  async updateMaterial(id: string, dto: UpdateMaterialDto) {
    const existing = await materialRepository.findById(id);
    if (!existing) throw ApiError.notFound('Material not found');
    return materialRepository.update(id, dto);
  }

  async deleteMaterial(id: string): Promise<void> {
    const existing = await materialRepository.findById(id);
    if (!existing) throw ApiError.notFound('Material not found');
    await materialRepository.delete(id);
  }

  async bulkUpdateMaterials(modelId: string, materials: CreateMaterialDto[]) {
    const model = await modelRepository.findById(modelId);
    if (!model) throw ApiError.notFound('Model not found');

    // Upsert each material individually to preserve objectId uniqueness
    return Promise.all(materials.map((mat) => materialRepository.upsert(modelId, mat)));
  }
}

export const materialService = new MaterialService();
