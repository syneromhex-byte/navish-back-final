import { redis } from '../../config/redis';
import { logger } from '../../config/logger';

const VERIFIED_EMAIL_TTL_SECONDS = 15 * 60; // 15 minutes
const KEY_PREFIX = 'verified_email:';

export interface VerifiedEmailSession {
  email: string;
  verifiedAt: string;
  expiresAt: string;
}

export const verifiedEmailStore = {
  /**
   * Mark an email as OTP-verified. Overwrites any existing entry.
   */
  async set(email: string): Promise<void> {
    try {
      const key = `${KEY_PREFIX}${email.toLowerCase()}`;
      const session: VerifiedEmailSession = {
        email: email.toLowerCase(),
        verifiedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + VERIFIED_EMAIL_TTL_SECONDS * 1000).toISOString(),
      };
      await redis.set(key, JSON.stringify(session), 'EX', VERIFIED_EMAIL_TTL_SECONDS);
      logger.debug(`[VerifiedEmailStore] Email marked as verified: ${email} (TTL ${VERIFIED_EMAIL_TTL_SECONDS}s)`);
    } catch (err) {
      logger.error(`[VerifiedEmailStore] Failed to set session for ${email}`, err);
    }
  },

  /**
   * Fetch the verification session details if they exist.
   */
  async get(email: string): Promise<VerifiedEmailSession | null> {
    try {
      const key = `${KEY_PREFIX}${email.toLowerCase()}`;
      const value = await redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as VerifiedEmailSession;
    } catch (err) {
      logger.error(`[VerifiedEmailStore] Failed to parse JSON session for ${email}`, err);
      return null;
    }
  },

  /**
   * Returns true if the email has a valid, unexpired verification entry.
   */
  async has(email: string): Promise<boolean> {
    const session = await this.get(email);
    return session !== null;
  },

  /**
   * Consume (delete) the verification entry after successful registration.
   */
  async consume(email: string): Promise<void> {
    try {
      const key = `${KEY_PREFIX}${email.toLowerCase()}`;
      await redis.del(key);
      logger.debug(`[VerifiedEmailStore] Verification entry consumed for: ${email}`);
    } catch (err) {
      logger.error(`[VerifiedEmailStore] Failed to consume session for ${email}`, err);
    }
  },
};
