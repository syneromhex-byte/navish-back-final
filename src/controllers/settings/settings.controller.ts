import { Request, Response } from 'express';
import { settingsService } from '../../services/settings/settings.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class SettingsController {
  getUserSettings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const settings = await settingsService.getUserSettings(req.user.id);
    return ApiResponse.success(res, settings);
  });

  updateUserSettings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const settings = await settingsService.updateUserSettings(req.user.id, req.body);
    return ApiResponse.success(res, settings, 'Preferences updated successfully');
  });

  getSystemSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await settingsService.getSystemSettings();
    return ApiResponse.success(res, settings);
  });

  updateSystemSetting = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const result = await settingsService.updateSystemSetting(req.body.key, req.body.value, req.user.id);
    return ApiResponse.success(res, result, 'System setting updated');
  });
}

export const settingsController = new SettingsController();
