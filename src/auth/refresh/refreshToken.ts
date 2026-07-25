import { redis } from '../../config/redis';
import { hashToken } from '../../utils/crypto';
import { prisma } from '../../config/database';
import { signRefreshToken, verifyRefreshToken } from '../jwt/jwt';
import { ApiError } from '../../utils/ApiError';

const REFRESH_PREFIX = 'refresh:';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ── Build Redis key ───────────────────────────────────────────────────────────
const buildKey = (userId: string, deviceId?: string): string =>
  `${REFRESH_PREFIX}${userId}:${deviceId || 'default'}`;

// ── Store refresh token (Redis + DB) ──────────────────────────────────────────
export const storeRefreshToken = async (
  userId: string,
  token: string,
  deviceId?: string,
  meta?: { ipAddress?: string; deviceInfo?: string },
): Promise<void> => {
  const hash = hashToken(token);
  const redisKey = buildKey(userId, deviceId);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

  // Store hash in Redis for fast O(1) lookup
  await redis.setex(redisKey, REFRESH_TTL_SECONDS, hash);

  // Also persist to DB for audit trail and revocation across nodes
  await prisma.refreshToken.create({
    data: {
      userId,
      token: hash,
      deviceId,
      deviceInfo: meta?.deviceInfo,
      ipAddress: meta?.ipAddress,
      expiresAt,
    },
  });
};

// ── Validate refresh token ────────────────────────────────────────────────────
export const validateRefreshToken = async (
  token: string,
): Promise<{ userId: string; deviceId?: string }> => {
  // 1. Verify JWT signature
  const payload = verifyRefreshToken(token);
  const { sub: userId, deviceId } = payload;

  // 2. Check Redis
  const redisKey = buildKey(userId, deviceId);
  const storedHash = await redis.get(redisKey);

  if (!storedHash) {
    // Fallback: check DB (e.g., after Redis flush)
    const hash = hashToken(token);
    const dbToken = await prisma.refreshToken.findFirst({
      where: { userId, token: hash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!dbToken) throw ApiError.unauthorized('Refresh token is invalid or expired');
    return { userId, deviceId };
  }

  const hash = hashToken(token);
  if (storedHash !== hash) {
    throw ApiError.unauthorized('Refresh token mismatch — possible token reuse detected');
  }

  return { userId, deviceId };
};

// ── Rotate refresh token ──────────────────────────────────────────────────────
export const rotateRefreshToken = async (
  oldToken: string,
  meta?: { ipAddress?: string; deviceInfo?: string },
): Promise<string> => {
  const { userId, deviceId } = await validateRefreshToken(oldToken);

  // Revoke old token
  await revokeRefreshToken(oldToken, userId);

  // Sign and store new token
  const newToken = signRefreshToken(userId, deviceId);
  await storeRefreshToken(userId, newToken, deviceId, meta);

  return newToken;
};

// ── Revoke a token ────────────────────────────────────────────────────────────
export const revokeRefreshToken = async (token: string, userId: string): Promise<void> => {
  const payload = verifyRefreshToken(token);
  const redisKey = buildKey(userId, payload.deviceId);
  const hash = hashToken(token);

  // Delete from Redis
  await redis.del(redisKey);

  // Mark revoked in DB
  await prisma.refreshToken.updateMany({
    where: { userId, token: hash },
    data: { revokedAt: new Date() },
  });
};

// ── Revoke all tokens for a user (all devices) ───────────────────────────────
export const revokeAllRefreshTokens = async (userId: string): Promise<void> => {
  // Remove all Redis keys for this user
  const keys = await redis.keys(`${REFRESH_PREFIX}${userId}:*`);
  if (keys.length) await redis.del(...keys);

  // Revoke all in DB
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
