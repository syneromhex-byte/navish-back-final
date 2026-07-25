import { Router } from 'express';
import { contactController } from '../controllers/contact/contact.controller';
import { validate } from '../middleware/validation.middleware';
import { contactInquirySchema } from '../validators/contact.validator';

const router = Router();

// Public contact form submission endpoint
router.post('/', validate(contactInquirySchema), contactController.submitContactInquiry);

export default router;
