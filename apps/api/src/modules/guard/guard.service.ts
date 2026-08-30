/**
 * Guard Service
 *
 * Handles QR verification, exit/entry marking for gate operations.
 */

import { GuardAction, LeaveStatus, NotificationType } from '@hostel/shared-types';

import { LeaveRequest } from '../../models/leaveRequest.model';
import { GuardLog } from '../../models/guardLog.model';
import { Student } from '../../models/student.model';
import { User } from '../../models/user.model';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { createAuditLog } from '../../middleware/audit.middleware';
import { notificationService } from '../notification/notification.service';
import { qrService } from '../qr/qr.service';
import { buildPaginationMeta } from '../../utils/response.util';

import type { PaginationMeta } from '@hostel/shared-types';
import type { IGuardLogDocument } from '../../models/guardLog.model';

export class GuardService {
  /**
   * Verify a QR code scanned by a guard.
   */
  async verifyQR(qrData: string) {
    return qrService.verifyQR(qrData);
  }

  /**
   * Mark student exit.
   */
  async markExit(
    guardId: string,
    leaveRequestId: string,
    remarks?: string,
    location?: string,
  ): Promise<IGuardLogDocument> {
    const leaveRequest = await LeaveRequest.findById(leaveRequestId);
    if (!leaveRequest) {
      throw AppError.notFound('Leave request not found');
    }

    if (leaveRequest.status !== LeaveStatus.APPROVED) {
      throw AppError.badRequest('Leave is not approved');
    }

    if (leaveRequest.exitTime) {
      throw AppError.badRequest('Exit has already been marked for this leave');
    }

    // Check if leave dates are valid
    const now = new Date();
    const fromDate = new Date(leaveRequest.fromDate);
    fromDate.setHours(0, 0, 0, 0);

    if (now < fromDate) {
      throw AppError.badRequest('Leave period has not started yet');
    }

    // Mark exit
    leaveRequest.exitTime = now;
    leaveRequest.exitGuardId = guardId as unknown as typeof leaveRequest.exitGuardId;
    await leaveRequest.save();

    // Create guard log
    const guardLog = await GuardLog.create({
      guardId,
      leaveRequestId: leaveRequest._id,
      studentId: leaveRequest.studentId,
      action: GuardAction.EXIT,
      timestamp: now,
      location,
      remarks,
    });

    // Notify student
    const student = await Student.findById(leaveRequest.studentId);
    if (student) {
      await notificationService.create({
        userId: student.userId.toString(),
        title: 'Gate Exit Recorded',
        message: `Your exit has been recorded for leave ${leaveRequest.leaveId}.`,
        type: NotificationType.GATE_EXIT,
        referenceId: leaveRequest._id.toString(),
        referenceModel: 'LeaveRequest',
      });
    }

    await createAuditLog({
      userId: guardId,
      action: 'scan',
      entity: 'GuardLog',
      entityId: guardLog._id.toString(),
      description: `Exit marked for leave ${leaveRequest.leaveId}`,
    });

    logger.info(`Exit marked for leave ${leaveRequest.leaveId} by guard ${guardId}`);

    return guardLog;
  }

  /**
   * Mark student entry (return).
   */
  async markEntry(
    guardId: string,
    leaveRequestId: string,
    remarks?: string,
    location?: string,
  ): Promise<IGuardLogDocument> {
    const leaveRequest = await LeaveRequest.findById(leaveRequestId);
    if (!leaveRequest) {
      throw AppError.notFound('Leave request not found');
    }

    if (!leaveRequest.exitTime) {
      throw AppError.badRequest('Exit has not been marked yet');
    }

    if (leaveRequest.entryTime) {
      throw AppError.badRequest('Entry has already been marked for this leave');
    }

    const now = new Date();

    // Mark entry and complete the leave
    leaveRequest.entryTime = now;
    leaveRequest.entryGuardId = guardId as unknown as typeof leaveRequest.entryGuardId;
    leaveRequest.status = LeaveStatus.COMPLETED;
    await leaveRequest.save();

    // Create guard log
    const guardLog = await GuardLog.create({
      guardId,
      leaveRequestId: leaveRequest._id,
      studentId: leaveRequest.studentId,
      action: GuardAction.ENTRY,
      timestamp: now,
      location,
      remarks,
    });

    // Notify student
    const student = await Student.findById(leaveRequest.studentId);
    if (student) {
      await notificationService.create({
        userId: student.userId.toString(),
        title: 'Welcome Back',
        message: `Your entry has been recorded. Leave ${leaveRequest.leaveId} is now completed.`,
        type: NotificationType.GATE_ENTRY,
        referenceId: leaveRequest._id.toString(),
        referenceModel: 'LeaveRequest',
      });
    }

    await createAuditLog({
      userId: guardId,
      action: 'scan',
      entity: 'GuardLog',
      entityId: guardLog._id.toString(),
      description: `Entry marked for leave ${leaveRequest.leaveId}. Leave completed.`,
    });

    logger.info(`Entry marked for leave ${leaveRequest.leaveId}. Leave completed.`);

    return guardLog;
  }

  /**
   * Get guard gate log history.
   */
  async getGateLog(
    guardId: string | undefined,
    query: { page: number; limit: number; action?: string; fromDate?: string; toDate?: string },
  ): Promise<{ data: IGuardLogDocument[]; pagination: PaginationMeta }> {
    const filter: Record<string, unknown> = {};

    if (guardId) {
      filter.guardId = guardId;
    }
    if (query.action) {
      filter.action = query.action;
    }
    if (query.fromDate || query.toDate) {
      filter.timestamp = {};
      if (query.fromDate) {
        (filter.timestamp as Record<string, unknown>).$gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        (filter.timestamp as Record<string, unknown>).$lte = new Date(query.toDate);
      }
    }

    const total = await GuardLog.countDocuments(filter);
    const data = await GuardLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('guardId', 'name')
      .populate({
        path: 'studentId',
        select: 'name rollNumber',
      })
      .populate('leaveRequestId', 'leaveId leaveType fromDate toDate')
      .lean();

    return {
      data: data as unknown as IGuardLogDocument[],
      pagination: buildPaginationMeta(query.page, query.limit, total),
    };
  }
}

export const guardService = new GuardService();
