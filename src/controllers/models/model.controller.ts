import { Request, Response } from 'express';
import { modelService } from '../../services/models/model.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class ModelController {
  getModel = asyncHandler(async (req: Request, res: Response) => {
    const model = await modelService.getModelById(req.params.id);
    return ApiResponse.success(res, model);
  });

  listModels = asyncHandler(async (req: Request, res: Response) => {
    const result = await modelService.listModels(req.query as any);
    return ApiResponse.paginated(res, result.data, result.meta);
  });

  updateModel = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const model = await modelService.updateModel(req.params.id, req.body, req.user.id, req.user.role);
    return ApiResponse.success(res, model, 'Model updated successfully');
  });

  deleteModel = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    await modelService.deleteModel(req.params.id, req.user.id, req.user.role);
    return ApiResponse.success(res, null, 'Model deleted successfully');
  });

  getVersions = asyncHandler(async (req: Request, res: Response) => {
    const versions = await modelService.getVersions(req.params.id);
    return ApiResponse.success(res, versions);
  });
}

export const modelController = new ModelController();
