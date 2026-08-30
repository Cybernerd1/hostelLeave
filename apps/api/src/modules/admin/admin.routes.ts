/**
 * Admin Routes
 */

import { Router } from 'express';

import * as adminController from './admin.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import {
  createStudentSchema,
  updateStudentSchema,
  createParentSchema,
  updateParentSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createCourseSchema,
  updateCourseSchema,
  createHostelSchema,
  updateHostelSchema,
  createRoomSchema,
  updateRoomSchema,
  createStaffSchema,
} from '@hostel/shared-utils';
import { UserRole } from '@hostel/shared-types';

const router = Router();

const ADMIN_ROLES = [UserRole.ADMIN] as const;
const MANAGE_STUDENT_ROLES = [UserRole.ADMIN, UserRole.HOD, UserRole.CHIEF_WARDEN] as const;

// All admin routes require authentication
router.use(authenticate);

// Dashboard
router.get('/dashboard', authorize(...ADMIN_ROLES), adminController.getDashboardStats);

// Students (read + assign-parent also available to HOD & Chief Warden)
router.post('/students', authorize(...ADMIN_ROLES), validateBody(createStudentSchema), adminController.createStudent);
router.get('/students', authorize(...MANAGE_STUDENT_ROLES), adminController.getStudents);
router.get('/students/:id', authorize(...MANAGE_STUDENT_ROLES), adminController.getStudentById);
router.put('/students/:id/assign-parent', authorize(...MANAGE_STUDENT_ROLES), adminController.assignParent);
router.put('/students/:id', authorize(...ADMIN_ROLES), validateBody(updateStudentSchema), adminController.updateStudent);
router.delete('/students/:id', authorize(...ADMIN_ROLES), adminController.deleteStudent);

// Parents
router.post('/parents', authorize(...ADMIN_ROLES), validateBody(createParentSchema), adminController.createParent);
router.get('/parents', authorize(...MANAGE_STUDENT_ROLES), adminController.getParents);
router.put('/parents/:id', authorize(...ADMIN_ROLES), validateBody(updateParentSchema), adminController.updateParent);

// Departments
router.post('/departments', authorize(...ADMIN_ROLES), validateBody(createDepartmentSchema), adminController.createDepartment);
router.get('/departments', authorize(...MANAGE_STUDENT_ROLES), adminController.getDepartments);
router.put('/departments/:id', authorize(...ADMIN_ROLES), validateBody(updateDepartmentSchema), adminController.updateDepartment);

// Courses
router.post('/courses', authorize(...ADMIN_ROLES), validateBody(createCourseSchema), adminController.createCourse);
router.get('/courses', authorize(...MANAGE_STUDENT_ROLES), adminController.getCourses);
router.put('/courses/:id', authorize(...ADMIN_ROLES), validateBody(updateCourseSchema), adminController.updateCourse);

// Hostels
router.post('/hostels', authorize(...ADMIN_ROLES), validateBody(createHostelSchema), adminController.createHostel);
router.get('/hostels', authorize(...MANAGE_STUDENT_ROLES), adminController.getHostels);
router.put('/hostels/:id', authorize(...ADMIN_ROLES), validateBody(updateHostelSchema), adminController.updateHostel);

// Rooms
router.post('/rooms', authorize(...ADMIN_ROLES), validateBody(createRoomSchema), adminController.createRoom);
router.get('/rooms', authorize(...MANAGE_STUDENT_ROLES), adminController.getRooms);
router.put('/rooms/:id', authorize(...ADMIN_ROLES), validateBody(updateRoomSchema), adminController.updateRoom);

// Staff
router.post('/staff', authorize(...ADMIN_ROLES), validateBody(createStaffSchema), adminController.createStaff);
router.get('/staff', authorize(...MANAGE_STUDENT_ROLES), adminController.getStaff);

// Audit Logs
router.get('/audit-logs', authorize(...ADMIN_ROLES), adminController.getAuditLogs);

export default router;
