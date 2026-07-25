import { Request, Response } from 'express';
import { roomService } from '../../services/rooms/room.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class RoomController {
  createRoom = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const room = await roomService.createRoom(req.params.projectId, req.body, req.user.id, req.user.role);
    return ApiResponse.created(res, room, 'Room created successfully');
  });

  getRoom = asyncHandler(async (req: Request, res: Response) => {
    const room = await roomService.getRoomById(req.params.id);
    return ApiResponse.success(res, room);
  });

  getRoomsByProject = asyncHandler(async (req: Request, res: Response) => {
    const rooms = await roomService.getRoomsByProject(req.params.projectId);
    return ApiResponse.success(res, rooms);
  });

  updateRoom = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const room = await roomService.updateRoom(req.params.id, req.body, req.user.id, req.user.role);
    return ApiResponse.success(res, room, 'Room updated successfully');
  });

  deleteRoom = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    await roomService.deleteRoom(req.params.id, req.user.id, req.user.role);
    return ApiResponse.success(res, null, 'Room deleted successfully');
  });

  assignModel = asyncHandler(async (req: Request, res: Response) => {
    await roomService.assignModel(req.params.id, req.body);
    return ApiResponse.success(res, null, 'Model assigned to room successfully');
  });

  removeModel = asyncHandler(async (req: Request, res: Response) => {
    await roomService.removeModel(req.params.id, req.params.modelId);
    return ApiResponse.success(res, null, 'Model removed from room successfully');
  });
}

export const roomController = new RoomController();
