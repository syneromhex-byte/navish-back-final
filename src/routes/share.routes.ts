import { Router } from 'express';
import { shareController } from '../controllers/share/share.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createShareLinkSchema, accessShareLinkSchema, updateShareLinkSchema } from '../validators/share.validator';
import { UserRole } from '@prisma/client';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Publicly accessible for validating guest accesses
router.post('/access', validate(accessShareLinkSchema), shareController.accessShareLink);

// Restricted to authenticated architects/admins
router.use(authenticate);

router.post('/', requireRole(UserRole.ADMIN, UserRole.ARCHITECT), validate(createShareLinkSchema), shareController.createShareLink);
router.get('/project/:projectId', shareController.getShareLinksByProject);
router.get('/:id', shareController.getShareLink);
router.put('/:id', validate(updateShareLinkSchema), shareController.updateShareLink);
router.delete('/:id', shareController.revokeShareLink);

export default router;
