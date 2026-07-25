import { Router } from 'express';
import { environmentController } from '../controllers/environment/environment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadImage } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticate);

// Room scoped HDRs
router.post('/room/:roomId', environmentController.createEnvironment);
router.get('/room/:roomId', environmentController.getEnvironmentsByRoom);
router.post('/room/:roomId/default/:id', environmentController.setDefault);

router.get('/:id', environmentController.getEnvironment);
router.put('/:id', environmentController.updateEnvironment);
router.delete('/:id', environmentController.deleteEnvironment);

// Upload raw EXR/HDR files
router.post('/:id/hdr', uploadImage, environmentController.uploadHdr);

export default router;
