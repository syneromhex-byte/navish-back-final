import { roomRepository } from '../../repositories/room.repository';
import { projectRepository } from '../../repositories/project.repository';
import { ApiError } from '../../utils/ApiError';
import type { CreateRoomDto, UpdateRoomDto, AssignModelToRoomDto } from '../../validators/room.validator';
import { UserRole } from '@prisma/client';
import { socketService } from '../../sockets';

export class RoomService {
  async createRoom(projectId: string, dto: CreateRoomDto, userId: string, userRole: UserRole) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw ApiError.notFound('Project not found');

    if (userRole !== UserRole.ADMIN && project.ownerId !== userId) {
      throw ApiError.forbidden('Only the project owner or admin can add rooms');
    }

    const room = await roomRepository.create(projectId, dto);
    try {
      const io = socketService.getIO();
      io.emit('ENTITY_CREATED', { id: room.id, entityType: 'room', data: room });
      io.emit('room:created', room);
    } catch {}
    return room;
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

    const updated = await roomRepository.update(id, dto);
    try {
      const io = socketService.getIO();
      io.emit('ENTITY_UPDATED', { id: updated.id, entityType: 'room', data: updated });
      io.emit('room:updated', updated);
    } catch {}
    return updated;
  }

  async deleteRoom(id: string, userId: string, userRole: UserRole): Promise<void> {
    const room = await roomRepository.findById(id);
    if (!room) throw ApiError.notFound('Room not found');

    const project = await projectRepository.findById(room.projectId);
    if (userRole !== UserRole.ADMIN && project?.ownerId !== userId) {
      throw ApiError.forbidden('Only the project owner can delete rooms');
    }

    await roomRepository.softDelete(id);

    try {
      const io = socketService.getIO();
      io.emit('ENTITY_DELETED', { id, entityType: 'room' });
      io.emit('room:deleted', { id });
    } catch {}
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

    try {
      const io = socketService.getIO();
      io.emit('ENTITY_CREATED', { id: `${roomId}_${dto.modelId}`, entityType: 'room_model', data: { roomId, modelId: dto.modelId } });
    } catch {}
  }

  async removeModel(roomId: string, modelId: string): Promise<void> {
    await roomRepository.removeModel(roomId, modelId);
    try {
      const io = socketService.getIO();
      io.emit('ENTITY_DELETED', { id: `${roomId}_${modelId}`, entityType: 'room_model' });
    } catch {}
  }
}

export const roomService = new RoomService();
