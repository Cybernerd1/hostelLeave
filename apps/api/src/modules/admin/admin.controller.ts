/**
 * Admin Controller
 */

import type { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/asyncHandler';
import { adminService } from './admin.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.util';

// ─── Students ─────────────────────────────────────────────────────────────

export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await adminService.createStudent(req.body, req.user!.userId);
  sendCreated(res, student, 'Student created successfully');
});

export const getStudents = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getStudents({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    search: req.query.search as string,
    departmentId: req.query.departmentId as string,
    hostelId: req.query.hostelId as string,
    isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
  });
  sendPaginated(res, result.data, result.pagination, 'Students retrieved');
});

export const getStudentById = asyncHandler(async (req: Request, res: Response) => {
  const student = await adminService.getStudentById(req.params.id);
  if (!student) { return sendSuccess(res, null, 'Student not found'); }
  sendSuccess(res, student, 'Student retrieved');
});

export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await adminService.updateStudent(req.params.id, req.body, req.user!.userId);
  sendSuccess(res, student, 'Student updated successfully');
});

export const deleteStudent = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deleteStudent(req.params.id, req.user!.userId);
  sendSuccess(res, null, 'Student deactivated successfully');
});

export const assignParent = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.assignParentToStudent(
    req.params.id,
    req.body.parentId,
    req.user!.userId,
  );
  sendSuccess(res, result, 'Parent assigned successfully');
});

/** PUT /api/v1/admin/students/:id/assign-hostel - Assign/unassign hostel (chief warden or admin) */
export const assignHostelToStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await adminService.assignHostelToStudent(
    req.params.id,
    req.body.hostelId ?? null,
    req.user!.userId,
  );
  sendSuccess(res, student, 'Hostel assignment updated successfully');
});

// ─── Parents ──────────────────────────────────────────────────────────────

export const createParent = asyncHandler(async (req: Request, res: Response) => {
  const parent = await adminService.createParent(req.body, req.user!.userId);
  sendCreated(res, parent, 'Parent created successfully');
});

export const getParents = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getParents({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    search: req.query.search as string,
  });
  sendPaginated(res, result.data, result.pagination, 'Parents retrieved');
});

export const updateParent = asyncHandler(async (req: Request, res: Response) => {
  const parent = await adminService.updateParent(req.params.id, req.body, req.user!.userId);
  sendSuccess(res, parent, 'Parent updated successfully');
});

// ─── Departments ──────────────────────────────────────────────────────────

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const dept = await adminService.createDepartment(req.body, req.user!.userId);
  sendCreated(res, dept, 'Department created successfully');
});

export const getDepartments = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getDepartments({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    search: req.query.search as string,
  });
  sendPaginated(res, result.data, result.pagination, 'Departments retrieved');
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const dept = await adminService.updateDepartment(req.params.id, req.body, req.user!.userId);
  sendSuccess(res, dept, 'Department updated successfully');
});

// ─── Courses ──────────────────────────────────────────────────────────────

export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await adminService.createCourse(req.body, req.user!.userId);
  sendCreated(res, course, 'Course created successfully');
});

export const getCourses = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getCourses({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    search: req.query.search as string,
    departmentId: req.query.departmentId as string,
  });
  sendPaginated(res, result.data, result.pagination, 'Courses retrieved');
});

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await adminService.updateCourse(req.params.id, req.body, req.user!.userId);
  sendSuccess(res, course, 'Course updated successfully');
});

// ─── Hostels ──────────────────────────────────────────────────────────────

export const createHostel = asyncHandler(async (req: Request, res: Response) => {
  const hostel = await adminService.createHostel(req.body, req.user!.userId);
  sendCreated(res, hostel, 'Hostel created successfully');
});

export const getHostels = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getHostels({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    search: req.query.search as string,
  });
  sendPaginated(res, result.data, result.pagination, 'Hostels retrieved');
});

export const updateHostel = asyncHandler(async (req: Request, res: Response) => {
  const hostel = await adminService.updateHostel(req.params.id, req.body, req.user!.userId);
  sendSuccess(res, hostel, 'Hostel updated successfully');
});

// ─── Rooms ────────────────────────────────────────────────────────────────

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await adminService.createRoom(req.body, req.user!.userId);
  sendCreated(res, room, 'Room created successfully');
});

export const getRooms = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getRooms({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    hostelId: req.query.hostelId as string,
    search: req.query.search as string,
  });
  sendPaginated(res, result.data, result.pagination, 'Rooms retrieved');
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await adminService.updateRoom(req.params.id, req.body, req.user!.userId);
  sendSuccess(res, room, 'Room updated successfully');
});

// ─── Staff ────────────────────────────────────────────────────────────────

export const createStaff = asyncHandler(async (req: Request, res: Response) => {
  const staff = await adminService.createStaff(req.body, req.user!.userId);
  sendCreated(res, staff, 'Staff member created successfully');
});

export const getStaff = asyncHandler(async (req: Request, res: Response) => {
  const staff = await adminService.getStaff(req.query.role as string);
  sendSuccess(res, staff, 'Staff retrieved');
});

/** POST /api/v1/admin/wardens - Create a warden (chief warden or admin) */
export const createWardenByChiefWarden = asyncHandler(async (req: Request, res: Response) => {
  const data = { ...req.body, role: 'warden' }; // Force role = warden
  const staff = await adminService.createStaff(data, req.user!.userId);
  sendCreated(res, staff, 'Warden created successfully');
});

/** PUT /api/v1/admin/hostels/:id/assign-warden - Assign warden to hostel */
export const assignWardenToHostel = asyncHandler(async (req: Request, res: Response) => {
  const hostel = await adminService.assignWardenToHostel(
    req.params.id,
    req.body.wardenId,
    req.user!.userId,
  );
  sendSuccess(res, hostel, 'Warden assigned to hostel successfully');
});


// ─── Audit Logs ───────────────────────────────────────────────────────────

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getAuditLogs({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    action: req.query.action as string,
    entity: req.query.entity as string,
    userId: req.query.userId as string,
    fromDate: req.query.fromDate as string,
    toDate: req.query.toDate as string,
  });
  sendPaginated(res, result.data, result.pagination, 'Audit logs retrieved');
});

// ─── Dashboard ────────────────────────────────────────────────────────────

export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await adminService.getDashboardStats();
  sendSuccess(res, stats, 'Dashboard stats retrieved');
});
