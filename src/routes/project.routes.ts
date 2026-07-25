import { Router } from 'express';
import { projectController } from '../controllers/projects/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  createProjectVersionSchema,
  addProjectMemberSchema,
} from '../validators/project.validator';
import { uploadImage } from '../middleware/upload.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Public share link viewer route
router.get('/share/:token', projectController.getByShareToken);

router.use(authenticate);

// Public / list projects
router.get('/', validate(listProjectsQuerySchema, 'query'), projectController.listProjects);
router.post('/', requireRole(UserRole.ADMIN, UserRole.ARCHITECT), validate(createProjectSchema), projectController.createProject);

router.get('/:id', projectController.getProject);
router.put('/:id', validate(updateProjectSchema), projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// Project thumbnail
router.post('/:id/thumbnail', uploadImage, projectController.uploadThumbnail);

// Members mapping
router.post('/:id/members', requireRole(UserRole.ADMIN, UserRole.ARCHITECT), validate(addProjectMemberSchema), projectController.addMember);
router.delete('/:id/members/:userId', requireRole(UserRole.ADMIN, UserRole.ARCHITECT), projectController.removeMember);

// Versions / Snapshotting
router.post('/:id/versions', validate(createProjectVersionSchema), projectController.createVersion);
router.get('/:id/versions', projectController.getVersions);

export default router;
