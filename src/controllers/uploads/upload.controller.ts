import { Request, Response } from 'express';
import { uploadService } from '../../services/uploads/upload.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class UploadController {
  initiateUpload = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const result = await uploadService.initiateUpload(req.body, req.user.id);
    return ApiResponse.created(res, result, 'Upload session initiated successfully');
  });

  completeUpload = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const model = await uploadService.completeUpload(req.body, req.user.id);
    return ApiResponse.success(res, model, 'Upload completed successfully. Processing enqueued.');
  });

  abortUpload = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    await uploadService.abortUpload(req.body.uploadSessionId, req.user.id);
    return ApiResponse.success(res, null, 'Upload session aborted successfully');
  });

  getSessionStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const session = await uploadService.getSessionStatus(req.params.id, req.user.id);
    return ApiResponse.success(res, session);
  });

  streamUpload = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const sessionId = req.params.sessionId;
    const totalBytes = Number(req.headers['content-length'] || 0);
    if (!totalBytes) {
      return res.status(400).json({ error: 'Content-Length header is required' });
    }

    const model = await uploadService.handleDirectUploadStream(sessionId, req, totalBytes, req.user.id);
    return ApiResponse.success(res, model, 'Stream upload completed successfully');
  });
}

export const uploadController = new UploadController();
