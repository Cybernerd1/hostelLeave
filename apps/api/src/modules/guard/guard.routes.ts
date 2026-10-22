/**
 * Guard Routes
 */

import { Router } from 'express';

import * as guardController from './guard.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { verifyQRSchema, markGateSchema } from '@hostel/shared-utils';
import { UserRole } from '@hostel/shared-types';

const router = Router();

router.use(authenticate);

router.post(
  '/verify',
  authorize(UserRole.GUARD),
  validateBody(verifyQRSchema),
  guardController.verifyQR,
);

router.post(
  '/exit',
  authorize(UserRole.GUARD),
  validateBody(markGateSchema),
  guardController.markExit,
);

router.post(
  '/entry',
  authorize(UserRole.GUARD),
  validateBody(markGateSchema),
  guardController.markEntry,
);

// Unified checkout/entry action from QR scan page
router.post(
  '/scan',
  authorize(UserRole.GUARD),
  guardController.markCheckOut,
);

router.get(
  '/log',
  authorize(UserRole.GUARD, UserRole.ADMIN),
  guardController.getGateLog,
);

router.get(
  '/logs',
  authorize(UserRole.GUARD, UserRole.ADMIN),
  guardController.getGateLog,
);

export default router;
