import { Request, Response } from 'express';
import { environmentService } from '../../services/environment/environment.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class EnvironmentController {
  createEnvironment = asyncHandler(async (req: Request, res: Response) => {
    const env = await environmentService.createEnvironment(req.params.roomId, req.body);
    return ApiResponse.created(res, env, 'Environment created successfully');
  });

  uploadHdr = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) return res.sendStatus(400);
    const url = await environmentService.uploadHdr(req.params.id, req.file);
    return ApiResponse.success(res, { hdrUrl: url }, 'HDR/EXR environment map uploaded successfully');
  });

  getEnvironmentsByRoom = asyncHandler(async (req: Request, res: Response) => {
    const list = await environmentService.getEnvironmentsByRoom(req.params.roomId);
    return ApiResponse.success(res, list);
  });

  getEnvironment = asyncHandler(async (req: Request, res: Response) => {
    const env = await environmentService.getEnvironmentById(req.params.id);
    return ApiResponse.success(res, env);
  });

  updateEnvironment = asyncHandler(async (req: Request, res: Response) => {
    const env = await environmentService.updateEnvironment(req.params.id, req.body);
    return ApiResponse.success(res, env, 'Environment updated successfully');
  });

  setDefault = asyncHandler(async (req: Request, res: Response) => {
    await environmentService.setDefault(req.params.roomId, req.params.id);
    return ApiResponse.success(res, null, 'Active environment configuration modified');
  });

  deleteEnvironment = asyncHandler(async (req: Request, res: Response) => {
    await environmentService.deleteEnvironment(req.params.id);
    return ApiResponse.deleted(res, req.params.id, 'environment', 'Environment deleted successfully');
  });
}

export const environmentController = new EnvironmentController();
