import { modelRepository } from '../../repositories/model.repository';
import { ApiError } from '../../utils/ApiError';
import { deleteFromS3, getPresignedGetUrl } from '../../config/aws';
import { UserRole } from '@prisma/client';
import { logger } from '../../config/logger';

export class ModelService {
  async getModelById(id: string) {
    const model = await modelRepository.findById(id);
    if (!model) throw ApiError.notFound('Model not found');

    let presignedUrl: string | null = null;
    if (model.storagePath) {
      try {
        presignedUrl = await getPresignedGetUrl(model.storagePath);
      } catch (err) {
        logger.error(`Failed to generate presigned GET URL for model ${id}`, { error: err });
      }
    }

    return {
      ...model,
      presignedUrl: presignedUrl || model.publicUrl,
    };
  }

  async getPresignedUrl(id: string, expiresIn = 3600) {
    const model = await modelRepository.findById(id);
    if (!model) throw ApiError.notFound('Model not found');
    if (!model.storagePath) throw ApiError.badRequest('Model does not have a valid storage path');

    const presignedUrl = await getPresignedGetUrl(model.storagePath, expiresIn);

    return {
      modelId: model.id,
      storagePath: model.storagePath,
      presignedUrl,
      expiresIn,
    };
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
    const result = await modelRepository.findMany(query);
    const enrichedData = await Promise.all(
      result.data.map(async (model) => {
        let presignedUrl: string | null = null;
        if ((model as any).storagePath) {
          try {
            presignedUrl = await getPresignedGetUrl((model as any).storagePath);
          } catch {
            presignedUrl = null;
          }
        }
        return {
          ...model,
          presignedUrl: presignedUrl || model.publicUrl,
        };
      })
    );
    return { ...result, data: enrichedData };
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

    if (model.storagePath) {
      try {
        await deleteFromS3(model.storagePath);
      } catch (err) {
        logger.error(`Failed to delete S3 object for model ${id}`, { error: err });
      }
    }
  }

  async getVersions(modelId: string) {
    const model = await modelRepository.findById(modelId);
    if (!model) throw ApiError.notFound('Model not found');
    return model.versions;
  }
}

export const modelService = new ModelService();
