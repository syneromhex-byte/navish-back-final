import { Router } from 'express';
import { adminController } from '../controllers/admin/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

router.get('/stats', adminController.getStats);
router.get('/logs', adminController.getAuditLogs);

export default router;
