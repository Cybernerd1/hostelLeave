/**
 * API Request DTOs (Data Transfer Objects)
 *
 * These types define the shape of data sent FROM clients TO the API.
 * They are used for request body validation (paired with Zod schemas in shared-utils).
 */

import type {
  ApprovalAction,
  Gender,
  HostelType,
  LeaveType,
  ParentRelation,
  RoomType,
  UserRole,
} from '../enums';

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ─── Leave ───────────────────────────────────────────────────────────────────

export interface CreateLeaveRequest {
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string;
  destination: string;
}

export interface ApproveLeaveRequest {
  action: ApprovalAction;
  remarks?: string;
}

export interface CancelLeaveRequest {
  reason: string;
}

// ─── Guard ───────────────────────────────────────────────────────────────────

export interface VerifyQRRequest {
  qrData: string;
}

export interface MarkGateRequest {
  leaveRequestId: string;
  remarks?: string;
  location?: string;
}

// ─── Admin: User Management ─────────────────────────────────────────────────

export interface CreateUserRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  email?: string;
  isActive?: boolean;
  role?: UserRole;
}

// ─── Admin: Student ─────────────────────────────────────────────────────────

export interface CreateStudentRequest {
  email: string;
  password: string;
  rollNumber: string;
  name: string;
  phone: string;
  gender: Gender;
  dateOfBirth?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  departmentId: string;
  courseId: string;
  hostelId: string;
  roomId: string;
  parentId?: string;
  year: number;
  semester: string;
  admissionYear: number;
  bloodGroup?: string;
  emergencyContact?: string;
}

export interface UpdateStudentRequest {
  name?: string;
  phone?: string;
  gender?: Gender;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  departmentId?: string;
  courseId?: string;
  hostelId?: string;
  roomId?: string;
  parentId?: string;
  year?: number;
  semester?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  isActive?: boolean;
}

// ─── Admin: Parent ──────────────────────────────────────────────────────────

export interface CreateParentRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  relation: ParentRelation;
  occupation?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface UpdateParentRequest {
  name?: string;
  phone?: string;
  relation?: ParentRelation;
  occupation?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isActive?: boolean;
}

// ─── Admin: Department ──────────────────────────────────────────────────────

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  hodId?: string;
  description?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
  hodId?: string;
  description?: string;
  isActive?: boolean;
}

// ─── Admin: Course ──────────────────────────────────────────────────────────

export interface CreateCourseRequest {
  name: string;
  code: string;
  departmentId: string;
  duration: number;
  totalSemesters: number;
  description?: string;
}

export interface UpdateCourseRequest {
  name?: string;
  code?: string;
  departmentId?: string;
  duration?: number;
  totalSemesters?: number;
  description?: string;
  isActive?: boolean;
}

// ─── Admin: Hostel ──────────────────────────────────────────────────────────

export interface CreateHostelRequest {
  name: string;
  type: HostelType;
  wardenId?: string;
  chiefWardenId?: string;
  address?: string;
  totalRooms: number;
  capacity: number;
  contactNumber?: string;
}

export interface UpdateHostelRequest {
  name?: string;
  type?: HostelType;
  wardenId?: string;
  chiefWardenId?: string;
  address?: string;
  totalRooms?: number;
  capacity?: number;
  contactNumber?: string;
  isActive?: boolean;
}

// ─── Admin: Room ────────────────────────────────────────────────────────────

export interface CreateRoomRequest {
  roomNumber: string;
  hostelId: string;
  floor: string;
  capacity: number;
  type: RoomType;
}

export interface UpdateRoomRequest {
  roomNumber?: string;
  floor?: string;
  capacity?: number;
  type?: RoomType;
  isActive?: boolean;
}

// ─── Admin: Staff Assignment ────────────────────────────────────────────────

export interface CreateStaffRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: UserRole;
}

export interface AssignStaffRequest {
  staffId: string;
}

// ─── Query Parameters ───────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface LeaveFilterQuery extends PaginationQuery {
  status?: string;
  leaveType?: string;
  fromDate?: string;
  toDate?: string;
  studentId?: string;
  hostelId?: string;
  departmentId?: string;
}

export interface StudentFilterQuery extends PaginationQuery {
  departmentId?: string;
  courseId?: string;
  hostelId?: string;
  year?: number;
  isActive?: boolean;
}

export interface GuardLogFilterQuery extends PaginationQuery {
  action?: string;
  fromDate?: string;
  toDate?: string;
  guardId?: string;
}

export interface AuditLogFilterQuery extends PaginationQuery {
  action?: string;
  entity?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}
