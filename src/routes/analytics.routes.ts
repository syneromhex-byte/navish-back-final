import { Router } from 'express';
import { analyticsController } from '../controllers/analytics/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Telemetry/logging hits can be optional / authenticate check is dynamic (allows viewer guest logins too)
router.post('/event', authenticate, analyticsController.logEvent);

// Reading stats is restricted to owners / architects / admins
router.get('/project/:projectId', authenticate, requireRole(UserRole.ADMIN, UserRole.ARCHITECT), analyticsController.getProjectAnalytics);
router.get('/project/:projectId/export', authenticate, requireRole(UserRole.ADMIN, UserRole.ARCHITECT), analyticsController.exportReport);

export default router;
