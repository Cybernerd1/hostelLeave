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
  DIRECTOR = 'director',
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

/**
 * Gate pass lifecycle status.
 * A gate pass is created when a leave is finally approved and tracks the
 * student's physical movement in and out of the hostel.
 */
export enum GatePassStatus {
  /** Approved leave, student has not yet exited. */
  APPROVED = 'approved',
  /** Student has exited the hostel and not yet returned. */
  OUT_OF_HOSTEL = 'out_of_hostel',
  /** Student has returned to the hostel. */
  RETURNED = 'returned',
  /** Student was expected back but has not returned (derived server-side). */
  OVERDUE = 'overdue',
  /** Gate pass cancelled (e.g. leave cancelled before exit). */
  CANCELLED = 'cancelled',
}

/** Student physical presence within the hostel. */
export enum PresenceStatus {
  IN_HOSTEL = 'in_hostel',
  OUT_OF_HOSTEL = 'out_of_hostel',
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
  GATE_PASS_GENERATED = 'gate_pass_generated',
  STUDENT_OVERDUE = 'student_overdue',
  CALENDAR_UPDATED = 'calendar_updated',
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

/**
 * Academic calendar event classification.
 *
 * `NATIONAL`, `FESTIVAL`, `INSTITUTIONAL`, `VACATION` and `OTHER` are the
 * original values and remain valid (existing records keep working). The
 * remaining values were added to cover the full calendar taxonomy required by
 * the academic calendar module.
 */
export enum HolidayType {
  NATIONAL = 'national',
  FESTIVAL = 'festival',
  INSTITUTIONAL = 'institutional',
  VACATION = 'vacation',
  OTHER = 'other',
  PUBLIC_HOLIDAY = 'public_holiday',
  SEMESTER_BREAK = 'semester_break',
  SUMMER_VACATION = 'summer_vacation',
  WINTER_VACATION = 'winter_vacation',
  EXAMINATION = 'examination',
  WORKING_DAY = 'working_day',
  SPECIAL_HOLIDAY = 'special_holiday',
}

/**
 * Scope of an academic calendar entry. Institution-wide entries apply to
 * everyone; hostel-scoped entries apply only to the named hostel(s).
 */
export enum CalendarScope {
  INSTITUTION = 'institution',
  HOSTEL = 'hostel',
}

/** Classification of a single calendar day relative to a leave request. */
export enum DayClassification {
  WORKING_DAY = 'working_day',
  WEEKEND = 'weekend',
  HOLIDAY = 'holiday',
  VACATION = 'vacation',
  EXAMINATION = 'examination',
}
