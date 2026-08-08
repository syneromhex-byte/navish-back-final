import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { isProduction } from '../../config/env';
import { ApiError } from '../../utils/ApiError';

export class AuthController {
  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body, {
      ip: req.ip,
      deviceInfo: req.headers['user-agent'],
    });

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return ApiResponse.success(res, {
      accessToken: result.accessToken,
      user: result.user,
      expiresIn: result.expiresIn,
    }, 'Login successful');
  });

  sendOtp = asyncHandler(async (req: Request, res: Response) => {
    const { email, name } = req.body as { email: string; name?: string };
    await authService.sendOtp(email, name);
    return ApiResponse.success(res, null, 'OTP sent successfully');
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.register(req.body, { ip: req.ip });
    return ApiResponse.created(res, user, 'Registration successful. Verification email sent.');
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    const result = await authService.refreshTokens(token, {
      ip: req.ip,
      deviceInfo: req.headers['user-agent'],
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.success(res, { accessToken: result.accessToken }, 'Token refreshed');
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (token && req.user) {
      await authService.logout(token, req.user.id);
    }
    res.clearCookie('refreshToken');
    return ApiResponse.success(res, null, 'Logout successful');
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body);
    return ApiResponse.success(res, null, 'Reset link sent if email exists');
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    return ApiResponse.success(res, null, 'Password reset successful');
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const token = req.query.token as string;
    await authService.verifyEmail(token);
    return ApiResponse.success(res, null, 'Email verification successful');
  });

  verifyEmailOtp = asyncHandler(async (req: Request, res: Response) => {
    await authService.verifyEmailOtp(req.body);
    return ApiResponse.success(res, null, 'Email verification successful');
  });

  // Compatibility alias for frontend expecting /verify-otp
  verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    await authService.verifyOtp(req.body);
    return ApiResponse.success(res, null, 'Email verified successfully.');
  });

  resetPasswordOtp = asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPasswordOtp(req.body);
    return ApiResponse.success(res, null, 'Password reset successful');
  });

  resendOtp = asyncHandler(async (req: Request, res: Response) => {
    await authService.resendOtp(req.body);
    return ApiResponse.success(res, null, 'Verification code resent successfully');
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized('Not authenticated');
    await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    return ApiResponse.success(res, null, 'Password changed successfully');
  });

  getMe = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw ApiError.unauthorized('Not authenticated');
    const user = await authService.getMe(req.user.id);
    return ApiResponse.success(res, user, 'User profile retrieved');
  });
}

export const authController = new AuthController();
export default authController;
