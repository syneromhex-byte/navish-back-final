import { Router } from 'express';
import { portfolioController } from '../controllers/portfolio/portfolio.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { createPortfolioSchema, updatePortfolioSchema } from '../validators/portfolio.validator';
import { UserRole } from '@prisma/client';

const router = Router();

// Public routes
router.get('/', portfolioController.listPortfolioItems);
router.get('/:id', portfolioController.getPortfolioItem);

// Protected routes (Admin / Architect)
router.use(authenticate);
router.use(requireRole(UserRole.ADMIN, UserRole.ARCHITECT));

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
