import { Router } from 'express';
import { textureController } from '../controllers/textures/texture.controller';
import { authenticate } from '../middleware/auth.middleware';
import { textureUpload } from '../config/multer';
import { uploadTexture } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticate);

router.post('/', uploadTexture, textureController.uploadTexture);
router.get('/', textureController.listTextures);
router.get('/:id/signed-url', textureController.getSignedUrl);
router.get('/:id', textureController.getTexture);
router.delete('/:id', textureController.deleteTexture);

export default router;
