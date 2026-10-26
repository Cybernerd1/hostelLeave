/**
 * Admin Validation Schemas
 *
 * Zod schemas for admin CRUD operations.
 */

import { z } from 'zod';

import { Gender, HostelType, ParentRelation, RoomType, UserRole } from '@hostel/shared-types';

// ─── Pagination / Query ─────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().optional(),
});

// ─── Student ────────────────────────────────────────────────────────────────

export const createStudentSchema = z.object({
  email: z.string().email('Invalid email').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rollNumber: z
    .string()
    .min(1, 'Roll number is required')
    .max(20, 'Roll number too long')
    .trim(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .trim(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  gender: z.nativeEnum(Gender),
  dateOfBirth: z.string().optional(),
  address: z.string().min(5, 'Address too short').max(300, 'Address too long').trim(),
  city: z.string().min(2, 'City is required').max(100).trim(),
  state: z.string().min(2, 'State is required').max(100).trim(),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  departmentId: z.string().min(1, 'Department is required'),
  courseId: z.string().min(1, 'Course is required'),
  hostelId: z.string().min(1, 'Hostel is required'),
  roomId: z.string().min(1, 'Room is required'),
  parentId: z.string().optional(),
  year: z.coerce.number().int().min(1).max(6),
  semester: z.string().min(1, 'Semester is required').max(10),
  admissionYear: z.coerce.number().int().min(2000).max(2100),
  bloodGroup: z.string().max(5).optional(),
  emergencyContact: z.string().optional(),
});

export const updateStudentSchema = createStudentSchema
  .omit({ email: true, password: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

// ─── Student Registration (Application) ─────────────────────────────────────

export const registerStudentSchema = z.object({
  email: z.string().email('Invalid email').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rollNumber: z.string().min(1, 'Roll number is required').max(20).trim(),
  studentNumber: z.string().max(20).trim().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  gender: z.nativeEnum(Gender),
  dateOfBirth: z.string().optional(),
  address: z.string().min(5, 'Address too short').max(300).trim(),
  city: z.string().min(2, 'City is required').max(100).trim(),
  state: z.string().min(2, 'State is required').max(100).trim(),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  departmentId: z.string().min(1, 'Department is required'),
  courseId: z.string().min(1, 'Course is required'),
  year: z.coerce.number().int().min(1).max(6),
  semester: z.string().min(1, 'Semester is required').max(10),
  admissionYear: z.coerce.number().int().min(2000).max(2100),
  bloodGroup: z.string().max(5).optional(),
  admissionNumber: z.string().max(50).optional(),
  academicSession: z.string().max(20).optional(),
  fatherName: z.string().max(100).optional(),
  fatherEmail: z.string().email('Invalid email').optional(),
  fatherPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional(),
  motherName: z.string().max(100).optional(),
  motherEmail: z.string().email('Invalid email').optional(),
  motherPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional(),
  guardianAddressLine1: z.string().max(150).optional(),
  guardianAddressLine2: z.string().max(150).optional(),
  guardianCity: z.string().max(100).optional(),
  guardianState: z.string().max(100).optional(),
  guardianPincode: z.string().regex(/^\d{6}$/, 'Invalid pincode').optional(),
  guardianCountry: z.string().max(100).optional(),
});

// ─── Application Approval ──────────────────────────────────────────────────

export const approveApplicationSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNotes: z.string().max(500).optional(),
  rejectionReason: z.string().max(500).optional(),
  hostelId: z.string().optional(),
  roomId: z.string().optional(),
}).refine(
  (data) => {
    if (data.action === 'reject' && !data.rejectionReason) {
      return false;
    }
    return true;
  },
  { message: 'Rejection reason is required when rejecting', path: ['rejectionReason'] }
);

// ─── Room Allocation ───────────────────────────────────────────────────────

export const allocateRoomSchema = z.object({
  hostelId: z.string().min(1, 'Hostel is required'),
  roomId: z.string().min(1, 'Room is required'),
  reason: z.string().min(1, 'Reason is required').max(500),
});

export const transferRoomSchema = z.object({
  hostelId: z.string().min(1, 'Hostel is required'),
  roomId: z.string().min(1, 'Room is required'),
  reason: z.string().min(1, 'Reason is required').max(500),
});

// ─── Registration Form ─────────────────────────────────────────────────────

export const createRegistrationFormSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200).trim(),
  description: z.string().max(1000).optional(),
  academicSession: z.string().max(20).optional(),
  expiresAt: z.preprocess(
    (val) => (val === '' || val == null ? undefined : new Date(val as string)),
    z.date().optional(),
  ),
  submissionLimit: z.coerce.number().int().positive().optional(),
  requiredFields: z.array(z.string()).optional(),
});

export const updateRegistrationFormSchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  academicSession: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.preprocess(
    (val) => (val === '' || val == null ? undefined : new Date(val as string)),
    z.date().optional(),
  ),
  submissionLimit: z.coerce.number().int().positive().optional(),
  requiredFields: z.array(z.string()).optional(),
});

// ─── Public Registration ───────────────────────────────────────────────────

export const publicRegistrationSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').max(100).trim(),
  studentNumber: z.string().min(1, 'Student number is required').max(20).trim(),
  admissionNumber: z.string().max(50).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.nativeEnum(Gender),
  bloodGroup: z.string().max(5).optional(),
  phoneNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  email: z.string().email('Invalid email').trim().toLowerCase(),
  city: z.string().min(2, 'City is required').max(100).trim(),
  residentialAddress: z.string().min(5, 'Address too short').max(300).trim(),
  departmentId: z.string().min(1, 'Department is required'),
  courseId: z.string().min(1, 'Course is required'),
  yearOfStudy: z.coerce.number().int().min(1).max(6),
  semester: z.string().min(1, 'Semester is required').max(10),
  admissionYear: z.coerce.number().int().min(2000).max(2100),
  academicSession: z.string().max(20).optional(),
  fatherName: z.string().max(100).optional(),
  fatherEmail: z.string().email('Invalid email').optional(),
  fatherPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional(),
  motherName: z.string().max(100).optional(),
  motherEmail: z.string().email('Invalid email').optional(),
  motherPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional(),
  guardianAddressLine1: z.string().max(150).optional(),
  guardianAddressLine2: z.string().max(150).optional(),
  guardianCity: z.string().max(100).optional(),
  guardianState: z.string().max(100).optional(),
  guardianPincode: z.string().regex(/^\d{6}$/, 'Invalid pincode').optional(),
  guardianCountry: z.string().max(100).optional(),
});

// ─── Application Filter ────────────────────────────────────────────────────

export const applicationFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  departmentId: z.string().optional(),
  courseId: z.string().optional(),
  hostelId: z.string().optional(),
});

// ─── Parent ─────────────────────────────────────────────────────────────────

export const createParentSchema = z.object({
  email: z.string().email('Invalid email').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name is required').max(100).trim(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  relation: z.nativeEnum(ParentRelation),
  occupation: z.string().max(100).optional(),
  address: z.string().min(5, 'Address too short').max(300).trim(),
  city: z.string().min(2).max(100).trim(),
  state: z.string().min(2).max(100).trim(),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
});

export const updateParentSchema = createParentSchema
  .omit({ email: true, password: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

// ─── Department ─────────────────────────────────────────────────────────────

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100).trim(),
  code: z
    .string()
    .min(2, 'Code is required')
    .max(10, 'Code too long')
    .trim()
    .toUpperCase(),
  hodId: z.string().optional(),
  description: z.string().max(500).optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ─── Course ─────────────────────────────────────────────────────────────────

export const createCourseSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100).trim(),
  code: z.string().min(2).max(10).trim().toUpperCase(),
  departmentId: z.string().min(1, 'Department is required'),
  duration: z.coerce.number().int().min(1).max(8),
  totalSemesters: z.coerce.number().int().min(1).max(16),
  description: z.string().max(500).optional(),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ─── Hostel ─────────────────────────────────────────────────────────────────

export const createHostelSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100).trim(),
  type: z.nativeEnum(HostelType),
  wardenId: z.string().optional(),
  chiefWardenId: z.string().optional(),
  address: z.string().max(300).optional(),
  totalRooms: z.coerce.number().int().positive('Total rooms must be positive'),
  capacity: z.coerce.number().int().positive('Capacity must be positive'),
  contactNumber: z.string().optional(),
});

export const updateHostelSchema = createHostelSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ─── Room ───────────────────────────────────────────────────────────────────

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required').max(20).trim(),
  hostelId: z.string().min(1, 'Hostel is required'),
  floor: z.string().min(1, 'Floor is required').max(10).trim(),
  capacity: z.coerce.number().int().min(1).max(20),
  type: z.nativeEnum(RoomType),
});

export const updateRoomSchema = createRoomSchema.omit({ hostelId: true }).partial().extend({
  isActive: z.boolean().optional(),
});

// ─── Staff ──────────────────────────────────────────────────────────────────

export const createStaffSchema = z.object({
  email: z.string().email('Invalid email').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name is required').max(100).trim(),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).refine(
    (role) =>
      [
        UserRole.WARDEN,
        UserRole.CHIEF_WARDEN,
        UserRole.HOD,
        UserRole.DIRECTOR,
        UserRole.GUARD,
      ].includes(role),
    { message: 'Invalid staff role' },
  ),
});

// ─── Guard ──────────────────────────────────────────────────────────────────

export const verifyQRSchema = z.object({
  qrData: z.string({ required_error: 'QR data is required' }).min(1),
});

export const markGateSchema = z.object({
  leaveRequestId: z.string({ required_error: 'Leave request ID is required' }).min(1),
  remarks: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
});

// ─── Type exports ───────────────────────────────────────────────────────────

export type PaginationSchemaType = z.infer<typeof paginationSchema>;
export type CreateStudentSchemaType = z.infer<typeof createStudentSchema>;
export type UpdateStudentSchemaType = z.infer<typeof updateStudentSchema>;
export type RegisterStudentSchemaType = z.infer<typeof registerStudentSchema>;
export type ApproveApplicationSchemaType = z.infer<typeof approveApplicationSchema>;
export type AllocateRoomSchemaType = z.infer<typeof allocateRoomSchema>;
export type TransferRoomSchemaType = z.infer<typeof transferRoomSchema>;
export type CreateRegistrationFormSchemaType = z.infer<typeof createRegistrationFormSchema>;
export type UpdateRegistrationFormSchemaType = z.infer<typeof updateRegistrationFormSchema>;
export type PublicRegistrationSchemaType = z.infer<typeof publicRegistrationSchema>;
export type ApplicationFilterSchemaType = z.infer<typeof applicationFilterSchema>;
export type CreateParentSchemaType = z.infer<typeof createParentSchema>;
export type UpdateParentSchemaType = z.infer<typeof updateParentSchema>;
export type CreateDepartmentSchemaType = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentSchemaType = z.infer<typeof updateDepartmentSchema>;
export type CreateCourseSchemaType = z.infer<typeof createCourseSchema>;
export type UpdateCourseSchemaType = z.infer<typeof updateCourseSchema>;
export type CreateHostelSchemaType = z.infer<typeof createHostelSchema>;
export type UpdateHostelSchemaType = z.infer<typeof updateHostelSchema>;
export type CreateRoomSchemaType = z.infer<typeof createRoomSchema>;
export type UpdateRoomSchemaType = z.infer<typeof updateRoomSchema>;
export type CreateStaffSchemaType = z.infer<typeof createStaffSchema>;
export type VerifyQRSchemaType = z.infer<typeof verifyQRSchema>;
export type MarkGateSchemaType = z.infer<typeof markGateSchema>;
