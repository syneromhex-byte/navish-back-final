import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token.
 */
export const generateSecureToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash a raw token with SHA-256 (for safe DB storage).
 */
export const hashToken = (rawToken: string): string => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

/**
 * Generate a token + its hash pair in one call.
 */
export const generateTokenPair = (bytes = 32): { raw: string; hash: string } => {
  const raw = generateSecureToken(bytes);
  return { raw, hash: hashToken(raw) };
};

/**
 * Verify a raw token against a stored hash.
 */
export const verifyTokenHash = (rawToken: string, storedHash: string): boolean => {
  const hash = hashToken(rawToken);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
};

/**
 * Generate a slug from a string.
 */
export const generateSlug = (input: string): string => {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
};

/**
 * Generate a unique slug by appending a short random suffix.
 */
export const generateUniqueSlug = (input: string): string => {
  const base = generateSlug(input);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
};

/**
 * Compute SHA-256 checksum of a buffer.
 */
export const computeChecksum = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};
