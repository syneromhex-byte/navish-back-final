import morgan from 'morgan';
import { Request, Response } from 'express';
import { httpLogger } from '../config/logger';
import { isDevelopment } from '../config/env';

// ── Morgan stream → Winston ───────────────────────────────────────────────────
const stream = {
  write: (message: string) => {
    httpLogger.http(message.trim());
  },
};

// ── Skip health check logs ────────────────────────────────────────────────────
const skip = (req: Request) => req.path === '/health';

// ── Dev: colorized concise format ─────────────────────────────────────────────
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

// ── Production: JSON-structured ───────────────────────────────────────────────
morgan.token('request-id', (req: Request) => req.headers['x-request-id'] as string);
morgan.token('user-id', (req: Request) => req.user?.id || '-');
morgan.token('body-size', (_req, res: Response) => res.getHeader('content-length')?.toString() || '-');

const prodFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time',
  requestId: ':request-id',
  userId: ':user-id',
  contentLength: ':body-size',
  remoteAddr: ':remote-addr',
  userAgent: ':user-agent',
});

export const httpLoggerMiddleware = morgan(isDevelopment ? devFormat : prodFormat, {
  stream,
  skip,
});
