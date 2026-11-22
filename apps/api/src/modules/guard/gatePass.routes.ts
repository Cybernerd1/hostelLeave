/**
 * Gate Pass Routes
 *
 * Dashboard + history endpoints. Exit/return registration lives under
 * /guard (see guard.routes). Hostel/ownership scoping is enforced in the
 * controller/service, never from client-supplied ids.
 */

import { Router } from 'express';

import * as controller from './gatePass.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { UserRole } from '@hostel/shared-types';

const router = Router();

/** Roles that may see the institution-wide dashboard / history. */
const DASHBOARD_ROLES = [
  UserRole.ADMIN,
  UserRole.CHIEF_WARDEN,
  UserRole.WARDEN,
  UserRole.GUARD,
] as const;

/** Roles that may read a single pass (ownership is checked in the controller). */
const VIEW_ROLES = [
  ...DASHBOARD_ROLES,
  UserRole.STUDENT,
  UserRole.PARENT,
] as const;

router.use(authenticate);

router.get('/', authorize(...DASHBOARD_ROLES), controller.getGatePassDashboard);
router.get('/history', authorize(...DASHBOARD_ROLES), controller.getGatePassHistory);
router.get('/leave/:leaveId', authorize(...VIEW_ROLES), controller.getGatePassByLeave);
router.get('/:id', authorize(...VIEW_ROLES), controller.getGatePassById);

export default router;
