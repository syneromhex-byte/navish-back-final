import { Router } from 'express';
import { clientController } from '../controllers/clients/client.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { createClientSchema, updateClientSchema, listClientsQuerySchema } from '../validators/client.validator';
import { uploadAvatar } from '../middleware/upload.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ADMIN, UserRole.ARCHITECT));

router.post('/', validate(createClientSchema), clientController.createClient);
router.get('/', validate(listClientsQuerySchema, 'query'), clientController.listClients);
router.get('/:id', clientController.getClient);
router.put('/:id', validate(updateClientSchema), clientController.updateClient);
router.delete('/:id', clientController.deleteClient);

router.post('/:id/logo', uploadAvatar, clientController.uploadLogo);

export default router;
