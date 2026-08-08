import { Request, Response, NextFunction } from 'express';
import { authRateLimiter, uploadRateLimiter } from '../config/security';

// Re-export configured limiters as named middleware
export const authLimiter = authRateLimiter;
export const uploadLimiter = uploadRateLimiter;

/**
 * No-op placeholder — allows disabling rate limiting in tests.
 */
export const noopLimiter = (_req: Request, _res: Response, next: NextFunction): void => next();
