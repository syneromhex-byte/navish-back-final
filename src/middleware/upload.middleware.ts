import { Request, Response, NextFunction } from 'express';
import path from 'path';
import multer from 'multer';
import { modelUpload, imageUpload, textureUpload, avatarUpload, memoryStorage } from '../config/multer';
import { ApiError } from '../utils/ApiError';

const genericUpload = multer({ storage: memoryStorage, limits: { fileSize: 500 * 1024 * 1024 } });

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

/**
 * Single portfolio media file upload (accepts field 'file' or 'model' or 'image').
 */
export const uploadPortfolioMedia = (req: Request, res: Response, next: NextFunction): void => {
  genericUpload.single('file')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) {
      genericUpload.single('model')(req, res, (err2) => {
        if (err2) return next(err2);
        if (!req.file) {
          genericUpload.single('image')(req, res, (err3) => {
            if (err3) return next(err3);
            if (!req.file) return next(new ApiError(400, 'No file provided for portfolio upload'));
            next();
          });
        } else {
          next();
        }
      });
    } else {
      next();
    }
  });
};
