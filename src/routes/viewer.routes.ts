import { Router } from 'express';
import { viewerController } from '../controllers/viewer/viewer.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Viewer state endpoints can be accessed by both registered users and guest viewers with VIEWER permission
router.use(authenticate);

router.get('/session/:projectId', viewerController.getSessionState);
router.post('/session/:projectId', viewerController.saveSessionState);
router.get('/live/:projectId/count', viewerController.getLiveViewersCount);

// Save viewpoints/snapshots of room
router.post('/project/:projectId/screenshot', viewerController.saveScreenshot);

export default router;
