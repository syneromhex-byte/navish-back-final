import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validate request data against a Zod schema.
 * Replaces the original request field with parsed/coerced data.
 */
export const validate =
  (schema: ZodSchema, target: ValidationTarget = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      throw ApiError.badRequest('Validation failed', errors);
    }

    // Replace with parsed (and type-coerced) data
    (req as any)[target] = result.data;
    next();
  };

/**
 * Validate body.
 */
export const validateBody = (schema: ZodSchema) => validate(schema, 'body');

/**
 * Validate query params.
 */
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');

/**
 * Validate route params.
 */
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');
