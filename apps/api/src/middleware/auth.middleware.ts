/**
 * Authentication Middleware
 *
 * Verifies JWT access tokens and attaches user data to the request.
 */

import type { Request, Response, NextFunction } from 'express';

import type { UserRole } from '@hostel/shared-types';

import { AppError } from '../utils/AppError';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/token.util';
import { User } from '../models/user.model';

/** Extend Express Request to include authenticated user */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

/**
 * Authenticate the request using Bearer JWT token.
 * Attaches `req.user` with { userId, email, role }.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      throw AppError.unauthorized('Access token is required');
    }

    // Verify and decode the token
    const decoded = verifyAccessToken(token);

    // Verify the user still exists and is active
    const user = await User.findById(decoded.userId).select('_id email role isActive').lean();

    if (!user) {
      throw AppError.unauthorized('User no longer exists');
    }

    if (!user.isActive) {
      throw AppError.forbidden('Your account has been deactivated');
    }

    // Attach user to request
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if no token is present.
 * If a valid token is provided, attaches `req.user`.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('_id email role isActive').lean();

      if (user && user.isActive) {
        req.user = {
          userId: user._id.toString(),
          email: user.email,
          role: user.role as UserRole,
        };
      }
    }

    next();
  } catch {
    // Silently proceed without auth
    next();
  }
}
