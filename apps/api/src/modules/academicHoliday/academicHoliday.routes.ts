import { Router } from 'express';
import { UserRole } from '@hostel/shared-types';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { createAcademicHolidaySchema, updateAcademicHolidaySchema } from '@hostel/shared-utils';
import * as controller from './academicHoliday.controller';

const router = Router();
const VIEW_ROLES = [
  UserRole.STUDENT,
  UserRole.PARENT,
  UserRole.WARDEN,
  UserRole.CHIEF_WARDEN,
  UserRole.ADMIN,
  UserRole.DIRECTOR,
  UserRole.GUARD,
] as const;
// Wardens may create hostel-specific entries; scope is enforced in the service.
const MANAGE_ROLES = [UserRole.ADMIN, UserRole.CHIEF_WARDEN, UserRole.WARDEN] as const;

router.use(authenticate);

// View endpoints
router.get('/', authorize(...VIEW_ROLES), controller.listAcademicHolidays);
router.get('/calendar', authorize(...VIEW_ROLES), controller.getCalendarView);
router.get('/summary', authorize(...VIEW_ROLES), controller.getCalendarSummary);
router.get('/classify', authorize(...VIEW_ROLES), controller.classifyAcademicCalendar);

// Management endpoints
router.post(
  '/',
  authorize(...MANAGE_ROLES),
  validateBody(createAcademicHolidaySchema),
  controller.createAcademicHoliday,
);
router.put(
  '/:id',
  authorize(...MANAGE_ROLES),
  validateBody(updateAcademicHolidaySchema),
  controller.updateAcademicHoliday,
);
router.delete('/:id', authorize(...MANAGE_ROLES), controller.deleteAcademicHoliday);

export default router;