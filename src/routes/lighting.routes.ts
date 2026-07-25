import { Router } from 'express';
import { lightingController } from '../controllers/lighting/lighting.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { upsertLightingSchema } from '../validators/lighting.validator';

const router = Router();

router.use(authenticate);

// Room scoped config
router.post('/room/:roomId', validate(upsertLightingSchema), lightingController.upsertLighting);
router.get('/room/:roomId', lightingController.getLightingByRoom);
router.post('/room/:roomId/activate/:id', lightingController.setActiveLighting);

router.get('/:id', lightingController.getLighting);
router.put('/:id', validate(upsertLightingSchema.partial()), lightingController.updateLighting);
router.delete('/:id', lightingController.deleteLighting);

export default router;
