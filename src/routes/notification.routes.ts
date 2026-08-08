import { Router } from 'express';
import { notificationController } from '../controllers/notifications/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.post('/read-all', notificationController.markAllAsRead);
router.post('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;
