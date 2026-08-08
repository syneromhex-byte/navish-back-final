import { Router, Request, Response, NextFunction } from 'express';
import { portfolioController } from '../controllers/portfolio/portfolio.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { createPortfolioSchema, updatePortfolioSchema } from '../validators/portfolio.validator';
import { uploadPortfolioMedia } from '../middleware/upload.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Add cache-control header middleware to disable caching on public portfolio routes
const noCache = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

// Public / Client routes (Optional Auth attached so req.user is set when logged in, noCache attached)
router.get('/', optionalAuthenticate, noCache, portfolioController.listPortfolioItems);
router.get('/:id', optionalAuthenticate, noCache, portfolioController.getPortfolioItem);

// Protected routes (Admin / Architect)
router.use(authenticate);
router.use(requireRole(UserRole.ADMIN, UserRole.ARCHITECT));

router.post(
  '/upload',
  uploadPortfolioMedia,
  portfolioController.uploadPortfolioFile
);

router.post(
  '/',
  validate(createPortfolioSchema),
  portfolioController.createPortfolioItem
);

router.put(
  '/:id',
  validate(updatePortfolioSchema),
  portfolioController.updatePortfolioItem
);

router.delete(
  '/:id',
  portfolioController.deletePortfolioItem
);

export default router;
