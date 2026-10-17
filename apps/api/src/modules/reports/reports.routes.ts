/**
 * Reports Routes
 */

import { Router } from 'express';

import * as reportsController from './reports.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { UserRole } from '@hostel/shared-types';

const router = Router();

const allowedRoles = [
  UserRole.ADMIN,
  UserRole.DIRECTOR,
  UserRole.HOD,
  UserRole.WARDEN,
  UserRole.CHIEF_WARDEN,
];

router.use(authenticate, authorize(...allowedRoles));

router.get('/by-type', reportsController.getLeavesByType);
router.get('/by-month', reportsController.getLeavesByMonth);
router.get('/by-department', reportsController.getLeavesByDepartment);
router.get('/by-hostel', reportsController.getLeavesByHostel);
router.get('/gate-activity', reportsController.getTodayGateActivity);
router.get('/status-breakdown', reportsController.getLeaveStatusBreakdown);
router.get('/approval-time', reportsController.getAverageApprovalTime);

export default router;
