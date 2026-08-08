import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env, allowedModelTypes, allowedImageTypes, allowedTextureTypes } from './env';
import { ApiError } from '../utils/ApiError';

// ── MIME type maps ────────────────────────────────────────────────────────────
const MODEL_MIMES = new Set([
  'model/gltf-binary',
  'model/gltf+json',
  'application/octet-stream', // GLB, FBX, 3DS often come in as this
  'application/x-fbx',
  'application/x-obj',
]);

const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/x-hdr',
  'image/vnd.radiance',
]);

const TEXTURE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/ktx2',
  'application/octet-stream',
]);

// ── Helper: validate extension ────────────────────────────────────────────────
const hasAllowedExt = (file: Express.Multer.File, allowed: string[]): boolean => {
  const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
  return allowed.includes(ext);
};

// ── Memory storage (for S3 stream) ───────────────────────────────────────────
export const memoryStorage = multer.memoryStorage();

// ── Disk storage (local dev) ──────────────────────────────────────────────────
export const localDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(env.LOCAL_STORAGE_PATH, 'temp'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

// ── Model upload ──────────────────────────────────────────────────────────────
export const modelUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!hasAllowedExt(file, allowedModelTypes)) {
      return cb(
        new ApiError(400, `Invalid model format. Allowed: ${allowedModelTypes.join(', ')}`),
      );
    }
    cb(null, true);
  },
});

// ── Image / HDR upload ────────────────────────────────────────────────────────
export const imageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB for images/HDR
  fileFilter: (_req, file, cb) => {
    if (!hasAllowedExt(file, allowedImageTypes) && !IMAGE_MIMES.has(file.mimetype)) {
      return cb(new ApiError(400, `Invalid image format. Allowed: ${allowedImageTypes.join(', ')}`));
    }
    cb(null, true);
  },
});

// ── Texture upload ────────────────────────────────────────────────────────────
export const textureUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB for textures
  fileFilter: (_req, file, cb) => {
    if (!hasAllowedExt(file, allowedTextureTypes) && !TEXTURE_MIMES.has(file.mimetype)) {
      return cb(
        new ApiError(400, `Invalid texture format. Allowed: ${allowedTextureTypes.join(', ')}`),
      );
    }
    cb(null, true);
  },
});

// ── Avatar / profile image ────────────────────────────────────────────────────
export const avatarUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    if (!hasAllowedExt(file, allowed)) {
      return cb(new ApiError(400, 'Avatar must be JPG, PNG, or WebP'));
    }
    cb(null, true);
  },
});
