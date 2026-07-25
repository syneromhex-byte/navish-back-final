import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { isProduction } from '../config/env';

/**
 * Global error handler — must be registered last in Express.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = req.headers['x-request-id'] as string;

  if (err instanceof ApiError) {
    // Operational errors (expected: 4xx)
    if (err.statusCode < 500) {
      logger.warn('Client error', {
        requestId,
        statusCode: err.statusCode,
        message: err.message,
        path: req.path,
        method: req.method,
        errors: err.errors,
      });
    } else {
      // 5xx operational
      logger.error('Server error (ApiError)', {
        requestId,
        statusCode: err.statusCode,
        message: err.message,
        stack: err.stack,
        path: req.path,
      });
    }

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode,
      requestId,
      ...(err.errors.length ? { errors: err.errors } : {}),
      ...(!isProduction && err.stack ? { stack: err.stack } : {}),
    });
    return;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    logger.warn('Multer upload error', { requestId, message: err.message });
    res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
      statusCode: 400,
      requestId,
    });
    return;
  }

  // Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    logger.error('Prisma error', { requestId, code: prismaErr.code, meta: prismaErr.meta });

    if (prismaErr.code === 'P2002') {
      res.status(409).json({ success: false, statusCode: 409, message: 'A record with this data already exists', requestId });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({ success: false, statusCode: 404, message: 'Record not found', requestId });
      return;
    }
  }

  // Unexpected errors
  logger.error('Unhandled error', {
    requestId,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    message: isProduction ? 'Internal Server Error' : err.message,
    statusCode: 500,
    requestId,
    ...(!isProduction ? { stack: err.stack } : {}),
  });
};

/**
 * 404 handler for unmatched routes.
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};
