import { modelRepository } from '../../repositories/model.repository';
import { ApiError } from '../../utils/ApiError';
import { deleteFromS3 } from '../../config/aws';
import { UserRole } from '@prisma/client';

export class ModelService {
  async getModelById(id: string) {
    const model = await modelRepository.findById(id);
    if (!model) throw ApiError.notFound('Model not found');
    return model;
  }

  async listModels(query: {
    page: number;
    limit: number;
    search?: string;
    status?: any;
    format?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    return modelRepository.findMany(query);
  }

  async updateModel(id: string, data: Partial<{ name: string; description: string; tags: string[] }>, userId: string, userRole: UserRole) {
    const model = await modelRepository.findById(id);
    if (!model) throw ApiError.notFound('Model not found');

    if (userRole !== UserRole.ADMIN && model.uploadedById !== userId) {
      throw ApiError.forbidden('You can only modify your own models');
    }

    return modelRepository.updateMetadata(id, data as any);
  }

  async deleteModel(id: string, userId: string, userRole: UserRole): Promise<void> {
    const model = await modelRepository.findById(id);
    if (!model) throw ApiError.notFound('Model not found');

    if (userRole !== UserRole.ADMIN && model.uploadedById !== userId) {
      throw ApiError.forbidden('You can only delete your own models');
    }

    // Soft delete record
    await modelRepository.softDelete(id);

    // Optionally queue S3 cleanup
  }

  async getVersions(modelId: string) {
    const model = await modelRepository.findById(modelId);
    if (!model) throw ApiError.notFound('Model not found');
    return model.versions;
  }
}

export const modelService = new ModelService();
