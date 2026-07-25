import Redis, { RedisOptions } from 'ioredis';
import Bull from 'bull';
import { env } from './env';
import { logger } from './logger';

// ── Redis connection options ───────────────────────────────────────────────────
const redisOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  db: env.REDIS_DB,
  ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
  ...(env.REDIS_TLS ? { tls: {} } : {}),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 10) {
      logger.error('Redis: max retries reached, giving up');
      return null;
    }
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
    return targetErrors.some((e) => err.message.includes(e));
  },
};

// ── Singleton Redis client ────────────────────────────────────────────────────
export const redis = new Redis(redisOptions);

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('ready', () => logger.info('Redis ready'));
redis.on('error', (err) => logger.error('Redis error', { error: err.message }));
redis.on('close', () => logger.warn('Redis connection closed'));
redis.on('reconnecting', () => logger.info('Redis reconnecting...'));

// ── Queue names ───────────────────────────────────────────────────────────────
export const QueueNames = {
  UPLOAD: 'upload-processing',
  THUMBNAIL: 'thumbnail-generation',
  ANALYTICS: 'analytics-processing',
  EMAIL: 'email-queue',
  CLEANUP: 'file-cleanup',
  COMPRESSION: 'model-compression',
} as const;

// ── Bull queue factory ────────────────────────────────────────────────────────
export const createQueue = (name: string): Bull.Queue => {
  const queue = new Bull(name, {
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
      db: env.REDIS_DB,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });

  queue.on('error', (error) => logger.error(`Queue [${name}] error`, { error: error.message }));
  queue.on('failed', (job, err) =>
    logger.error(`Queue [${name}] job failed`, { jobId: job.id, error: err.message }),
  );

  return queue;
};

// ── Named queues (lazy-init singletons) ───────────────────────────────────────
let _queues: Record<string, Bull.Queue> | null = null;

export const getQueues = () => {
  if (!_queues) {
    _queues = {
      [QueueNames.UPLOAD]: createQueue(QueueNames.UPLOAD),
      [QueueNames.THUMBNAIL]: createQueue(QueueNames.THUMBNAIL),
      [QueueNames.ANALYTICS]: createQueue(QueueNames.ANALYTICS),
      [QueueNames.EMAIL]: createQueue(QueueNames.EMAIL),
      [QueueNames.CLEANUP]: createQueue(QueueNames.CLEANUP),
      [QueueNames.COMPRESSION]: createQueue(QueueNames.COMPRESSION),
    };
  }
  return _queues;
};
