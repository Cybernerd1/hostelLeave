/**
 * Presence Routes
 *
 * Routes for student hostel presence monitoring.
 * Protected by authentication and role-based authorization.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { UserRole } from '@hostel/shared-types';
import { presenceController } from './presence.controller';

const router = Router();

// All presence routes require authentication
// Only Admin, Chief Warden, Director, and Warden can access presence data

/**
 * Dashboard Overview - Summary cards
 * GET /api/presence/dashboard-overview?selectedDate=YYYY-MM-DD&hostelId=<optional>
 */
router.get(
  '/dashboard-overview',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.CHIEF_WARDEN, UserRole.DIRECTOR, UserRole.WARDEN),
  presenceController.getDashboardOverview,
);

/**
 * Hostel Statistics - Hostel-wise absence metrics
 * GET /api/presence/hostel-statistics?selectedDate=YYYY-MM-DD&hostelId=<optional>
 */
router.get(
  '/hostel-statistics',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.CHIEF_WARDEN, UserRole.DIRECTOR, UserRole.WARDEN),
  presenceController.getHostelStatistics,
);

/**
 * Currently Outside - Students with no return movement yet
 * GET /api/presence/currently-outside?hostelId=<optional>&page=1&limit=20&search=<optional>
 */
router.get(
  '/currently-outside',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.CHIEF_WARDEN, UserRole.DIRECTOR, UserRole.WARDEN),
  presenceController.getCurrentlyOutside,
);

/**
 * Overdue Students - Students past their expected return time
 * GET /api/presence/overdue-students?hostelId=<optional>&page=1&limit=20&search=<optional>
 */
router.get(
  '/overdue-students',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.CHIEF_WARDEN, UserRole.DIRECTOR, UserRole.WARDEN),
  presenceController.getOverdueStudents,
);

/**
 * Returned Today - Students who exited and returned on the selected date
 * GET /api/presence/returned-today?selectedDate=YYYY-MM-DD&hostelId=<optional>&page=1&limit=20&search=<optional>
 */
router.get(
  '/returned-today',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.CHIEF_WARDEN, UserRole.DIRECTOR, UserRole.WARDEN),
  presenceController.getReturnedToday,
);

/**
 * Daily Absence History - All students absent at any point during the selected date
 * GET /api/presence/daily-absence-history?selectedDate=YYYY-MM-DD&hostelId=<optional>&page=1&limit=20&search=<optional>
 */
router.get(
  '/daily-absence-history',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.CHIEF_WARDEN, UserRole.DIRECTOR, UserRole.WARDEN),
  presenceController.getDailyAbsenceHistory,
);

/**
 * Approved But Not Exited - Students with approved leave but no recorded exit
 * GET /api/presence/approved-not-exited?selectedDate=YYYY-MM-DD&hostelId=<optional>&page=1&limit=20&search=<optional>
 */
router.get(
  '/approved-not-exited',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.CHIEF_WARDEN, UserRole.DIRECTOR, UserRole.WARDEN),
  presenceController.getApprovedNotExited,
);

/**
 * Student Absence Detail - Detailed absence record for a specific student
 * GET /api/presence/student/:studentId?selectedDate=YYYY-MM-DD
 */
router.get(
  '/student/:studentId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.CHIEF_WARDEN, UserRole.DIRECTOR, UserRole.WARDEN),
  presenceController.getStudentAbsenceDetail,
);

export default router;
