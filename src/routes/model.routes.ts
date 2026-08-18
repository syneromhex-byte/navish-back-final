import { Router } from 'express';
import { modelController } from '../controllers/models/model.controller';
import { projectController } from '../controllers/projects/project.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';

const router = Router();

// 1. Specific static routes FIRST
router.get('/', optionalAuthenticate, modelController.listModels);
router.get('/client', optionalAuthenticate, modelController.getClientModels);

// 2. Specific sub-resource routes
router.get('/:id/presigned-url', optionalAuthenticate, modelController.getPresignedUrl);
router.get('/:id/versions', optionalAuthenticate, modelController.getVersions);
router.get('/:id/project', optionalAuthenticate, projectController.getProjectByModelId);

// 3. Dynamic :id GET route
router.get('/:id', optionalAuthenticate, modelController.getModel);

// Protected routes (require auth)
router.use(authenticate);

// Dynamic :id modification routes
router.put('/:id', modelController.updateModel);
router.delete('/:id', modelController.deleteModel);

export default router;
