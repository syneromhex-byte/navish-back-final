import { Request, Response } from 'express';
import { portfolioService } from '../../services/portfolio/portfolio.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class PortfolioController {
  uploadPortfolioFile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const item = await portfolioService.uploadPortfolioFile(req.file, req.user.id, req.body);
    return ApiResponse.created(res, item, 'Portfolio file uploaded and item created successfully');
  });

  createPortfolioItem = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const item = await portfolioService.createPortfolioItem(req.body, req.user.id);
    return ApiResponse.created(res, item, 'Portfolio item created successfully');
  });

  getPortfolioItem = asyncHandler(async (req: Request, res: Response) => {
    const item = await portfolioService.getPortfolioItemById(req.params.id);
    return ApiResponse.success(res, item);
  });

  listPortfolioItems = asyncHandler(async (req: Request, res: Response) => {
    const userRole = req.user?.role;
    const items = await portfolioService.listPortfolioItems(req.query as any, userRole);
    return res.status(200).json({
      success: true,
      message: 'Portfolio items retrieved successfully',
      data: items,
      items,
      portfolio: items,
    });
  });

  updatePortfolioItem = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const item = await portfolioService.updatePortfolioItem(req.params.id, req.body, req.user.id, req.user.role);
    return ApiResponse.success(res, item, 'Portfolio item updated successfully');
  });

  deletePortfolioItem = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    await portfolioService.deletePortfolioItem(req.params.id, req.user.id, req.user.role);
    return ApiResponse.success(res, null, 'Portfolio item deleted successfully');
  });
}

export const portfolioController = new PortfolioController();
