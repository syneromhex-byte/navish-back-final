import { Request, Response } from 'express';
import { lightingService } from '../../services/lighting/lighting.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class LightingController {
  upsertLighting = asyncHandler(async (req: Request, res: Response) => {
    const lighting = await lightingService.upsertLighting(req.params.roomId, req.body);
    return ApiResponse.created(res, lighting, 'Lighting configuration saved');
  });

  getLightingByRoom = asyncHandler(async (req: Request, res: Response) => {
    const list = await lightingService.getLightingByRoom(req.params.roomId);
    return ApiResponse.success(res, list);
  });

  getLighting = asyncHandler(async (req: Request, res: Response) => {
    const lighting = await lightingService.getLightingById(req.params.id);
    return ApiResponse.success(res, lighting);
  });

  updateLighting = asyncHandler(async (req: Request, res: Response) => {
    const lighting = await lightingService.updateLighting(req.params.id, req.body);
    return ApiResponse.success(res, lighting, 'Lighting updated successfully');
  });

  deleteLighting = asyncHandler(async (req: Request, res: Response) => {
    await lightingService.deleteLighting(req.params.id);
    return ApiResponse.success(res, null, 'Lighting deleted successfully');
  });

  setActiveLighting = asyncHandler(async (req: Request, res: Response) => {
    await lightingService.setActiveLighting(req.params.roomId, req.params.id);
    return ApiResponse.success(res, null, 'Active lighting configuration modified');
  });
}

export const lightingController = new LightingController();
