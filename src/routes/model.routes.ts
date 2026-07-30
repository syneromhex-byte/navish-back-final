import { Router } from 'express';
import { modelController } from '../controllers/models/model.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

// Public / optional auth routes for viewer and portfolio model listing
router.get('/', optionalAuthenticate, modelController.listModels);
router.get('/:id', optionalAuthenticate, modelController.getModel);

// Protected routes (require auth)
router.use(authenticate);

router.get('/client', modelController.getClientModels);

// Specific routes first
router.get('/:id/presigned-url', modelController.getPresignedUrl);
router.get('/:id/versions', modelController.getVersions);

// Dynamic :id modification routes
router.put('/:id', modelController.updateModel);
router.delete('/:id', modelController.deleteModel);

export default router;
