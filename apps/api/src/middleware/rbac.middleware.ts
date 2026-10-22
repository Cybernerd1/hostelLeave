/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Restricts access to routes based on user roles.
 */

import type { Request, Response, NextFunction } from 'express';

import type { UserRole } from '@hostel/shared-types';

import { AppError } from '../utils/AppError';

/**
 * Authorize access to specific roles only.
 * Must be used AFTER the authenticate middleware.
 *
 * @example
 * router.get('/admin/dashboard', authenticate, authorize(UserRole.ADMIN), controller);
 * router.get('/leaves', authenticate, authorize(UserRole.WARDEN, UserRole.CHIEF_WARDEN), controller);
 */

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        AppError.unauthorized('Authentication required'),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.error('[RBAC DENIED]', {
        method: req.method,
        path: req.originalUrl,
        actualRole: req.user.role,
        allowedRoles,
        userId: req.user.userId,
      });

      return next(
        AppError.forbidden(
          `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
        ),
      );
    }

    next();
  };
}

/**
 * Restrict access so users can only access their own resources.
 * Checks if the route param `:userId` matches the authenticated user's ID.
 * Admins bypass this check.
 */
export function authorizeOwnerOrAdmin(paramName: string = 'userId') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    const targetId = req.params[paramName];

    // Admins can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if the authenticated user is the owner
    if (targetId && targetId !== req.user.userId) {
      return next(AppError.forbidden('You can only access your own resources'));
    }

    next();
  };
}
