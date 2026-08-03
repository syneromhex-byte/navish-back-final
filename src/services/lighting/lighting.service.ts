import { lightingRepository } from '../../repositories/lighting.repository';
import { roomRepository } from '../../repositories/room.repository';
import { ApiError } from '../../utils/ApiError';
import type { UpsertLightingDto } from '../../validators/lighting.validator';
import { socketService } from '../../sockets';

export class LightingService {
  async upsertLighting(roomId: string, dto: UpsertLightingDto) {
    const room = await roomRepository.findById(roomId);
    if (!room) throw ApiError.notFound('Room not found');
    const lighting = await lightingRepository.upsert(roomId, dto);
    try {
      const io = socketService.getIO();
      io.emit('ENTITY_UPDATED', { id: lighting.id, entityType: 'lighting', data: lighting });
      io.emit('lighting:updated', lighting);
    } catch {}
    return lighting;
  }

  async getLightingByRoom(roomId: string) {
    return lightingRepository.findByRoom(roomId);
  }

  async getLightingById(id: string) {
    const lighting = await lightingRepository.findById(id);
    if (!lighting) throw ApiError.notFound('Lighting config not found');
    return lighting;
  }

  async updateLighting(id: string, dto: Partial<UpsertLightingDto>) {
    const existing = await lightingRepository.findById(id);
    if (!existing) throw ApiError.notFound('Lighting config not found');
    const lighting = await lightingRepository.update(id, dto);
    try {
      const io = socketService.getIO();
      io.emit('ENTITY_UPDATED', { id: lighting.id, entityType: 'lighting', data: lighting });
      io.emit('lighting:updated', lighting);
    } catch {}
    return lighting;
  }

  async deleteLighting(id: string): Promise<void> {
    const existing = await lightingRepository.findById(id);
    if (!existing) throw ApiError.notFound('Lighting config not found');
    await lightingRepository.delete(id);
    try {
      const io = socketService.getIO();
      io.emit('ENTITY_DELETED', { id, entityType: 'lighting' });
      io.emit('lighting:deleted', { id });
    } catch {}
  }

  async setActiveLighting(roomId: string, lightingId: string): Promise<void> {
    await lightingRepository.setActive(roomId, lightingId);
  }
}

export const lightingService = new LightingService();
