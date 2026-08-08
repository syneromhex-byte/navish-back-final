import { UserRole } from '@prisma/client';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  ResetPasswordOtpDto,
  VerifyEmailOtpDto,
  ResendOtpDto,
  SendOtpDto
} from '../validators/auth.validator';

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}

export type {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  ResetPasswordOtpDto,
  VerifyEmailOtpDto,
  ResendOtpDto,
  SendOtpDto,
};
