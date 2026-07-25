import { Response } from 'express';
import { PaginationMeta } from '../types';

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200,
    meta?: PaginationMeta,
  ): Response {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data,
      ...(meta ? { meta } : {}),
    });
  }

  static created<T>(res: Response, data: T, message = 'Created successfully'): Response {
    return res.status(201).json({
      success: true,
      statusCode: 201,
      message,
      data,
    });
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static paginated<T>(
    res: Response,
    data: T[],
    meta: PaginationMeta,
    message = 'Data retrieved successfully',
  ): Response {
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message,
      data,
      meta,
    });
  }

  static error(
    res: Response,
    statusCode: number,
    message: string,
    errors: unknown[] = [],
  ): Response {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      ...(errors.length ? { errors } : {}),
    });
  }
}
