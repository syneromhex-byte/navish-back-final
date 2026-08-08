import { Request, Response } from 'express';
import { modelService } from '../../services/models/model.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class ModelController {
  getModel = asyncHandler(async (req: Request, res: Response) => {
    const model = await modelService.getModelById(req.params.id);
    return ApiResponse.success(res, model);
  });

  getPresignedUrl = asyncHandler(async (req: Request, res: Response) => {
    const expiresIn = req.query.expiresIn ? parseInt(req.query.expiresIn as string, 10) : 604800;
    const result = await modelService.getPresignedUrl(req.params.id, expiresIn);
    return ApiResponse.success(res, result, 'Presigned GET URL generated successfully');
  });

  listModels = asyncHandler(async (req: Request, res: Response) => {
    const result = await modelService.listModels(req.query as any, req.user?.id, req.user?.role);
    return ApiResponse.paginated(res, result.data, result.meta);
  });

  getClientModels = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const clientId = req.user.id;
    const result = await modelService.listModels(
      { ...(req.query as any), clientId, isPortfolio: false },
      req.user.id,
      req.user.role
    );
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
    return ApiResponse.deleted(res, req.params.id, 'model', 'Model deleted successfully');
  });

  getVersions = asyncHandler(async (req: Request, res: Response) => {
    const versions = await modelService.getVersions(req.params.id);
    return ApiResponse.success(res, versions);
  });
}

export const modelController = new ModelController();
