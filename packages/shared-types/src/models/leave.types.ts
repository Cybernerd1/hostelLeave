/**
 * Leave-related type definitions
 *
 * Types for leave requests, approvals, and the approval workflow.
 */

import type {
  ApprovalAction,
  ApprovalStage,
  LeaveStatus,
  LeaveType,
  UserRole,
} from '../enums';
import type { IStudentPopulated, IUserSafe } from './user.types';

/** Leave request document */
export interface ILeaveRequest {
  _id: string;
  leaveId: string;
  studentId: string;
  leaveType: LeaveType;
  fromDate: Date;
  toDate: Date;
  reason: string;
  destination: string;
  documents: string[];
  status: LeaveStatus;
  currentApprovalStage: ApprovalStage;
  approvals: string[];
  qrToken?: string;
  qrExpiry?: Date;
  exitTime?: Date;
  entryTime?: Date;
  exitGuardId?: string;
  entryGuardId?: string;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Leave request with populated references */
export interface ILeaveRequestPopulated extends ILeaveRequest {
  student?: IStudentPopulated;
  approvalsDetail?: ILeaveApproval[];
  exitGuard?: IUserSafe;
  entryGuard?: IUserSafe;
}

/** Leave approval record - one per approval stage */
export interface ILeaveApproval {
  _id: string;
  leaveRequestId: string;
  approverId: string;
  role: UserRole;
  action: ApprovalAction;
  remarks?: string;
  actionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** Leave approval with populated approver */
export interface ILeaveApprovalPopulated extends ILeaveApproval {
  approver?: IUserSafe;
}

/** Leave timeline entry - for displaying the approval progress */
export interface ILeaveTimelineEntry {
  stage: ApprovalStage | 'applied' | 'exit' | 'entry' | 'completed';
  status: 'completed' | 'current' | 'pending' | 'rejected';
  title: string;
  description?: string;
  actor?: string;
  actorRole?: UserRole;
  remarks?: string;
  timestamp?: Date;
}

/** Leave statistics for dashboards */
export interface ILeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  cancelled: number;
  expired: number;
}

/** Leave count by type */
export interface ILeaveCountByType {
  type: LeaveType;
  count: number;
}

/** Leave count by month */
export interface ILeaveCountByMonth {
  month: string;
  year: number;
  count: number;
}

/** Leave count by department */
export interface ILeaveCountByDepartment {
  departmentId: string;
  departmentName: string;
  count: number;
}

/** Leave count by hostel */
export interface ILeaveCountByHostel {
  hostelId: string;
  hostelName: string;
  count: number;
}
