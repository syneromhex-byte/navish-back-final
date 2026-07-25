import { Request, Response } from 'express';
import { userService } from '../../services/users/user.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { UserRole } from '@prisma/client';

export class UserController {
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.createUser(req.body);
    return ApiResponse.created(res, user, 'User created successfully');
  });

  getUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getUserById(req.params.id);
    return ApiResponse.success(res, user);
  });

  listUsers = asyncHandler(async (req: Request, res: Response) => {
    const result = await userService.listUsers(req.query as any);
    return ApiResponse.paginated(res, result.data, result.meta);
  });

  updateUser = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const user = await userService.updateUser(req.params.id, req.body, req.user.id, req.user.role);
    return ApiResponse.success(res, user, 'User updated successfully');
  });

  updateRole = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateRole(req.params.id, req.body.role);
    return ApiResponse.success(res, user, 'Role updated successfully');
  });

  uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file || !req.user) return res.sendStatus(400);
    const url = await userService.uploadAvatar(req.user.id, req.file);
    return ApiResponse.success(res, { avatarUrl: url }, 'Avatar uploaded successfully');
  });

  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    await userService.deleteUser(req.params.id);
    return ApiResponse.success(res, null, 'User deleted successfully');
  });

  suspendUser = asyncHandler(async (req: Request, res: Response) => {
    await userService.suspendUser(req.params.id);
    return ApiResponse.success(res, null, 'User suspended successfully');
  });

  activateUser = asyncHandler(async (req: Request, res: Response) => {
    await userService.activateUser(req.params.id);
    return ApiResponse.success(res, null, 'User activated successfully');
  });

  getActivityLogs = asyncHandler(async (req: Request, res: Response) => {
    const logs = await userService.getActivityLog(req.params.id);
    return ApiResponse.success(res, logs);
  });
}

export const userController = new UserController();
