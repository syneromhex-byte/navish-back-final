import { roomRepository } from '../../repositories/room.repository';
import { projectRepository } from '../../repositories/project.repository';
import { ApiError } from '../../utils/ApiError';
import type { CreateRoomDto, UpdateRoomDto, AssignModelToRoomDto } from '../../validators/room.validator';
import { UserRole } from '@prisma/client';

export class RoomService {
  async createRoom(projectId: string, dto: CreateRoomDto, userId: string, userRole: UserRole) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw ApiError.notFound('Project not found');

    if (userRole !== UserRole.ADMIN && project.ownerId !== userId) {
      throw ApiError.forbidden('Only the project owner or admin can add rooms');
    }

    return roomRepository.create(projectId, dto);
  }

  async getRoomById(id: string) {
    const room = await roomRepository.findById(id);
    if (!room) throw ApiError.notFound('Room not found');
    return room;
  }

  async getRoomsByProject(projectId: string) {
    return roomRepository.findByProject(projectId);
  }

  async updateRoom(id: string, dto: UpdateRoomDto, userId: string, userRole: UserRole) {
    const room = await roomRepository.findById(id);
    if (!room) throw ApiError.notFound('Room not found');

    const project = await projectRepository.findById(room.projectId);
    if (userRole !== UserRole.ADMIN && project?.ownerId !== userId) {
      throw ApiError.forbidden('Only the project owner can modify rooms');
    }

    return roomRepository.update(id, dto);
  }

  async deleteRoom(id: string, userId: string, userRole: UserRole): Promise<void> {
    const room = await roomRepository.findById(id);
    if (!room) throw ApiError.notFound('Room not found');

    const project = await projectRepository.findById(room.projectId);
    if (userRole !== UserRole.ADMIN && project?.ownerId !== userId) {
      throw ApiError.forbidden('Only the project owner can delete rooms');
    }

    await roomRepository.softDelete(id);
  }

  async assignModel(roomId: string, dto: AssignModelToRoomDto): Promise<void> {
    const room = await roomRepository.findById(roomId);
    if (!room) throw ApiError.notFound('Room not found');

    await roomRepository.assignModel(roomId, dto.modelId, {
      position: dto.position,
      rotation: dto.rotation,
      scale: dto.scale,
      sortOrder: dto.sortOrder,
    });
  }

  async removeModel(roomId: string, modelId: string): Promise<void> {
    await roomRepository.removeModel(roomId, modelId);
  }
}

export const roomService = new RoomService();
