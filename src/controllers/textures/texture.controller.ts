import { Request, Response } from 'express';
import { textureService } from '../../services/textures/texture.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class TextureController {
  uploadTexture = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file || !req.user) return res.sendStatus(400);
    const texture = await textureService.uploadTexture(req.file, req.user.id);
    return ApiResponse.created(res, texture, 'Texture uploaded successfully');
  });

  getTexture = asyncHandler(async (req: Request, res: Response) => {
    const texture = await textureService.getTextureById(req.params.id);
    return ApiResponse.success(res, texture);
  });

  listTextures = asyncHandler(async (req: Request, res: Response) => {
    const result = await textureService.listTextures(req.query as any);
    return ApiResponse.paginated(res, result.data, result.meta);
  });

  deleteTexture = asyncHandler(async (req: Request, res: Response) => {
    await textureService.deleteTexture(req.params.id);
    return ApiResponse.success(res, null, 'Texture deleted successfully');
  });

  getSignedUrl = asyncHandler(async (req: Request, res: Response) => {
    const url = await textureService.getSignedUrl(req.params.id);
    return ApiResponse.success(res, { url });
  });
}

export const textureController = new TextureController();
