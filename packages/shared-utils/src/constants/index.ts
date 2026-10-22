/**
 * Application Constants
 *
 * Central configuration constants used across the entire system.
 * These define business rules, role hierarchies, and status transitions.
 */

import {
  ApprovalStage,
  LeaveStatus,
  LeaveType,
  UserRole,
} from '@hostel/shared-types';

/**
 * Role hierarchy for the approval workflow.
 * Each role maps to the leave status it transitions FROM and TO.
 */
export const APPROVAL_WORKFLOW: Record<
  string,
  {
    fromStatus: LeaveStatus;
    toStatusApproved: LeaveStatus;
    toStatusRejected: LeaveStatus;
    stage: ApprovalStage;
    nextStage: ApprovalStage | null;
  }
> = {
  [UserRole.PARENT]: {
    fromStatus: LeaveStatus.PENDING_PARENT,
    toStatusApproved: LeaveStatus.PENDING_WARDEN,
    toStatusRejected: LeaveStatus.REJECTED,
    stage: ApprovalStage.PARENT,
    nextStage: ApprovalStage.WARDEN,
  },
  [UserRole.WARDEN]: {
    fromStatus: LeaveStatus.PENDING_WARDEN,
    toStatusApproved: LeaveStatus.PENDING_CHIEF_WARDEN,
    toStatusRejected: LeaveStatus.REJECTED,
    stage: ApprovalStage.WARDEN,
    nextStage: ApprovalStage.CHIEF_WARDEN,
  },
  [UserRole.CHIEF_WARDEN]: {
    fromStatus: LeaveStatus.PENDING_CHIEF_WARDEN,
    toStatusApproved: LeaveStatus.PENDING_HOD,
    toStatusRejected: LeaveStatus.REJECTED,
    stage: ApprovalStage.CHIEF_WARDEN,
    nextStage: ApprovalStage.HOD,
  },
  [UserRole.HOD]: {
    fromStatus: LeaveStatus.PENDING_HOD,
    toStatusApproved: LeaveStatus.APPROVED,
    toStatusRejected: LeaveStatus.REJECTED,
    stage: ApprovalStage.HOD,
    nextStage: ApprovalStage.COMPLETED,
  },
};

/**
 * Roles that can approve leaves, in order.
 */
export const APPROVAL_ROLES: UserRole[] = [
  UserRole.PARENT,
  UserRole.WARDEN,
  UserRole.CHIEF_WARDEN,
  UserRole.HOD,
];

/**
 * Roles that have access to the web dashboard.
 */
export const WEB_DASHBOARD_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.WARDEN,
  UserRole.CHIEF_WARDEN,
  UserRole.HOD,
  UserRole.DIRECTOR,
  UserRole.GUARD,
  UserRole.STUDENT,
  UserRole.PARENT,
];

/**
 * Roles that can access the mobile app.
 */
export const MOBILE_APP_ROLES: UserRole[] = [
  UserRole.STUDENT,
  UserRole.PARENT,
  UserRole.GUARD,
];

/**
 * Leave type display configuration.
 */
export const LEAVE_TYPE_CONFIG: Record<
  LeaveType,
  {
    label: string;
    description: string;
    color: string;
    requiresDocuments: boolean;
    maxDays: number;
  }
> = {
  [LeaveType.HOME_VISIT]: {
    label: 'Home Visit',
    description: 'Visit home/family',
    color: '#3B82F6',
    requiresDocuments: false,
    maxDays: 14,
  },
  [LeaveType.MEDICAL]: {
    label: 'Medical',
    description: 'Medical reasons or hospital visit',
    color: '#EF4444',
    requiresDocuments: true,
    maxDays: 30,
  },
  [LeaveType.EMERGENCY]: {
    label: 'Emergency',
    description: 'Family or personal emergency',
    color: '#F59E0B',
    requiresDocuments: false,
    maxDays: 7,
  },
  [LeaveType.FUNCTION]: {
    label: 'Function',
    description: 'Family function or event',
    color: '#8B5CF6',
    requiresDocuments: false,
    maxDays: 5,
  },
  [LeaveType.ACADEMIC]: {
    label: 'Academic',
    description: 'Academic event, seminar, or workshop',
    color: '#10B981',
    requiresDocuments: true,
    maxDays: 7,
  },
  [LeaveType.PERSONAL]: {
    label: 'Personal',
    description: 'Personal reasons',
    color: '#6366F1',
    requiresDocuments: false,
    maxDays: 3,
  },
  [LeaveType.OTHER]: {
    label: 'Other',
    description: 'Other reasons',
    color: '#6B7280',
    requiresDocuments: false,
    maxDays: 5,
  },
};

/**
 * Leave status display configuration.
 */
export const LEAVE_STATUS_CONFIG: Record<
  LeaveStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  [LeaveStatus.DRAFT]: {
    label: 'Draft',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    description: 'Leave application saved as draft',
  },
  [LeaveStatus.PENDING_PARENT]: {
    label: 'Pending Parent',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    description: 'Waiting for parent approval',
  },
  [LeaveStatus.PENDING_WARDEN]: {
    label: 'Pending Warden',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    description: 'Waiting for warden approval',
  },
  [LeaveStatus.PENDING_CHIEF_WARDEN]: {
    label: 'Pending Chief Warden',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    description: 'Waiting for chief warden approval',
  },
  [LeaveStatus.PENDING_HOD]: {
    label: 'Pending HOD',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    description: 'Waiting for HOD approval',
  },
  [LeaveStatus.APPROVED]: {
    label: 'Approved',
    color: '#10B981',
    bgColor: '#D1FAE5',
    description: 'Leave has been approved',
  },
  [LeaveStatus.REJECTED]: {
    label: 'Rejected',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    description: 'Leave has been rejected',
  },
  [LeaveStatus.CANCELLED]: {
    label: 'Cancelled',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    description: 'Leave was cancelled by student',
  },
  [LeaveStatus.EXPIRED]: {
    label: 'Expired',
    color: '#9CA3AF',
    bgColor: '#F9FAFB',
    description: 'Leave has expired',
  },
  [LeaveStatus.COMPLETED]: {
    label: 'Completed',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    description: 'Student has returned from leave',
  },
};

/**
 * Role display labels.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.STUDENT]: 'Student',
  [UserRole.PARENT]: 'Parent',
  [UserRole.WARDEN]: 'Warden',
  [UserRole.CHIEF_WARDEN]: 'Chief Warden',
  [UserRole.HOD]: 'Head of Department',
  [UserRole.DIRECTOR]: 'Director',
  [UserRole.GUARD]: 'Security Guard',
  [UserRole.ADMIN]: 'Administrator',
};

/**
 * Sidebar navigation items per role.
 */
export const ROLE_NAVIGATION: Record<
  UserRole,
  Array<{
    label: string;
    path: string;
    icon: string;
  }>
> = {
  [UserRole.STUDENT]: [
    { label: 'Dashboard', path: '/student', icon: 'LayoutDashboard' },
    { label: 'Apply Leave', path: '/student/apply-leave', icon: 'FilePlus' },
    { label: 'My Leaves', path: '/student/leaves', icon: 'FileText' },
    { label: 'Notifications', path: '/student/notifications', icon: 'Bell' },
    { label: 'Profile', path: '/student/profile', icon: 'User' },
  ],
  [UserRole.PARENT]: [
    { label: 'Dashboard', path: '/parent', icon: 'LayoutDashboard' },
    { label: 'My Children', path: '/parent/children', icon: 'Users' },
    { label: 'Pending Leaves', path: '/parent/leaves', icon: 'ClipboardList' },
    { label: 'Leave History', path: '/parent/history', icon: 'History' },
  ],
  [UserRole.WARDEN]: [
    { label: 'Dashboard', path: '/warden', icon: 'LayoutDashboard' },
    { label: 'Pending Leaves', path: '/warden/pending', icon: 'ClipboardList' },
    { label: 'Leave History', path: '/warden/history', icon: 'History' },
  ],
  [UserRole.CHIEF_WARDEN]: [
    { label: 'Dashboard', path: '/chief-warden', icon: 'LayoutDashboard' },
    { label: 'Pending Leaves', path: '/chief-warden/pending', icon: 'ClipboardList' },
    { label: 'Leave History', path: '/chief-warden/history', icon: 'History' },
  ],
  [UserRole.HOD]: [
    { label: 'Dashboard', path: '/hod', icon: 'LayoutDashboard' },
    { label: 'Pending Leaves', path: '/hod/pending', icon: 'ClipboardList' },
    { label: 'Leave History', path: '/hod/history', icon: 'History' },
  ],
  [UserRole.DIRECTOR]: [
    { label: 'Dashboard', path: '/director', icon: 'LayoutDashboard' },
    { label: 'All Leaves', path: '/director/leaves', icon: 'FileText' },
    { label: 'Analytics', path: '/director/analytics', icon: 'BarChart3' },
    { label: 'Reports', path: '/director/reports', icon: 'FileSpreadsheet' },
  ],
  [UserRole.GUARD]: [
    { label: 'Dashboard', path: '/guard', icon: 'LayoutDashboard' },
    { label: 'Scan QR', path: '/guard/scanner', icon: 'QrCode' },
    { label: 'Gate Log', path: '/guard/history', icon: 'History' },
  ],
  [UserRole.ADMIN]: [
    { label: 'Dashboard', path: '/admin', icon: 'LayoutDashboard' },
    { label: 'Students', path: '/admin/students', icon: 'GraduationCap' },
    { label: 'Parents', path: '/admin/parents', icon: 'Users' },
    { label: 'Departments', path: '/admin/departments', icon: 'Building2' },
    { label: 'Courses', path: '/admin/courses', icon: 'BookOpen' },
    { label: 'Hostels', path: '/admin/hostels', icon: 'Hotel' },
    { label: 'Rooms', path: '/admin/rooms', icon: 'DoorOpen' },
    { label: 'Wardens', path: '/admin/wardens', icon: 'ShieldCheck' },
    { label: 'Guards', path: '/admin/guards', icon: 'Shield' },
    { label: 'Reports', path: '/admin/reports', icon: 'BarChart3' },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'ScrollText' },
    { label: 'Settings', path: '/admin/settings', icon: 'Settings' },
  ],
};

/**
 * API pagination defaults.
 */
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
  SORT_BY: 'createdAt',
  SORT_ORDER: 'desc' as const,
};

/**
 * File upload constraints.
 */
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5 MB
  MAX_FILES: 5,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.pdf'],
};

/**
 * Token expiry durations.
 */
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '7d',
  QR_TOKEN_HOURS: 72,
};

/**
 * Rate limiting defaults.
 */
export const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
  },
  FILE_UPLOAD: {
    windowMs: 15 * 60 * 1000,
    max: 20,
  },
};
