import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { hasMinRole, hasPermission, hasAllPermissions, hasAnyPermission } from '../permissions/permissions';
import { ApiError } from '../../utils/ApiError';

/**
 * Require minimum role level.
 * e.g. requireRole(UserRole.ARCHITECT) → allows ARCHITECT and ADMIN
 */
export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(`Requires one of roles: ${roles.join(', ')}`);
    }
    next();
  };

/**
 * Require minimum role by hierarchy.
 */
export const requireMinRole =
  (minRole: UserRole) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw ApiError.unauthorized();
    if (!hasMinRole(req.user.role, minRole)) {
      throw ApiError.forbidden(`Requires ${minRole} role or higher`);
    }
    next();
  };

/**
 * Require a specific permission.
 */
export const requirePermission =
  (permission: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw ApiError.unauthorized();
    // ADMINs bypass all permission checks
    if (req.user.role === UserRole.ADMIN) return next();
    if (!hasPermission(req.user.permissions, permission)) {
      throw ApiError.forbidden(`Missing permission: ${permission}`);
    }
    next();
  };

/**
 * Require all of the listed permissions.
 */
export const requireAllPermissions =
  (...permissions: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw ApiError.unauthorized();
    if (req.user.role === UserRole.ADMIN) return next();
    if (!hasAllPermissions(req.user.permissions, permissions)) {
      throw ApiError.forbidden(`Missing required permissions: ${permissions.join(', ')}`);
    }
    next();
  };

/**
 * Require any one of the listed permissions.
 */
export const requireAnyPermission =
  (...permissions: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw ApiError.unauthorized();
    if (req.user.role === UserRole.ADMIN) return next();
    if (!hasAnyPermission(req.user.permissions, permissions)) {
      throw ApiError.forbidden(`Requires one of permissions: ${permissions.join(', ')}`);
    }
    next();
  };

/**
 * Admin-only shorthand.
 */
export const adminOnly = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) throw ApiError.unauthorized();
  if (req.user.role !== UserRole.ADMIN) {
    throw ApiError.forbidden('Admin access required');
  }
  next();
};
