import { materialRepository } from '../../repositories/material.repository';
import { modelRepository } from '../../repositories/model.repository';
import { ApiError } from '../../utils/ApiError';
import type { CreateMaterialDto, UpdateMaterialDto } from '../../validators/material.validator';
import { socketService } from '../../sockets';

export class MaterialService {
  async upsertMaterial(modelId: string, dto: CreateMaterialDto) {
    const model = await modelRepository.findById(modelId);
    if (!model) throw ApiError.notFound('Model not found');
    const mat = await materialRepository.upsert(modelId, dto);
    try {
      const io = socketService.getIO();
      io.emit('ENTITY_UPDATED', { id: mat.id, entityType: 'material', data: mat });
      io.emit('material:updated', mat);
    } catch {}
    return mat;
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
    const mat = await materialRepository.update(id, dto);
    try {
      const io = socketService.getIO();
      io.emit('ENTITY_UPDATED', { id: mat.id, entityType: 'material', data: mat });
      io.emit('material:updated', mat);
    } catch {}
    return mat;
  }

  async deleteMaterial(id: string): Promise<void> {
    const existing = await materialRepository.findById(id);
    if (!existing) throw ApiError.notFound('Material not found');
    await materialRepository.delete(id);

    try {
      const io = socketService.getIO();
      io.emit('ENTITY_DELETED', { id, entityType: 'material' });
      io.emit('material:deleted', { id });
    } catch {}
  }

  async bulkUpdateMaterials(modelId: string, materials: CreateMaterialDto[]) {
    const model = await modelRepository.findById(modelId);
    if (!model) throw ApiError.notFound('Model not found');

    // Upsert each material individually to preserve objectId uniqueness
    const updatedMats = await Promise.all(materials.map((mat) => materialRepository.upsert(modelId, mat)));
    try {
      const io = socketService.getIO();
      io.emit('ENTITY_UPDATED', { id: modelId, entityType: 'material_bulk', data: updatedMats });
    } catch {}
    return updatedMats;
  }
}

export const materialService = new MaterialService();
