/**
 * Admin Controller
 */

import type { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/asyncHandler';
import { adminService } from './admin.service';
import { sendSuccess, sendCreated, sendPaginated, sendError } from '../../utils/response.util';
import * as XLSX from 'xlsx';
import { parse } from 'papaparse';
import fs from 'fs';
import path from 'path';

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

// ─── Student Registration: Manual ───────────────────────────────────────

export const registerStudent = asyncHandler(async (req: Request, res: Response) => {
  const student = await adminService.registerStudent(req.body, req.user!.userId);
  sendCreated(res, student, 'Student application created successfully');
});

// ─── Student Registration: Import ───────────────────────────────────────

export const previewImport = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.previewImport(req.body.records);
  sendSuccess(res, result, 'Import preview generated');
});

export const importStudents = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.importStudents(req.body.records, req.user!.userId);
  sendSuccess(res, result, 'Import completed');
});

// ─── Application Approval Workflow ──────────────────────────────────────

export const getApplications = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getApplications({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    search: req.query.search as string,
    status: req.query.status as string,
    source: req.query.source as string,
    departmentId: req.query.departmentId as string,
    courseId: req.query.courseId as string,
    hostelId: req.query.hostelId as string,
  });
  sendPaginated(res, result.data, result.pagination, 'Applications retrieved');
});

export const getApplicationById = asyncHandler(async (req: Request, res: Response) => {
  const application = await adminService.getApplicationById(req.params.id);
  if (!application) { return sendSuccess(res, null, 'Application not found'); }
  sendSuccess(res, application, 'Application retrieved');
});

export const approveRejectApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await adminService.approveRejectApplication(
    req.params.id,
    req.body,
    req.user!.userId,
  );
  sendSuccess(res, application, `Application ${req.body.action}d successfully`);
});

// ─── Hostel and Room Allocation ─────────────────────────────────────────

export const allocateRoom = asyncHandler(async (req: Request, res: Response) => {
  const student = await adminService.allocateRoom(
    req.params.id,
    req.body,
    req.user!.userId,
  );
  sendSuccess(res, student, 'Room allocated successfully');
});

// ─── Registration Form Management ───────────────────────────────────────

export const createRegistrationForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await adminService.createRegistrationForm(req.body, req.user!.userId);
  sendCreated(res, form, 'Registration form created successfully');
});

export const getRegistrationForms = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getRegistrationForms({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    search: req.query.search as string,
  });
  sendPaginated(res, result.data, result.pagination, 'Registration forms retrieved');
});

export const updateRegistrationForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await adminService.updateRegistrationForm(req.params.id, req.body, req.user!.userId);
  sendSuccess(res, form, 'Registration form updated successfully');
});

// ─── Public Registration ────────────────────────────────────────────────

export const getPublicFormConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await adminService.getPublicFormConfig(req.params.token);
  sendSuccess(res, config, 'Public form config retrieved');
});

export const submitPublicRegistration = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.submitPublicRegistration(req.params.token, req.body);
  sendCreated(res, result, 'Application submitted successfully');
});

// ─── Student Import: File Upload & Templates ──────────────────────────────

export const importFromFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    return sendError(res, 'No file uploaded', 400, 'NO_FILE');
  }

  const filePath = req.file.path;
  const mime = req.file.mimetype;
  let records: Record<string, unknown>[] = [];

  try {
    if (mime === 'text/csv' || mime === 'application/csv') {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const result = (parse as any)(fileContent, {
        header: true,
        skipEmptyLines: true,
        trim: true,
      });
      if (result.errors && result.errors.length > 0) {
        return sendError(res, 'CSV parsing errors', 400, 'CSV_PARSE_ERROR', result.errors.map((e: any) => ({ field: e.field || 'unknown', message: e.message })));
      }
      records = result.data as Record<string, unknown>[];
    } else {
      // Excel file
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      records = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, unknown>[];
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to parse file';
    return sendError(res, message, 400, 'PARSE_ERROR');
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }

  const preview = await adminService.previewImport(records);
  sendSuccess(res, preview, 'File parsed successfully');
});

export const downloadCsvTemplate = asyncHandler(async (_req: Request, res: Response) => {
  const headers = [
    'rollNumber', 'studentNumber', 'name', 'email', 'password', 'phone', 'gender',
    'dateOfBirth', 'address', 'city', 'state', 'pincode', 'departmentId', 'courseId',
    'year', 'semester', 'admissionYear', 'bloodGroup', 'admissionNumber', 'academicSession',
    'fatherName', 'fatherEmail', 'fatherPhone', 'motherName', 'motherEmail', 'motherPhone',
    'guardianAddressLine1', 'guardianAddressLine2', 'guardianCity', 'guardianState',
    'guardianPincode', 'guardianCountry',
  ];
  const sampleRow = [
    '2023CS001', 'STU2023001', 'John Doe', 'john.doe@university.edu', 'Password123',
    '9876543210', 'male', '2005-01-15', '123 Main Street', 'New Delhi', 'Delhi', '110001',
    '', '', '1', '1', '2023', 'B+', '', '2023-2024',
    'Robert Doe', 'robert@email.com', '9876543211', 'Jane Doe', 'jane@email.com', '9876543212',
    '456 Guardian Street', '', 'New Delhi', 'Delhi', '110002', 'India',
  ];

  const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=student_import_template.csv');
  res.send(csvContent);
});

export const downloadExcelTemplate = asyncHandler(async (_req: Request, res: Response) => {
  const headers = [
    'rollNumber', 'studentNumber', 'name', 'email', 'password', 'phone', 'gender',
    'dateOfBirth', 'address', 'city', 'state', 'pincode', 'departmentId', 'courseId',
    'year', 'semester', 'admissionYear', 'bloodGroup', 'admissionNumber', 'academicSession',
    'fatherName', 'fatherEmail', 'fatherPhone', 'motherName', 'motherEmail', 'motherPhone',
    'guardianAddressLine1', 'guardianAddressLine2', 'guardianCity', 'guardianState',
    'guardianPincode', 'guardianCountry',
  ];
  const sampleRow = [
    '2023CS001', 'STU2023001', 'John Doe', 'john.doe@university.edu', 'Password123',
    '9876543210', 'male', '2005-01-15', '123 Main Street', 'New Delhi', 'Delhi', '110001',
    '', '', '1', '1', '2023', 'B+', '', '2023-2024',
    'Robert Doe', 'robert@email.com', '9876543211', 'Jane Doe', 'jane@email.com', '9876543212',
    '456 Guardian Street', '', 'New Delhi', 'Delhi', '110002', 'India',
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=student_import_template.xlsx');
  res.send(buffer);
});
