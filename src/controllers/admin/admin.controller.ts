import { Request, Response } from 'express';
import { adminService } from '../../services/admin/admin.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class AdminController {
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await adminService.getDashboardStats();
    return ApiResponse.success(res, stats);
  });

  getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const results = await adminService.getAuditLogs(req.query as any);
    return ApiResponse.success(res, results.logs, 'Audit trail exported', 200, results.meta as any);
  });
}

export const adminController = new AdminController();
