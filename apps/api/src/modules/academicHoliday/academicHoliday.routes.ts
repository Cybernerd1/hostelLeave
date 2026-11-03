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
] as const;
const MANAGE_ROLES = [UserRole.ADMIN, UserRole.CHIEF_WARDEN] as const;

router.use(authenticate);
router.get('/', authorize(...VIEW_ROLES), controller.listAcademicHolidays);
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
