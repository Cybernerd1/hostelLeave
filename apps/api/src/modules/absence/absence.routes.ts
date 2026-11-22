/**
 * Absence Monitoring Routes
 */

import { Router } from 'express';

import * as absenceController from './absence.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { UserRole } from '@hostel/shared-types';

const router = Router();

// All absence monitoring routes require authentication and specific roles
router.use(authenticate);

// Dashboard (all metrics, stats, and student records)
router.get(
  '/dashboard',
  authorize(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHIEF_WARDEN, UserRole.WARDEN),
  absenceController.getDashboard,
);

// Lightweight metrics endpoint
router.get(
  '/metrics',
  authorize(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHIEF_WARDEN, UserRole.WARDEN),
  absenceController.getMetrics,
);

// Hostel-wise statistics
router.get(
  '/hostels',
  authorize(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHIEF_WARDEN, UserRole.WARDEN),
  absenceController.getHostelStats,
);

// Student records by tab
router.get(
  '/students/:tab',
  authorize(UserRole.ADMIN, UserRole.DIRECTOR, UserRole.CHIEF_WARDEN, UserRole.WARDEN),
  absenceController.getStudentRecords,
);

export default router;
