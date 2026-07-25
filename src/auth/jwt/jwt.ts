import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { JwtPayload, ViewerJwtPayload } from '../../types';
import { ApiError } from '../../utils/ApiError';
import { UserRole } from '@prisma/client';

// ── Access Token ──────────────────────────────────────────────────────────────

export const signAccessToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Access token has expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw ApiError.unauthorized('Invalid access token');
    }
    throw ApiError.unauthorized('Token verification failed');
  }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────

export const signRefreshToken = (userId: string, deviceId?: string): string => {
  return jwt.sign({ sub: userId, deviceId, type: 'refresh', jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
};

export const verifyRefreshToken = (token: string): { sub: string; deviceId?: string } => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; deviceId?: string };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Refresh token has expired. Please login again.');
    }
    throw ApiError.unauthorized('Invalid refresh token');
  }
};

// ── Password Reset Token ──────────────────────────────────────────────────────

export const signResetToken = (userId: string): string => {
  return jwt.sign({ sub: userId, type: 'reset' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_RESET_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
};

// ── Viewer Token (for share links — no account needed) ───────────────────────

export const signViewerToken = (payload: Omit<ViewerJwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '4h',
    algorithm: 'HS256',
  });
};

export const verifyViewerToken = (token: string): ViewerJwtPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as ViewerJwtPayload;
    if (payload.type !== 'viewer') {
      throw ApiError.unauthorized('Invalid viewer token');
    }
    return payload;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unauthorized('Invalid viewer token');
  }
};

// ── Extract token from Authorization header ───────────────────────────────────

export const extractBearerToken = (authHeader?: string): string | null => {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
};
