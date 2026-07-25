import { Router } from 'express';
import { authController } from '../auth/controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  resetPasswordOtpSchema,
  verifyEmailOtpSchema,
  resendOtpSchema,
  sendOtpSchema,
} from '../auth/validators/auth.validator';
import { authenticate } from '../auth/middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/send-otp', authLimiter, validate(sendOtpSchema), authController.sendOtp);
router.post('/register', validate(registerSchema), authController.register);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);

router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.get('/verify-email', authController.verifyEmail);

router.post('/verify-email-otp', validate(verifyEmailOtpSchema), authController.verifyEmailOtp);
router.post('/verify-otp', validate(verifyEmailOtpSchema), authController.verifyOtp); // frontend compat alias
router.post('/reset-password-otp', validate(resetPasswordOtpSchema), authController.resetPasswordOtp);
router.post('/resend-otp', authLimiter, validate(resendOtpSchema), authController.resendOtp);

// User-authenticated endpoints
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.get('/me', authenticate, authController.getMe);

export default router;
