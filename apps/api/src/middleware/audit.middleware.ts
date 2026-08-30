/**
 * Audit Logging Middleware
 *
 * Automatically logs certain actions for compliance and debugging.
 */

import type { Request, Response, NextFunction } from 'express';

import { AuditLog } from '../models/auditLog.model';
import { logger } from '../utils/logger';

/**
 * Create an audit log entry.
 * Called explicitly from services when important actions occur.
 */
export async function createAuditLog(params: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await AuditLog.create(params);
  } catch (error) {
    // Never let audit logging failure affect the main flow
    logger.error('Failed to create audit log:', error);
  }
}

/**
 * Middleware to automatically extract IP and user agent for audit logging.
 * Attaches helper method to the request.
 */
export function auditContext(req: Request, _res: Response, next: NextFunction): void {
  // Attach audit helper to request for use in controllers/services
  (req as Request & { auditInfo: { ipAddress: string; userAgent: string } }).auditInfo = {
    ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
  };
  next();
}
