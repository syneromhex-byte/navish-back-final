import { Router } from 'express';
import { userController } from '../controllers/users/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { createUserSchema, updateUserSchema, updateUserRoleSchema, listUsersQuerySchema } from '../validators/user.validator';
import { uploadAvatar } from '../middleware/upload.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Admin-only creation
router.post('/', requireRole(UserRole.ADMIN), validate(createUserSchema), userController.createUser);
router.get('/', requireRole(UserRole.ADMIN), validate(listUsersQuerySchema, 'query'), userController.listUsers);

// Individual profile routes
router.get('/:id', userController.getUser);
router.put('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', requireRole(UserRole.ADMIN), userController.deleteUser);

// Avatar
router.post('/:id/avatar', uploadAvatar, userController.uploadAvatar);

// Administration statuses
router.patch('/:id/role', requireRole(UserRole.ADMIN), validate(updateUserRoleSchema), userController.updateRole);
router.post('/:id/suspend', requireRole(UserRole.ADMIN), userController.suspendUser);
router.post('/:id/activate', requireRole(UserRole.ADMIN), userController.activateUser);

// Audit logs of user actions
router.get('/:id/logs', requireRole(UserRole.ADMIN), userController.getActivityLogs);

export default router;
