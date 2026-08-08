import { Router } from 'express';
import { materialController } from '../controllers/materials/material.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createMaterialSchema, updateMaterialSchema } from '../validators/material.validator';

const router = Router();

router.use(authenticate);

// Scoped to specific models
router.post('/model/:modelId', validate(createMaterialSchema), materialController.upsertMaterial);
router.get('/model/:modelId', materialController.getMaterialsByModel);
router.post('/model/:modelId/bulk', materialController.bulkUpdateMaterials);

router.get('/:id', materialController.getMaterial);
router.put('/:id', validate(updateMaterialSchema), materialController.updateMaterial);
router.delete('/:id', materialController.deleteMaterial);

export default router;
