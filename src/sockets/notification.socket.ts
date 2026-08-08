import { Server, Socket } from 'socket.io';
import { logger } from '../config/logger';

export class NotificationSocket {
  private io: Server | null = null;

  handle(io: Server, socket: Socket) {
    this.io = io;
    const userId = socket.data.user?.id;
    if (userId) {
      // Connect user to their personal user ID room for target notification routing
      socket.join(`user:${userId}`);
      logger.debug(`Realtime: User ${userId} joined notification channel`);
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  broadcast(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

export const notificationSocket = new NotificationSocket();
