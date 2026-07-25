import { Server, Socket } from 'socket.io';
import { viewerService } from '../services/viewer/viewer.service';
import { logger } from '../config/logger';

export class ViewerSocket {
  handle(io: Server, socket: Socket) {
    // ── JOIN ROOM ─────────────────────────────────────────────────────────────
    socket.on('viewer:room:join', async (data: { projectId: string; roomId: string }) => {
      const roomKey = `project:${data.projectId}:room:${data.roomId}`;
      socket.join(roomKey);

      // Increment live viewer presence
      const user = socket.data.user;
      const count = await viewerService.addLiveViewer(data.projectId, user.id);

      // Broadcast new visitor count to everyone in the room
      io.to(roomKey).emit('viewer:presence:update', { count });

      logger.debug(`Realtime: User ${user.id} joined VR/Room ${roomKey}`);
    });

    // ── LEAVE ROOM ────────────────────────────────────────────────────────────
    socket.on('viewer:room:leave', async (data: { projectId: string; roomId: string }) => {
      const roomKey = `project:${data.projectId}:room:${data.roomId}`;
      socket.leave(roomKey);

      const user = socket.data.user;
      const count = await viewerService.removeLiveViewer(data.projectId, user.id);

      io.to(roomKey).emit('viewer:presence:update', { count });

      logger.debug(`Realtime: User ${user.id} left VR/Room ${roomKey}`);
    });

    // ── CAMERA / VR COORDINATES PUSH ──────────────────────────────────────────
    socket.on('viewer:transform:sync', (data: {
      projectId: string;
      roomId: string;
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number; w?: number };
    }) => {
      const roomKey = `project:${data.projectId}:room:${data.roomId}`;
      // Broadcast coordinates to all other sessions in the room (excluding sender)
      socket.to(roomKey).emit('viewer:transform:synced', {
        userId: socket.data.user.id,
        position: data.position,
        rotation: data.rotation,
      });
    });

    // ── MATERIAL OVERRIDES SYNC ────────────────────────────────────────────────
    socket.on('viewer:material:select', (data: {
      projectId: string;
      roomId: string;
      materialId: string;
      objectId: string;
    }) => {
      const roomKey = `project:${data.projectId}:room:${data.roomId}`;
      socket.to(roomKey).emit('viewer:material:selected', {
        objectId: data.objectId,
        materialId: data.materialId,
      });
    });
  }
}

export const viewerSocket = new ViewerSocket();
