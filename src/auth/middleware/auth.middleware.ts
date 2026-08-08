import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyViewerToken, extractBearerToken } from '../jwt/jwt';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../config/database';
import { UserStatus } from '@prisma/client';

/**
 * Authenticate a request via Bearer JWT.
 * Attaches req.user with id, email, role, permissions.
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) throw ApiError.unauthorized('No access token provided');

  const payload = verifyAccessToken(token);

  // Verify user still exists and is active
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      permissions: { select: { permission: { select: { name: true } } } },
    },
  });

  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (user.status === UserStatus.SUSPENDED) throw ApiError.forbidden('Account is suspended');
  if (user.status === UserStatus.INACTIVE) throw ApiError.forbidden('Account is inactive');

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions.map((p) => p.permission.name),
  };

  next();
});

/**
 * Optional authentication — attaches req.user if token present, but does not fail.
 */
export const optionalAuthenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) return next();

    try {
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
        select: {
          id: true,
          email: true,
          role: true,
          permissions: { select: { permission: { select: { name: true } } } },
        },
      });
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions.map((p) => p.permission.name),
        };
      }
    } catch {
      // Silently fail — token invalid but route is public
    }

    next();
  },
);

/**
 * Authenticate viewer token from share link access.
 */
export const authenticateViewer = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) throw ApiError.unauthorized('Viewer token required');

    const payload = verifyViewerToken(token);
    req.viewerSession = payload;
    next();
  },
);
