import path from 'path';
import { allowedModelTypes, allowedImageTypes, allowedTextureTypes } from '../config/env';

/**
 * Extract the file extension (lowercase, without dot).
 */
export const getExtension = (filename: string): string => {
  return path.extname(filename).replace('.', '').toLowerCase();
};

/**
 * Check if a file extension is in an allowed list.
 */
export const isAllowedExtension = (filename: string, allowedList: string[]): boolean => {
  return allowedList.includes(getExtension(filename));
};

/**
 * Build a namespaced S3 storage key.
 *  e.g. models/<projectId>/<uuid>.glb
 */
export const buildStorageKey = (prefix: string, ...segments: string[]): string => {
  return [prefix, ...segments].filter(Boolean).join('/');
};

/**
 * Convert bytes to a human-readable string.
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Determine MIME type from extension.
 */
export const getMimeTypeFromExtension = (ext: string): string => {
  const mimeMap: Record<string, string> = {
    glb: 'model/gltf-binary',
    gltf: 'model/gltf+json',
    fbx: 'application/octet-stream',
    obj: 'text/plain',
    skp: 'application/octet-stream',
    '3ds': 'application/octet-stream',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    hdr: 'image/vnd.radiance',
    exr: 'image/x-exr',
    ktx2: 'image/ktx2',
    basis: 'application/octet-stream',
  };
  return mimeMap[ext.toLowerCase()] ?? 'application/octet-stream';
};

/**
 * Validate a model file extension.
 */
export const isValidModelFile = (filename: string): boolean =>
  isAllowedExtension(filename, allowedModelTypes);

/**
 * Validate an image file extension.
 */
export const isValidImageFile = (filename: string): boolean =>
  isAllowedExtension(filename, allowedImageTypes);

/**
 * Validate a texture file extension.
 */
export const isValidTextureFile = (filename: string): boolean =>
  isAllowedExtension(filename, allowedTextureTypes);

/**
 * Sanitize a filename: remove unsafe characters.
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._\-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
};
