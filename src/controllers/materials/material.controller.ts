import { Request, Response } from 'express';
import { materialService } from '../../services/materials/material.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class MaterialController {
  upsertMaterial = asyncHandler(async (req: Request, res: Response) => {
    const material = await materialService.upsertMaterial(req.params.modelId, req.body);
    return ApiResponse.created(res, material, 'Material saved successfully');
  });

  getMaterialsByModel = asyncHandler(async (req: Request, res: Response) => {
    const mats = await materialService.getMaterialsByModel(req.params.modelId);
    return ApiResponse.success(res, mats);
  });

  getMaterial = asyncHandler(async (req: Request, res: Response) => {
    const mat = await materialService.getMaterialById(req.params.id);
    return ApiResponse.success(res, mat);
  });

  updateMaterial = asyncHandler(async (req: Request, res: Response) => {
    const mat = await materialService.updateMaterial(req.params.id, req.body);
    return ApiResponse.success(res, mat, 'Material updated successfully');
  });

  deleteMaterial = asyncHandler(async (req: Request, res: Response) => {
    await materialService.deleteMaterial(req.params.id);
    return ApiResponse.deleted(res, req.params.id, 'material', 'Material deleted successfully');
  });

  bulkUpdateMaterials = asyncHandler(async (req: Request, res: Response) => {
    const mats = await materialService.bulkUpdateMaterials(req.params.modelId, req.body);
    return ApiResponse.success(res, mats, 'Materials updated in bulk successfully');
  });
}

export const materialController = new MaterialController();
