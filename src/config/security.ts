import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { env, allowedOrigins, isProduction } from './env';
import { ApiError } from '../utils/ApiError';
import type { Request, Response, NextFunction } from 'express';

// ── Helmet ────────────────────────────────────────────────────────────────────
export const helmetConfig = helmet({
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      }
    : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// ── CORS ──────────────────────────────────────────────────────────────────────
export const corsConfig = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || !isProduction) {
      return callback(null, true);
    }
    return callback(new ApiError(403, `CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Device-ID', 'ETag', 'etag'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'ETag', 'etag'],
  maxAge: 86400, // 24h preflight cache
});

// ── General rate limiter ──────────────────────────────────────────────────────
export const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: (req: Request) => req.path === '/health',
});

// ── Strict rate limiter for Auth endpoints ────────────────────────────────────
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again in 15 minutes.' },
  keyGenerator: (req: Request) =>
    (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown',
});

// ── Upload rate limiter ───────────────────────────────────────────────────────
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Upload limit reached. Please try again in an hour.' },
});

// ── X-Request-ID middleware ───────────────────────────────────────────────────
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId =
    (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};
