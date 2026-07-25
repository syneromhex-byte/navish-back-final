import { Request, Response } from 'express';
import { shareService } from '../../services/share/share.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class ShareController {
  createShareLink = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const result = await shareService.createShareLink(req.body, req.user.id);
    return ApiResponse.created(res, result, 'Secure share link generated successfully');
  });

  accessShareLink = asyncHandler(async (req: Request, res: Response) => {
    const result = await shareService.accessShareLink(req.body, req.ip);
    return ApiResponse.success(res, result, 'Link accessed successfully. Short-term JWT generated.');
  });

  getShareLinksByProject = asyncHandler(async (req: Request, res: Response) => {
    const links = await shareService.getShareLinksByProject(req.params.projectId);
    return ApiResponse.success(res, links);
  });

  getShareLink = asyncHandler(async (req: Request, res: Response) => {
    const link = await shareService.getShareLinkById(req.params.id);
    return ApiResponse.success(res, link);
  });

  updateShareLink = asyncHandler(async (req: Request, res: Response) => {
    const link = await shareService.updateShareLink(req.params.id, req.body);
    return ApiResponse.success(res, link, 'Share settings refreshed');
  });

  revokeShareLink = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    await shareService.revokeShareLink(req.params.id, req.user.id);
    return ApiResponse.success(res, null, 'Share link revoked successfully');
  });
}

export const shareController = new ShareController();
