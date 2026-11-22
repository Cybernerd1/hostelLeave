/**
 * Guard Service
 *
 * Handles QR verification and gate operations (exit / return). Exit and
 * return are recorded against the generated Gate Pass (the authoritative
 * movement record) and mirrored into a GuardLog for the audit trail.
 */

import { GuardAction, LeaveStatus, NotificationType, GatePassStatus } from '@hostel/shared-types';

import { LeaveRequest } from '../../models/leaveRequest.model';
import { GuardLog } from '../../models/guardLog.model';
import { Student } from '../../models/student.model';
import { Parent } from '../../models/parent.model';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { createAuditLog } from '../../middleware/audit.middleware';
import { notificationService } from '../notification/notification.service';
import { qrService } from '../qr/qr.service';
import { gatePassService, serializePass } from './gatePass.service';
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
   * Look up a leave/gate pass for the scan screen by leave id or gate pass
   * number. Returns the leave details plus any existing gate pass state so the
   * guard knows whether to offer Exit or Return.
   */
  async lookupPass(identifier: string) {
    const trimmed = identifier.trim();
    const studentPopulate = {
      path: 'studentId',
      select: 'name rollNumber phone year semester hostelId roomId',
      populate: [
        { path: 'hostelId', select: 'name' },
        { path: 'roomId', select: 'roomNumber' },
      ],
    };

    let leave: Record<string, unknown> | null = null;
    let gatePass = null;

    // 1. Gate pass number (or gate pass Mongo id).
    const passByNumber = await gatePassService.findByIdentifier(trimmed);
    if (passByNumber) {
      gatePass = passByNumber;
      leave = await LeaveRequest.findById(passByNumber.leaveRequestId)
        .populate(studentPopulate)
        .lean() as unknown as Record<string, unknown> | null;
    }

    // 2. Leave id (human-readable or Mongo id).
    if (!leave) {
      leave = await LeaveRequest.findOne(
        trimmed.match(/^[a-f\d]{24}$/i) ? { _id: trimmed } : { leaveId: trimmed },
      )
        .populate(studentPopulate)
        .lean() as unknown as Record<string, unknown> | null;
      if (leave) {
        gatePass = await gatePassService.getByLeaveId(String(leave._id));
      }
    }

    // 3. Student roll number: show their latest approved/active leave.
    if (!leave) {
      const student = await Student.findOne({ rollNumber: trimmed }).select('_id').lean();
      if (student) {
        leave = await LeaveRequest.findOne({
          studentId: student._id,
          status: { $in: [LeaveStatus.APPROVED, LeaveStatus.COMPLETED] },
        })
          .sort({ createdAt: -1 })
          .populate(studentPopulate)
          .lean() as unknown as Record<string, unknown> | null;
        if (leave) {
          gatePass = await gatePassService.getByLeaveId(String(leave._id));
        }
      }
    }

    if (!leave) {
      throw AppError.notFound('Leave pass not found');
    }

    return {
      leave,
      gatePass: gatePass ? serializePass(gatePass) : null,
    };
  }

  /**
   * Mark student exit. Delegates to the gate pass (atomic APPROVED →
   * OUT_OF_HOSTEL) and writes a guard log + notification.
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

    if (leaveRequest.status !== LeaveStatus.APPROVED && leaveRequest.status !== LeaveStatus.COMPLETED) {
      throw AppError.badRequest('Leave is not approved; exit cannot be recorded');
    }

    // Ensure a gate pass exists (should already exist from approval; create if
    // missing for legacy approved leaves).
    let pass = await gatePassService.getByLeaveId(leaveRequest._id.toString());
    if (!pass) {
      pass = await gatePassService.generateForLeave(leaveRequest._id.toString());
    }
    if (!pass) {
      throw AppError.badRequest('Gate pass is not available for this leave');
    }

    if (pass.status === GatePassStatus.RETURNED || pass.actualExitTime) {
      throw AppError.badRequest('Exit has already been recorded for this leave');
    }

    // Prevent exit before the leave start day (institution-local calendar day).
    const now = new Date();
    const fromKey = new Date(leaveRequest.fromDate).toISOString().slice(0, 10);
    if (now.toISOString().slice(0, 10) < fromKey) {
      throw AppError.badRequest('Leave period has not started yet');
    }

    const updatedPass = await gatePassService.recordExit(pass, guardId, remarks);

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
        message: `Your exit has been recorded for leave ${leaveRequest.leaveId}. Gate pass ${updatedPass.gatePassNumber}.`,
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
      description: `Exit marked for leave ${leaveRequest.leaveId} (gate pass ${updatedPass.gatePassNumber})`,
    });

    logger.info(`Exit marked for leave ${leaveRequest.leaveId} by guard ${guardId}`);

    return guardLog;
  }

  /**
   * Mark student entry (return). Delegates to the gate pass (atomic
   * OUT_OF_HOSTEL → RETURNED), requires a recorded exit, and completes the leave.
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

    const pass = await gatePassService.getByLeaveId(leaveRequest._id.toString());
    if (!pass) {
      throw AppError.badRequest('No gate pass found for this leave; cannot record a return');
    }
    if (!pass.actualExitTime) {
      throw AppError.badRequest('Exit has not been recorded yet; cannot record a return');
    }
    if (pass.actualReturnTime) {
      throw AppError.badRequest('Return has already been recorded for this leave');
    }

    const now = new Date();
    const updatedPass = await gatePassService.recordReturn(pass, guardId, remarks);

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
        message: `Your return has been recorded. Leave ${leaveRequest.leaveId} is now completed. Gate pass ${updatedPass.gatePassNumber}.`,
        type: NotificationType.GATE_ENTRY,
        referenceId: leaveRequest._id.toString(),
        referenceModel: 'LeaveRequest',
      });

      // Notify parent/guardian if present.
      if (student.parentId) {
        const parent = await Parent.findById(student.parentId);
        if (parent?.userId) {
          await notificationService.create({
            userId: parent.userId.toString(),
            title: 'Ward Returned',
            message: `${student.name} has returned to the hostel (leave ${leaveRequest.leaveId}).`,
            type: NotificationType.GATE_ENTRY,
            referenceId: leaveRequest._id.toString(),
            referenceModel: 'LeaveRequest',
          });
        }
      }
    }

    await createAuditLog({
      userId: guardId,
      action: 'scan',
      entity: 'GuardLog',
      entityId: guardLog._id.toString(),
      description: `Entry marked for leave ${leaveRequest.leaveId} (gate pass ${updatedPass.gatePassNumber}). Leave completed.`,
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