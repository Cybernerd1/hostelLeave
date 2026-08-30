/**
 * Guard-related type definitions
 *
 * Types for guard gate logs and QR verification.
 */

import type { GuardAction } from '../enums';
import type { ILeaveRequest, ILeaveRequestPopulated } from './leave.types';
import type { IStudent, IUserSafe } from './user.types';

/** Guard gate log document */
export interface IGuardLog {
  _id: string;
  guardId: string;
  leaveRequestId: string;
  studentId: string;
  action: GuardAction;
  timestamp: Date;
  location?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Guard log with populated references */
export interface IGuardLogPopulated extends IGuardLog {
  guard?: IUserSafe;
  leaveRequest?: ILeaveRequest;
  student?: IStudent;
}

/** QR verification payload - encrypted inside the QR code */
export interface IQRPayload {
  leaveId: string;
  studentId: string;
  leaveRequestId: string;
  expiry: string;
  token: string;
}

/** QR verification result returned to the guard */
export interface IQRVerificationResult {
  isValid: boolean;
  message: string;
  leave?: ILeaveRequestPopulated;
  student?: IStudent;
  canExit: boolean;
  canEntry: boolean;
  hasExited: boolean;
  hasReturned: boolean;
}
