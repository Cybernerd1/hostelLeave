/**
 * Hostel Leave Management System - Shared Enums
 *
 * Central enum definitions used across all applications (API, Web, Mobile).
 * These enums represent the core domain values and are stored directly in MongoDB.
 */

/** User roles for RBAC (Role-Based Access Control) */
export enum UserRole {
  STUDENT = 'student',
  PARENT = 'parent',
  WARDEN = 'warden',
  CHIEF_WARDEN = 'chief_warden',
  HOD = 'hod',
  VICE_CHANCELLOR = 'vice_chancellor',
  GUARD = 'guard',
  ADMIN = 'admin',
}

/** Leave request status - tracks the overall state of a leave request */
export enum LeaveStatus {
  DRAFT = 'draft',
  PENDING_PARENT = 'pending_parent',
  PENDING_WARDEN = 'pending_warden',
  PENDING_CHIEF_WARDEN = 'pending_chief_warden',
  PENDING_HOD = 'pending_hod',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
}

/** Leave types categorizing the reason for leave */
export enum LeaveType {
  HOME_VISIT = 'home_visit',
  MEDICAL = 'medical',
  EMERGENCY = 'emergency',
  FUNCTION = 'function',
  ACADEMIC = 'academic',
  PERSONAL = 'personal',
  OTHER = 'other',
}

/** Current approval stage in the workflow pipeline */
export enum ApprovalStage {
  PARENT = 'parent',
  WARDEN = 'warden',
  CHIEF_WARDEN = 'chief_warden',
  HOD = 'hod',
  COMPLETED = 'completed',
}

/** Actions that can be taken on a leave approval */
export enum ApprovalAction {
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** Guard gate actions for tracking entry/exit */
export enum GuardAction {
  EXIT = 'exit',
  ENTRY = 'entry',
}

/** Notification types for categorizing notifications */
export enum NotificationType {
  LEAVE_APPLIED = 'leave_applied',
  LEAVE_APPROVED = 'leave_approved',
  LEAVE_REJECTED = 'leave_rejected',
  LEAVE_STAGE_UPDATE = 'leave_stage_update',
  LEAVE_COMPLETED = 'leave_completed',
  GATE_EXIT = 'gate_exit',
  GATE_ENTRY = 'gate_entry',
  SYSTEM = 'system',
  REMINDER = 'reminder',
}

/** Hostel types */
export enum HostelType {
  BOYS = 'boys',
  GIRLS = 'girls',
  CO_ED = 'co_ed',
}

/** Room types */
export enum RoomType {
  SINGLE = 'single',
  DOUBLE = 'double',
  TRIPLE = 'triple',
  DORMITORY = 'dormitory',
}

/** Audit log action types */
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  APPROVE = 'approve',
  REJECT = 'reject',
  SCAN = 'scan',
  EXPORT = 'export',
  IMPORT = 'import',
}

/** Relationship of parent to student */
export enum ParentRelation {
  FATHER = 'father',
  MOTHER = 'mother',
  GUARDIAN = 'guardian',
}

/** Gender enum */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}
