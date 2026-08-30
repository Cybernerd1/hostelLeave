/**
 * Auth Routes
 */

import { Router } from 'express';

import * as authController from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { authLimiter } from '../../middleware/rateLimiter.middleware';
import { loginSchema, refreshTokenSchema, changePasswordSchema } from '@hostel/shared-utils';

const router = Router();

// Public routes (with auth rate limiter)
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refreshToken);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, validateBody(changePasswordSchema), authController.changePassword);
router.get('/me', authenticate, authController.getProfile);

export default router;
