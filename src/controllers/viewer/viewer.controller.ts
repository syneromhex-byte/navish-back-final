import { Request, Response } from 'express';
import { viewerService } from '../../services/viewer/viewer.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class ViewerController {
  getSessionState = asyncHandler(async (req: Request, res: Response) => {
    const state = await viewerService.getSessionState(req.params.projectId, req.query.roomId as string);
    return ApiResponse.success(res, state);
  });

  saveSessionState = asyncHandler(async (req: Request, res: Response) => {
    await viewerService.saveSessionState(req.params.projectId, req.body.roomId, req.body);
    return ApiResponse.success(res, null, 'VR / Viewer state saved');
  });

  getLiveViewersCount = asyncHandler(async (req: Request, res: Response) => {
    const count = await viewerService.getLiveViewerCount(req.params.projectId);
    return ApiResponse.success(res, { count });
  });

  saveScreenshot = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const screenshot = await viewerService.saveScreenshotMetadata(
      req.params.projectId,
      req.body.roomId,
      req.body.storagePath,
      req.body.publicUrl,
      req.user.id,
    );
    return ApiResponse.created(res, screenshot, 'Viewpoint captured successfully');
  });
}

export const viewerController = new ViewerController();
