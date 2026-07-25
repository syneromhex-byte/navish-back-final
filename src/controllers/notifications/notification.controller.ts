import { Request, Response } from 'express';
import { notificationService } from '../../services/notifications/notification.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class NotificationController {
  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const list = await notificationService.getNotifications(
      req.user.id,
      req.query.unreadOnly === 'true',
    );
    return ApiResponse.success(res, list);
  });

  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    await notificationService.markAsRead(req.params.id, req.user.id);
    return ApiResponse.success(res, null, 'Notification marked as read');
  });

  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    await notificationService.markAllAsRead(req.user.id);
    return ApiResponse.success(res, null, 'All notifications marked as read');
  });

  deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    await notificationService.deleteNotification(req.params.id, req.user.id);
    return ApiResponse.success(res, null, 'Notification removed successfully');
  });
}

export const notificationController = new NotificationController();
