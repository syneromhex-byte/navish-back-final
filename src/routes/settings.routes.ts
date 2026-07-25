import { Router } from 'express';
import { settingsController } from '../controllers/settings/settings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

// User preferences
router.get('/user', settingsController.getUserSettings);
router.put('/user', settingsController.updateUserSettings);

// Global settings configurations
router.get('/system', settingsController.getSystemSettings);
router.post('/system', requireRole(UserRole.ADMIN), settingsController.updateSystemSetting);

export default router;
