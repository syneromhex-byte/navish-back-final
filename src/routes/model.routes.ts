import { Router } from 'express';
import { modelController } from '../controllers/models/model.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.use(authenticate);

router.get('/', modelController.listModels);

// Specific routes first
router.get('/:id/presigned-url', modelController.getPresignedUrl);
router.get('/:id/versions', modelController.getVersions);

// Dynamic :id routes last
router.get('/:id', modelController.getModel);
router.put('/:id', modelController.updateModel);
router.delete('/:id', modelController.deleteModel);

export default router;
