import { Router } from 'express';
import { uploadController } from '../controllers/uploads/upload.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { initiateUploadSchema, completeUploadSchema, abortUploadSchema } from '../validators/upload.validator';
import { uploadLimiter } from '../middleware/rateLimiter.middleware';

import fs from 'fs';
import path from 'path';

const router = Router();

// Endpoint for local fallback file writes (bypasses auth for local PUT simplicity)
router.put('/local-put', (req, res) => {
  const key = req.query.key as string;
  const uploadId = req.query.uploadId as string;
  const partNumber = req.query.partNumber as string;

  if (!key) {
    res.status(400).send('Missing key');
    return;
  }

  let filePath: string;
  if (uploadId && partNumber) {
    filePath = path.join(__dirname, `../../storage/temp-parts-${uploadId}-${partNumber}`);
  } else {
    filePath = path.join(__dirname, '../../storage', key);
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const writeStream = fs.createWriteStream(filePath);
  req.pipe(writeStream);

  req.on('end', () => {
    res.setHeader('ETag', 'local-mock-etag-' + (partNumber || 'single'));
    res.status(200).send('Uploaded locally');
  });

  req.on('error', (err) => {
    res.status(500).send(err.message);
  });
});

router.use(authenticate);

router.post('/initiate', uploadLimiter, validate(initiateUploadSchema), uploadController.initiateUpload);
router.post('/complete', validate(completeUploadSchema), uploadController.completeUpload);
router.post('/abort', validate(abortUploadSchema), uploadController.abortUpload);
router.post('/stream/:sessionId', uploadController.streamUpload);
router.get('/session/:id', uploadController.getSessionStatus);

export default router;
