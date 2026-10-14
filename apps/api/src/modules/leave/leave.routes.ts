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
import { createLeaveSchema, approveLeaveSchema, cancelLeaveSchema } from '@hostel/shared-utils';
import { UserRole } from '@hostel/shared-types';

const router = Router();

// ─── PUBLIC routes (no auth required) ───────────────────────────────────────
// Guard QR verification page — returns sanitized leave info + gate status
router.get('/public/:leaveId', leaveController.getPublicLeaveInfo);

// ─── Authenticated routes ────────────────────────────────────────────────────
router.use(authenticate);

// Student routes
router.post(
  '/',
  authorize(UserRole.STUDENT),
  uploadLimiter,
  uploadDocuments,
  validateBody(createLeaveSchema),
  leaveController.applyLeave,
);
router.get('/my', authorize(UserRole.STUDENT), leaveController.getMyLeaves);
router.put(
  '/:id/cancel',
  authorize(UserRole.STUDENT),
  validateBody(cancelLeaveSchema),
  leaveController.cancelLeave,
);

// Approval routes (Parent, Warden, Chief Warden, HOD, Admin, VC)
router.get(
  '/pending',
  authorize(UserRole.PARENT, UserRole.WARDEN, UserRole.CHIEF_WARDEN, UserRole.HOD, UserRole.ADMIN, UserRole.VICE_CHANCELLOR),
  leaveController.getPendingLeaves,
);
router.put(
  '/:id/approve',
  authorize(UserRole.PARENT, UserRole.WARDEN, UserRole.CHIEF_WARDEN, UserRole.HOD, UserRole.ADMIN, UserRole.VICE_CHANCELLOR),
  validateBody(approveLeaveSchema),
  leaveController.processApproval,
);

// Stats (Admin, Warden, HOD, VC)
router.get(
  '/stats',
  authorize(UserRole.ADMIN, UserRole.WARDEN, UserRole.CHIEF_WARDEN, UserRole.HOD, UserRole.VICE_CHANCELLOR),
  leaveController.getLeaveStats,
);

// All leaves (Admin, VC)
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.VICE_CHANCELLOR, UserRole.WARDEN, UserRole.CHIEF_WARDEN, UserRole.HOD),
  leaveController.getAllLeaves,
);

// Leave details (all authenticated users)
router.get('/:id/pdf', leaveController.downloadLeavePDF);
router.get('/:id', leaveController.getLeaveById);

export default router;
