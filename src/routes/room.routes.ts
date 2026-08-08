import { Router } from 'express';
import { roomController } from '../controllers/rooms/room.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createRoomSchema, updateRoomSchema, assignModelToRoomSchema } from '../validators/room.validator';

const router = Router();

router.use(authenticate);

// Room scoped under project in routes setup:
router.post('/project/:projectId', validate(createRoomSchema), roomController.createRoom);
router.get('/project/:projectId', roomController.getRoomsByProject);

router.get('/:id', roomController.getRoom);
router.put('/:id', validate(updateRoomSchema), roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

// Model placements
router.post('/:id/models', validate(assignModelToRoomSchema), roomController.assignModel);
router.delete('/:id/models/:modelId', roomController.removeModel);

export default router;
