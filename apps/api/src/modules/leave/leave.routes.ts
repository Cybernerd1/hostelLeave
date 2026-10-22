
/**
 * Leave Routes
 */

import { Router } from 'express';

import * as leaveController from './leave.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { uploadDocuments } from '../../middleware/upload.middleware';
import { uploadLimiter } from '../../middleware/rateLimiter.middleware';

import {
  createLeaveSchema,
  approveLeaveSchema,
  cancelLeaveSchema,
} from '@hostel/shared-utils';

import { UserRole } from '@hostel/shared-types';

const router = Router();

// ─── Public routes ────────────────────────────────────────────────
router.get('/public/:leaveId', leaveController.getPublicLeaveInfo);

// All routes below require authentication.
router.use(authenticate);

// ─── Role groups ──────────────────────────────────────────────────

// Roles allowed to process approval actions.

const APPROVAL_ROLES = [
  UserRole.PARENT,
  UserRole.WARDEN,
  UserRole.CHIEF_WARDEN,
  UserRole.HOD,
  UserRole.ADMIN,
];

const STATS_ROLES = [
  UserRole.ADMIN,
  UserRole.WARDEN,
  UserRole.CHIEF_WARDEN,
  UserRole.HOD,
  UserRole.DIRECTOR,
];

const ALL_LEAVES_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRECTOR,
  UserRole.WARDEN,
  UserRole.CHIEF_WARDEN,
  UserRole.HOD,
];


// ─── Student routes ───────────────────────────────────────────────
router.post(
  '/',
  authorize(UserRole.STUDENT),
  uploadLimiter,
  uploadDocuments,
  validateBody(createLeaveSchema),
  leaveController.applyLeave,
);

router.get(
  '/my',
  authorize(UserRole.STUDENT),
  leaveController.getMyLeaves,
);

router.put(
  '/:id/cancel',
  authorize(UserRole.STUDENT),
  validateBody(cancelLeaveSchema),
  leaveController.cancelLeave,
);

// ─── Approval routes ──────────────────────────────────────────────
router.get(
  '/pending',
  authorize(...APPROVAL_ROLES),
  leaveController.getPendingLeaves,
);

router.put(
  '/:id/approve',
  authorize(...APPROVAL_ROLES),
  validateBody(approveLeaveSchema),
  leaveController.processApproval,
);

// ─── Statistics ───────────────────────────────────────────────────
router.get(
  '/stats',
  authorize(...STATS_ROLES),
  leaveController.getLeaveStats,
);

// ─── All leaves ──────────────────────────────────────────────────
router.get(
  '/',
  authorize(...ALL_LEAVES_ROLES),
  leaveController.getAllLeaves,
);

// ─── Leave details and PDF ────────────────────────────────────────
router.get('/:id/pdf', leaveController.downloadLeavePDF);
router.get('/:id', leaveController.getLeaveById);

export default router;
