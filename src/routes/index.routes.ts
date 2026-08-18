import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import clientRoutes from './client.routes';
import projectRoutes from './project.routes';
import roomRoutes from './room.routes';
import modelRoutes from './model.routes';
import uploadRoutes from './upload.routes';
import materialRoutes from './material.routes';
import textureRoutes from './texture.routes';
import lightingRoutes from './lighting.routes';
import environmentRoutes from './environment.routes';
import viewerRoutes from './viewer.routes';
import shareRoutes from './share.routes';
import analyticsRoutes from './analytics.routes';
import notificationRoutes from './notification.routes';
import settingsRoutes from './settings.routes';
import adminRoutes from './admin.routes';
import contactRoutes from './contact.routes';
import portfolioRoutes from './portfolio.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/clients', clientRoutes);
router.use('/projects', projectRoutes);
router.use('/rooms', roomRoutes);
router.use('/models', modelRoutes);
router.use('/uploads', uploadRoutes);
router.use('/materials', materialRoutes);
router.use('/textures', textureRoutes);
router.use('/lighting', lightingRoutes);
router.use('/environments', environmentRoutes);
router.use('/viewer', viewerRoutes);
router.use('/shares', shareRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin', adminRoutes);
router.use('/contact', contactRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/public/portfolio', portfolioRoutes);
import { modelController } from '../controllers/models/model.controller';
import { optionalAuthenticate } from '../middleware/auth.middleware';

router.get('/client/models', optionalAuthenticate, modelController.getClientModels);

export default router;
