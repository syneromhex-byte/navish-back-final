import { Request, Response } from 'express';
import { portfolioService } from '../../services/portfolio/portfolio.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class PortfolioController {
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
    const items = await portfolioService.listPortfolioItems();
    return ApiResponse.success(res, items);
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
