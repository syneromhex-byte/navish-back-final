import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { env } from './env';

const { combine, timestamp, printf, colorize, errors, json, splat } = winston.format;

// ── Custom format for development ─────────────────────────────────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  splat(),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
  }),
);

// ── Production JSON format ─────────────────────────────────────────────────────
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  splat(),
  json(),
);

// ── Daily rotate transports ────────────────────────────────────────────────────
const createRotateTransport = (filename: string, level?: string) =>
  new DailyRotateFile({
    filename: path.join(env.LOG_DIR, `${filename}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true,
    ...(level ? { level } : {}),
  });

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'navish-arc' },
  transports: [
    // Console always
    new winston.transports.Console(),
    // All logs
    createRotateTransport('application'),
    // Errors only
    createRotateTransport('error', 'error'),
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
    createRotateTransport('exceptions'),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    createRotateTransport('rejections'),
  ],
});

// ── HTTP access logger (separate) ─────────────────────────────────────────────
export const httpLogger = winston.createLogger({
  level: 'http',
  format: combine(timestamp(), json()),
  transports: [
    createRotateTransport('access'),
    ...(env.NODE_ENV !== 'production' ? [new winston.transports.Console()] : []),
  ],
});

// ── Audit logger ──────────────────────────────────────────────────────────────
export const auditLogger = winston.createLogger({
  level: 'info',
  format: combine(timestamp(), json()),
  transports: [
    createRotateTransport('audit'),
  ],
});
