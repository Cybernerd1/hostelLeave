/**
 * Auth Controller
 *
 * Request handling only — delegates all business logic to AuthService.
 */

import type { Request, Response } from 'express';

import { authService } from './auth.service';
import { sendSuccess } from '../../utils/response.util';
import { asyncHandler } from '../../middleware/asyncHandler';

/**
 * POST /api/v1/auth/login
 * Authenticate user and return tokens.
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress;

  const result = await authService.login(email, password, ipAddress);

  sendSuccess(res, result, 'Login successful');
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token.
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;

  const result = await authService.refreshTokens(token);

  sendSuccess(res, result, 'Token refreshed successfully');
});

/**
 * POST /api/v1/auth/logout
 * Logout — revoke refresh tokens.
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  await authService.logout(userId);

  sendSuccess(res, null, 'Logged out successfully');
});

/**
 * POST /api/v1/auth/change-password
 * Change user password.
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(userId, currentPassword, newPassword);

  sendSuccess(res, null, 'Password changed successfully');
});

/**
 * GET /api/v1/auth/me
 * Get current user profile.
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;

  const profile = await authService.getProfile(userId, role);

  sendSuccess(res, profile, 'Profile retrieved successfully');
});
