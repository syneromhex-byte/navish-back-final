import { Request, Response } from 'express';
import { analyticsService } from '../../services/analytics/analytics.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class AnalyticsController {
  logEvent = asyncHandler(async (req: Request, res: Response) => {
    await analyticsService.logEvent({
      ...req.body,
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return ApiResponse.created(res, null, 'Event logged');
  });

  getProjectAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const result = await analyticsService.getProjectAnalytics(
      req.params.projectId,
      req.query.start ? new Date(req.query.start as string) : undefined,
      req.query.end ? new Date(req.query.end as string) : undefined,
    );
    return ApiResponse.success(res, result);
  });

  exportReport = asyncHandler(async (req: Request, res: Response) => {
    const csvContent = await analyticsService.generateCSVReport(req.params.projectId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=project-${req.params.projectId}-analytics.csv`);
    return res.status(200).send(csvContent);
  });
}

export const analyticsController = new AnalyticsController();
