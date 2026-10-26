/**
 * Auth Service
 *
 * Business logic for authentication — login, token refresh, logout,
 * and password changes.
 */


import type { UserRole } from '@hostel/shared-types';

import { User, type IUserDocument } from '../../models/user.model';
import { Student } from '../../models/student.model';
import { Parent } from '../../models/parent.model';
import { RefreshToken } from '../../models/refreshToken.model';
import { AppError } from '../../utils/AppError';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  type JWTPayload,
} from '../../utils/token.util';
import { createAuditLog } from '../../middleware/audit.middleware';
import { logger } from '../../utils/logger';

export interface LoginResult {
  user: {
    _id: string;
    email: string;
    role: string;
    isActive: boolean;
    name: string;
    profile?: Record<string, unknown>;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Authenticate a user with email and password.
   */
  async login(email: string, password: string, ipAddress?: string): Promise<LoginResult> {
    // Find user with password field included
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .lean<IUserDocument & { password: string }>();

    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw AppError.forbidden('Your account has been deactivated. Contact the administrator.');
    }

    // Compare passwords directly (plain text)
    const isMatch = password === user.password;

    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    // Generate tokens
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken();

    // Store refresh token in database
    await RefreshToken.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // Load profile data based on role
    const profile = await this.loadProfile(user._id.toString(), user.role as UserRole);

    // Audit log
    await createAuditLog({
      userId: user._id.toString(),
      action: 'login',
      entity: 'User',
      entityId: user._id.toString(),
      description: `User ${user.email} logged in`,
      ipAddress,
    });

    logger.info(`User ${user.email} logged in successfully`);

    return {
      user: {
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        name: user.name,
        profile: profile || undefined,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using a valid refresh token.
   */
  async refreshTokens(refreshTokenStr: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Find the refresh token
    const existingToken = await RefreshToken.findOne({
      token: refreshTokenStr,
      isRevoked: false,
    });

    if (!existingToken) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    if (existingToken.expiresAt < new Date()) {
      await RefreshToken.findByIdAndDelete(existingToken._id);
      throw AppError.unauthorized('Refresh token has expired');
    }

    // Find the user
    const user = await User.findById(existingToken.userId);
    if (!user || !user.isActive) {
      await RefreshToken.findByIdAndDelete(existingToken._id);
      throw AppError.unauthorized('User not found or inactive');
    }

    // Revoke old token
    existingToken.isRevoked = true;
    await existingToken.save();

    // Generate new tokens (token rotation)
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken();

    await RefreshToken.create({
      userId: user._id,
      token: newRefreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout — revoke all refresh tokens for the user.
   */
  async logout(userId: string): Promise<void> {
    await RefreshToken.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true },
    );

    await createAuditLog({
      userId,
      action: 'logout',
      entity: 'User',
      description: 'User logged out',
    });

    logger.info(`User ${userId} logged out`);
  }

  /**
   * Change user password.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw AppError.badRequest('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    // Revoke all refresh tokens to force re-login
    await RefreshToken.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true },
    );

    await createAuditLog({
      userId,
      action: 'update',
      entity: 'User',
      entityId: userId,
      description: 'Password changed',
    });

    logger.info(`User ${userId} changed password`);
  }

  /**
   * Get the current authenticated user's profile.
   */
  async getProfile(userId: string, role: UserRole): Promise<Record<string, unknown> | null> {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const profile = await this.loadProfile(userId, role);

    return {
      ...user,
      profile,
    };
  }

  /**
   * Load role-specific profile data.
   */
  private async loadProfile(
    userId: string,
    role: UserRole,
  ): Promise<Record<string, unknown> | null> {
    switch (role) {
      case 'student': {
        const student = await Student.findOne({ userId })
          .populate('departmentId', 'name code')
          .populate('courseId', 'name code')
          .populate('hostelId', 'name type')
          .populate('roomId', 'roomNumber floor type capacity')
          .lean();
        return student as Record<string, unknown> | null;
      }
      case 'parent': {
        const parent = await Parent.findOne({ userId }).lean();
        return parent as Record<string, unknown> | null;
      }
      default:
        return null;
    }
  }
}

export const authService = new AuthService();
