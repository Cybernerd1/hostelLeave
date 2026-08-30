/**
 * Audit log type definitions
 */

import type { AuditAction } from '../enums';
import type { IUserSafe } from './user.types';

/** Audit log document */
export interface IAuditLog {
  _id: string;
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/** Audit log with populated user */
export interface IAuditLogPopulated extends IAuditLog {
  user?: IUserSafe;
}
