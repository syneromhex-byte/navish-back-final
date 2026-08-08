import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { verifyAccessToken } from '../auth/jwt/jwt';
import { viewerSocket } from './viewer.socket';
import { notificationSocket } from './notification.socket';

export class SocketService {
  private io: SocketServer | null = null;

  init(server: HttpServer): SocketServer {
    this.io = new SocketServer(server, {
      cors: {
        origin: '*', // Will be overridden or styled by standard CORS in app
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Setup Redis sub/pub adapter for horizontal scalability
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();
    this.io.adapter(createAdapter(pubClient, subClient));

    // Socket auth middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      try {
        const payload = verifyAccessToken(token);
        socket.data.user = {
          id: payload.sub,
          role: payload.role,
          email: payload.email,
        };
        next();
      } catch (err) {
        return next(new Error('Authentication error: Token invalid'));
      }
    });

    this.io.on('connection', (socket) => {
      logger.debug(`Socket client connected [ID: ${socket.id}] [User: ${socket.data.user?.id}]`);

      if (socket.data.user?.id) {
        socket.join(`user:${socket.data.user.id}`);
      }

      // Initialize sub-socket handlers
      viewerSocket.handle(this.io!, socket);
      notificationSocket.handle(this.io!, socket);

      socket.on('disconnect', () => {
        logger.debug(`Socket client disconnected [ID: ${socket.id}]`);
      });
    });

    logger.info('Realtime Socket.IO service initialized with Redis Adapter');
    return this.io;
  }

  getIO(): SocketServer {
    if (!this.io) {
      throw new Error('Socket.IO is not initialized yet!');
    }
    return this.io;
  }
}

export const socketService = new SocketService();
