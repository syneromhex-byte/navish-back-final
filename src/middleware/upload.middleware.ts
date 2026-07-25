import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { modelUpload, imageUpload, textureUpload, avatarUpload } from '../config/multer';
import { ApiError } from '../utils/ApiError';

/**
 * Single model file upload.
 */
export const uploadModel = (req: Request, res: Response, next: NextFunction): void => {
  modelUpload.single('file')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return next(new ApiError(400, 'No model file provided'));
    next();
  });
};

/**
 * Single image/HDR upload.
 */
export const uploadImage = (req: Request, res: Response, next: NextFunction): void => {
  imageUpload.single('file')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return next(new ApiError(400, 'No image file provided'));
    next();
  });
};

/**
 * Single texture upload.
 */
export const uploadTexture = (req: Request, res: Response, next: NextFunction): void => {
  textureUpload.single('file')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return next(new ApiError(400, 'No texture file provided'));
    next();
  });
};

/**
 * Avatar upload.
 */
export const uploadAvatar = (req: Request, res: Response, next: NextFunction): void => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

/**
 * Optional image upload (does not fail if no file provided).
 */
export const optionalImageUpload = (req: Request, res: Response, next: NextFunction): void => {
  imageUpload.single('file')(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};
