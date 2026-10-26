/**
 * Admin Routes
 */

import { Router } from 'express';

import * as adminController from './admin.controller';
import { authorize } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { optionalAuth } from '../../middleware/auth.middleware';
import { uploadDocuments } from '../../middleware/upload.middleware';
import { uploadCsvExcel } from '../../middleware/upload.middleware';
import {
  createStudentSchema,
  updateStudentSchema,
  registerStudentSchema,
  approveApplicationSchema,
  allocateRoomSchema,
  transferRoomSchema,
  createRegistrationFormSchema,
  updateRegistrationFormSchema,
  publicRegistrationSchema,
  applicationFilterSchema,
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
const CHIEF_WARDEN_ROLES = [UserRole.ADMIN, UserRole.CHIEF_WARDEN] as const;
const STAFF_ROLES = [UserRole.ADMIN, UserRole.CHIEF_WARDEN, UserRole.WARDEN] as const;

// All admin routes use optional auth; public endpoints (optionalAuth) allow unauthenticated access.
// Protected routes are guarded by authorize() which checks req.user.
router.use(optionalAuth);

// Dashboard
router.get('/dashboard', authorize(...ADMIN_ROLES), adminController.getDashboardStats);

// ─── Student Registration: Manual ───────────────────────────────────────
router.post('/students/register', authorize(...STAFF_ROLES), validateBody(registerStudentSchema), adminController.registerStudent);

// ─── Student Registration: Import ───────────────────────────────────────
router.post('/students/import/preview', authorize(...STAFF_ROLES), adminController.previewImport);
router.post('/students/import/file', authorize(...STAFF_ROLES), uploadCsvExcel, adminController.importFromFile);
router.post('/students/import', authorize(...STAFF_ROLES), adminController.importStudents);
router.get('/students/import/template/csv', authorize(...STAFF_ROLES), adminController.downloadCsvTemplate);
router.get('/students/import/template/excel', authorize(...STAFF_ROLES), adminController.downloadExcelTemplate);

// Students (read + assign-parent also available to HOD & Chief Warden)
router.post('/students', authorize(...ADMIN_ROLES), validateBody(createStudentSchema), adminController.createStudent);
router.get('/students', authorize(...MANAGE_STUDENT_ROLES), adminController.getStudents);
router.get('/students/:id', authorize(...MANAGE_STUDENT_ROLES), adminController.getStudentById);
router.put('/students/:id/assign-parent', authorize(...MANAGE_STUDENT_ROLES), adminController.assignParent);
router.put('/students/:id/assign-hostel', authorize(...CHIEF_WARDEN_ROLES), adminController.assignHostelToStudent);
router.put('/students/:id', authorize(...ADMIN_ROLES), validateBody(updateStudentSchema), adminController.updateStudent);
router.delete('/students/:id', authorize(...ADMIN_ROLES), adminController.deleteStudent);

// ─── Application Approval Workflow ──────────────────────────────────────
router.get('/applications', authorize(...STAFF_ROLES), adminController.getApplications);
router.get('/applications/:id', authorize(...STAFF_ROLES), adminController.getApplicationById);
router.post('/applications/:id/approve-reject', authorize(...STAFF_ROLES), validateBody(approveApplicationSchema), adminController.approveRejectApplication);

// ─── Hostel and Room Allocation ─────────────────────────────────────────
router.post('/students/:id/allocate', authorize(...STAFF_ROLES), validateBody(allocateRoomSchema), adminController.allocateRoom);

// ─── Registration Form Management ───────────────────────────────────────
router.post('/registration-forms', authorize(...STAFF_ROLES), validateBody(createRegistrationFormSchema), adminController.createRegistrationForm);
router.get('/registration-forms', authorize(...STAFF_ROLES), adminController.getRegistrationForms);
router.put('/registration-forms/:id', authorize(...STAFF_ROLES), validateBody(updateRegistrationFormSchema), adminController.updateRegistrationForm);

// ─── Public Registration (no auth required) ─────────────────────────────
router.get('/registration-forms/:token/config', optionalAuth, adminController.getPublicFormConfig);
router.post('/registration-forms/:token/submit', optionalAuth, validateBody(publicRegistrationSchema), adminController.submitPublicRegistration);

// Parents
router.post('/parents', authorize(...ADMIN_ROLES), validateBody(createParentSchema), adminController.createParent);
router.get('/parents', authorize(...MANAGE_STUDENT_ROLES), adminController.getParents);
router.put('/parents/:id', authorize(...ADMIN_ROLES), validateBody(updateParentSchema), adminController.updateParent);

// Departments
router.post('/departments', authorize(...ADMIN_ROLES), validateBody(createDepartmentSchema), adminController.createDepartment);
router.get('/departments', optionalAuth, adminController.getDepartments);
router.put('/departments/:id', authorize(...ADMIN_ROLES), validateBody(updateDepartmentSchema), adminController.updateDepartment);

// Courses
router.post('/courses', authorize(...ADMIN_ROLES), validateBody(createCourseSchema), adminController.createCourse);
router.get('/courses', optionalAuth, adminController.getCourses);
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

// Chief Warden management: create warden + assign warden to hostel
router.post('/wardens', authorize(...CHIEF_WARDEN_ROLES), validateBody(createStaffSchema), adminController.createWardenByChiefWarden);
router.put('/hostels/:id/assign-warden', authorize(...CHIEF_WARDEN_ROLES), adminController.assignWardenToHostel);

// Audit Logs
router.get('/audit-logs', authorize(...ADMIN_ROLES), adminController.getAuditLogs);

export default router;
