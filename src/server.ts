import http from 'http';
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { socketService } from './sockets';
import { startWorkers } from './workers';

const server = http.createServer(app);

const bootstrap = async () => {
  try {
    // 1. Verify Database singleton connection
    await prisma.$connect();
    logger.info('DB verified, connection successful');

    // 2. Verify Redis client connection
    await new Promise<void>((resolve, reject) => {
      if (redis.status === 'ready') resolve();
      else {
        redis.once('ready', () => resolve());
        redis.once('error', (err) => reject(err));
      }
    });
    logger.info('Redis verified, ready');

    // 3. Initialize Socket.IO with Redis adapter
    socketService.init(server);

    // 4. Start Bull Background queues workers
    await startWorkers();

    // 5. Start listening port
    server.listen(env.PORT, () => {
      logger.info(`
===================================================
🚀 NAVISH ARC Server is running on port ${env.PORT}
🌍 Environment: ${env.NODE_ENV}
📚 API Documentation: http://localhost:${env.PORT}/api-docs
===================================================
      `);
    });

  } catch (error: any) {
    logger.error('CRITICAL: Server boot failed', { error: error.message });
    process.exit(1);
  }
};

// Graceful shutdown handlers
const shutdown = async (signal: string) => {
  logger.warn(`Received ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Disconnect DB client
      await prisma.$disconnect();
      logger.info('Disconnected from Database');

      // Disconnect Redis
      await redis.quit();
      logger.info('Disconnected from Redis');

      logger.info('Custom cleanup tasks complete');
      process.exit(0);
    } catch (err: any) {
      logger.error('Error during shutdown cleanups', { error: err.message });
      process.exit(1);
    }
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Force shutting down after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap();
