import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  deviceId: z.string().optional(),
  deviceInfo: z.string().optional(),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  confirmPassword: z.string().optional(),
  name: z.string().optional(),
  firstName: z.string().optional().default(''),
  lastName: z.string().optional().default(''),
  role: z.enum(['ADMIN', 'ARCHITECT', 'CLIENT']).optional().default('CLIENT'),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const resetPasswordOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().length(6, 'OTP code must be 6 digits'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const verifyEmailOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
  code: z.string().length(6, 'OTP code must be 6 digits'),
});

export const resendOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
  purpose: z.enum(['EMAIL_VERIFICATION', 'PASSWORD_RESET']),
});

export type ResetPasswordOtpDto = z.infer<typeof resetPasswordOtpSchema>;
export type VerifyEmailOtpDto = z.infer<typeof verifyEmailOtpSchema>;
export type ResendOtpDto = z.infer<typeof resendOtpSchema>;

export const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  name: z.string().optional(),
});

export type SendOtpDto = z.infer<typeof sendOtpSchema>;
