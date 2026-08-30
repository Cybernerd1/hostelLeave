/**
 * Hostel Leave Management System - Shared Types
 *
 * Barrel export for all shared type definitions.
 * Import from '@hostel/shared-types' in any workspace package.
 */

// Enums
export {
  UserRole,
  LeaveStatus,
  LeaveType,
  ApprovalStage,
  ApprovalAction,
  GuardAction,
  NotificationType,
  HostelType,
  RoomType,
  AuditAction,
  ParentRelation,
  Gender,
} from './enums';

// Model types
export type {
  IUser,
  IUserSafe,
  IStudent,
  IStudentPopulated,
  IParent,
  IParentPopulated,
  IDepartment,
  IDepartmentBase,
  IDepartmentPopulated,
  ICourse,
  ICourseBase,
  ICoursePopulated,
  IHostel,
  IHostelBase,
  IHostelPopulated,
  IRoom,
  IRoomBase,
  IRoomPopulated,
} from './models/user.types';

export type {
  ILeaveRequest,
  ILeaveRequestPopulated,
  ILeaveApproval,
  ILeaveApprovalPopulated,
  ILeaveTimelineEntry,
  ILeaveStats,
  ILeaveCountByType,
  ILeaveCountByMonth,
  ILeaveCountByDepartment,
  ILeaveCountByHostel,
} from './models/leave.types';

export type {
  IGuardLog,
  IGuardLogPopulated,
  IQRPayload,
  IQRVerificationResult,
} from './models/guard.types';

export type {
  INotification,
  INotificationCount,
} from './models/notification.types';

export type {
  IAuditLog,
  IAuditLogPopulated,
} from './models/audit.types';

// API types
export type {
  // Auth
  LoginRequest,
  RefreshTokenRequest,
  ChangePasswordRequest,
  // Leave
  CreateLeaveRequest,
  ApproveLeaveRequest,
  CancelLeaveRequest,
  // Guard
  VerifyQRRequest,
  MarkGateRequest,
  // Admin
  CreateUserRequest,
  UpdateUserRequest,
  CreateStudentRequest,
  UpdateStudentRequest,
  CreateParentRequest,
  UpdateParentRequest,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  CreateCourseRequest,
  UpdateCourseRequest,
  CreateHostelRequest,
  UpdateHostelRequest,
  CreateRoomRequest,
  UpdateRoomRequest,
  CreateStaffRequest,
  AssignStaffRequest,
  // Query params
  PaginationQuery,
  LeaveFilterQuery,
  StudentFilterQuery,
  GuardLogFilterQuery,
  AuditLogFilterQuery,
} from './api/request.types';

export type {
  ApiResponse,
  ApiErrorResponse,
  ValidationError,
  PaginatedResponse,
  PaginationMeta,
  AuthResponse,
  TokenRefreshResponse,
  DashboardStats,
  ExportResponse,
} from './api/response.types';
