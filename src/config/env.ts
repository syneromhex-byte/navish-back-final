import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_VERSION: z.string().default('v1'),
  APP_NAME: z.string().default('NAVISH ARC'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_TLS: z.string().transform((v) => v === 'true').default('false'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_RESET_EXPIRES_IN: z.string().default('1h'),

  // AWS S3
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_S3_BUCKET: z.string().min(1, 'AWS_S3_BUCKET is required'),
  AWS_S3_ENDPOINT: z.string().optional(),

  // Email
  EMAIL_PROVIDER: z.enum(['ses', 'smtp']).default('ses'),
  EMAIL_FROM: z.string().default('no-reply@navish.com'),
  EMAIL_FROM_NAME: z.string().default('NAVISH ARC'),
  SES_REGION: z.string().default('us-east-1'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.string().transform((v) => v === 'true').default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Security
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  BCRYPT_ROUNDS: z.coerce.number().default(12),

  // File Upload
  MAX_FILE_SIZE_MB: z.coerce.number().default(500),
  ALLOWED_MODEL_TYPES: z.string().default('glb,gltf,fbx,obj,skp,3ds'),
  ALLOWED_IMAGE_TYPES: z.string().default('jpg,jpeg,png,webp,hdr,exr'),
  ALLOWED_TEXTURE_TYPES: z.string().default('jpg,jpeg,png,webp,ktx2,basis'),
  LOCAL_STORAGE_PATH: z.string().default('./storage'),
  MULTIPART_THRESHOLD_MB: z.coerce.number().default(10),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
  LOG_DIR: z.string().default('./src/logs'),

  // Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  PASSWORD_RESET_URL: z.string().url().default('http://localhost:5173/reset-password'),
  EMAIL_VERIFY_URL: z.string().url().default('http://localhost:5173/verify-email'),
});

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('❌ Invalid environment variables:\n', JSON.stringify(_parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = _parsed.data;

// Derived helpers
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
export const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
export const allowedModelTypes = env.ALLOWED_MODEL_TYPES.split(',').map((t) => t.trim());
export const allowedImageTypes = env.ALLOWED_IMAGE_TYPES.split(',').map((t) => t.trim());
export const allowedTextureTypes = env.ALLOWED_TEXTURE_TYPES.split(',').map((t) => t.trim());
export const maxFileSizeBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;
export const multipartThresholdBytes = env.MULTIPART_THRESHOLD_MB * 1024 * 1024;
