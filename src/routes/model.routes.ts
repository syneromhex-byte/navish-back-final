import { Router } from 'express';
import { modelController } from '../controllers/models/model.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.use(authenticate);

router.get('/', modelController.listModels);
router.get('/:id', modelController.getModel);
router.put('/:id', modelController.updateModel);
router.delete('/:id', modelController.deleteModel);

router.get('/:id/versions', modelController.getVersions);

export default router;
