import { Router } from 'express';
import { portfolioController } from '../controllers/portfolio/portfolio.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { createPortfolioSchema, updatePortfolioSchema } from '../validators/portfolio.validator';
import { uploadPortfolioMedia } from '../middleware/upload.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Public / Client routes (Optional Auth attached so req.user is set when logged in)
router.get('/', optionalAuthenticate, portfolioController.listPortfolioItems);
router.get('/:id', optionalAuthenticate, portfolioController.getPortfolioItem);

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
