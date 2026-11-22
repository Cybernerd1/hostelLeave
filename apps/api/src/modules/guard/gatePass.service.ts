/**
 * Gate Pass Service
 *
 * Generates gate passes from finally-approved leaves, records exit/return
 * movements, computes overdue status, and powers the gate-pass dashboard.
 *
 * All status transitions use atomic conditional updates (findOneAndUpdate with
 * an expected-status guard) so they are safe on standalone MongoDB without
 * multi-document transactions.
 */

import { GatePassStatus, LeaveStatus, NotificationType, PresenceStatus } from '@hostel/shared-types';
import { generateRandomString } from '@hostel/shared-utils';

import { computeEffectiveStatus } from './gatePassStatus';

import { GatePass, type IGatePassDocument } from '../../models/gatePass.model';
import { LeaveRequest } from '../../models/leaveRequest.model';
import { Student } from '../../models/student.model';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { createAuditLog } from '../../middleware/audit.middleware';
import { notificationService } from '../notification/notification.service';
import { buildPaginationMeta } from '../../utils/response.util';

import type { PaginationMeta } from '@hostel/shared-types';

/**
 * Gate-pass status derivation lives in ./gatePassStatus so it stays free of
 * model imports and can be unit tested. Re-exported for existing callers.
 */
export { computeEffectiveStatus };

export function serializePass(
  pass: IGatePassDocument | Record<string, unknown>,
) {
  const obj = typeof (pass as IGatePassDocument).toObject === 'function'
    ? (pass as IGatePassDocument).toObject()
    : { ...pass };
  return {
    ...obj,
    effectiveStatus: computeEffectiveStatus(
      obj as unknown as {
        status: GatePassStatus;
        actualReturnTime?: Date | null;
        expectedReturn: Date;
      },
    ),
  };
}

export class GatePassService {
  /**
   * Generate a gate pass for a finally-approved leave. Idempotent: returns the
   * existing pass if one already exists for the leave.
   */
  async generateForLeave(
    leaveRequestId: string,
  ): Promise<IGatePassDocument | null> {
    const existing = await GatePass.findOne({ leaveRequestId });
    if (existing) return existing;

    const leave = await LeaveRequest.findById(leaveRequestId);
    if (!leave) throw AppError.notFound('Leave request not found');

    // A gate pass may only be issued after the leave is finally approved.
    // COMPLETED is accepted for legacy/idempotent calls after a return.
    if (leave.status !== LeaveStatus.APPROVED && leave.status !== LeaveStatus.COMPLETED) {
      throw AppError.badRequest(
        `A gate pass can only be generated for an approved leave (current status: ${leave.status})`,
      );
    }

    const student = await Student.findById(leave.studentId).select('hostelId').lean();
    const hostelId = student?.hostelId
      ? (student.hostelId as unknown as { toString(): string })
      : undefined;

    const pass = await GatePass.create({
      gatePassNumber: `GP-${Date.now().toString(36).toUpperCase()}-${generateRandomString(4).toUpperCase()}`,
      leaveRequestId: leave._id,
      studentId: leave.studentId,
      hostelId: hostelId ? String(hostelId) : undefined,
      status: GatePassStatus.APPROVED,
      approvedDeparture: leave.fromDate,
      expectedReturn: leave.toDate,
    });

    await createAuditLog({
      action: 'create',
      entity: 'GatePass',
      entityId: pass._id.toString(),
      newData: pass.toObject(),
      description: `Gate pass ${pass.gatePassNumber} generated for leave ${leave.leaveId}`,
    });

    logger.info(`Gate pass ${pass.gatePassNumber} generated for leave ${leave.leaveId}`);
    return pass;
  }

  /** Look up a gate pass by its Mongo id or human-readable gate pass number. */
  async findByIdentifier(identifier: string): Promise<IGatePassDocument | null> {
    const isObjectId = /^[a-f\d]{24}$/i.test(identifier);
    return GatePass.findOne(isObjectId ? { _id: identifier } : { gatePassNumber: identifier });
  }

  async getById(id: string): Promise<IGatePassDocument | null> {
    return GatePass.findById(id);
  }

  async getByLeaveId(leaveRequestId: string): Promise<IGatePassDocument | null> {
    return GatePass.findOne({ leaveRequestId });
  }

  /** Populated, serializable view for single-pass API responses. */
  async getByIdDetailed(id: string) {
    const pass = await GatePass.findById(id)
      .populate('studentId', 'name rollNumber phone userId parentId hostelId roomId')
      .populate('hostelId', 'name')
      .populate('leaveRequestId', 'leaveId leaveType fromDate toDate status reason destination')
      .populate('exitVerifiedBy', 'name role')
      .populate('returnVerifiedBy', 'name role')
      .lean();
    return pass ? serializePass(pass as unknown as Record<string, unknown>) : null;
  }

  /** Populated gate pass for a specific leave, for the leave-detail page. */
  async getByLeaveIdDetailed(leaveRequestId: string) {
    const pass = await GatePass.findOne({ leaveRequestId })
      .populate('studentId', 'name rollNumber phone userId parentId hostelId roomId')
      .populate('hostelId', 'name')
      .populate('leaveRequestId', 'leaveId leaveType fromDate toDate status reason destination')
      .populate('exitVerifiedBy', 'name role')
      .populate('returnVerifiedBy', 'name role')
      .lean();
    return pass ? serializePass(pass as unknown as Record<string, unknown>) : null;
  }

  /**
   * Record a student exit against a gate pass. Atomic: only transitions
   * APPROVED → OUT_OF_HOSTEL, never overwrites an existing exit.
   */
  async recordExit(
    pass: IGatePassDocument,
    guardId: string,
    remarks?: string,
  ): Promise<IGatePassDocument> {
    if (pass.actualExitTime) {
      throw AppError.badRequest('Exit has already been recorded for this gate pass');
    }
    const now = new Date();
    const updated = await GatePass.findOneAndUpdate(
      { _id: pass._id, status: GatePassStatus.APPROVED, actualExitTime: null },
      {
        $set: {
          status: GatePassStatus.OUT_OF_HOSTEL,
          actualExitTime: now,
          exitVerifiedBy: guardId,
          exitRemarks: remarks,
        },
      },
      { new: true },
    );
    if (!updated) {
      // Could be a concurrent update or an unexpected state.
      const fresh = await GatePass.findById(pass._id);
      if (fresh?.actualExitTime) {
        throw AppError.badRequest('Exit has already been recorded for this gate pass');
      }
      throw AppError.badRequest('Gate pass is not in a state that allows exit registration');
    }

    // Update student presence + leave exit metadata.
    await Student.updateOne({ _id: pass.studentId }, { $set: { presenceStatus: PresenceStatus.OUT_OF_HOSTEL } });
    await LeaveRequest.updateOne({ _id: pass.leaveRequestId }, { $set: { exitTime: now, exitGuardId: guardId } });

    await createAuditLog({
      userId: guardId,
      action: 'scan',
      entity: 'GatePass',
      entityId: updated._id.toString(),
      description: `Exit recorded for gate pass ${updated.gatePassNumber}`,
    });

    logger.info(`Exit recorded for gate pass ${updated.gatePassNumber} by guard ${guardId}`);
    return updated;
  }

  /**
   * Record a student return against a gate pass. Atomic: only OUT_OF_HOSTEL →
   * RETURNED, and requires a recorded exit.
   */
  async recordReturn(
    pass: IGatePassDocument,
    guardId: string,
    remarks?: string,
  ): Promise<IGatePassDocument> {
    if (!pass.actualExitTime) {
      throw AppError.badRequest('Cannot register a return before an exit is recorded');
    }
    if (pass.actualReturnTime) {
      throw AppError.badRequest('Return has already been recorded for this gate pass');
    }
    const now = new Date();
    const updated = await GatePass.findOneAndUpdate(
      { _id: pass._id, status: GatePassStatus.OUT_OF_HOSTEL, actualReturnTime: null },
      {
        $set: {
          status: GatePassStatus.RETURNED,
          actualReturnTime: now,
          returnVerifiedBy: guardId,
          returnRemarks: remarks,
        },
      },
      { new: true },
    );
    if (!updated) {
      const fresh = await GatePass.findById(pass._id);
      if (fresh?.actualReturnTime) {
        throw AppError.badRequest('Return has already been recorded for this gate pass');
      }
      throw AppError.badRequest('Gate pass is not in a state that allows return registration');
    }

    await Student.updateOne({ _id: pass.studentId }, { $set: { presenceStatus: PresenceStatus.IN_HOSTEL } });
    await LeaveRequest.updateOne(
      { _id: pass.leaveRequestId },
      { $set: { entryTime: now, entryGuardId: guardId, status: 'completed' } },
    );

    await createAuditLog({
      userId: guardId,
      action: 'scan',
      entity: 'GatePass',
      entityId: updated._id.toString(),
      description: `Return recorded for gate pass ${updated.gatePassNumber}`,
    });

    logger.info(`Return recorded for gate pass ${updated.gatePassNumber} by guard ${guardId}`);
    return updated;
  }

  /**
   * Mark a gate pass cancelled (e.g. the underlying leave was cancelled).
   * Never cancels a pass that has already been exited.
   */
  async cancelForLeave(leaveRequestId: string): Promise<void> {
    await GatePass.updateOne(
      { leaveRequestId, status: GatePassStatus.APPROVED, actualExitTime: null },
      { $set: { status: GatePassStatus.CANCELLED, cancelledAt: new Date() } },
    );
  }

  /**
   * Build the base filter for gate-pass lists, combining hostel scope with an
   * optional free-text search over gate-pass number, student name/roll and
   * leave id. Kept server-side so the client cannot widen scope.
   */
  private async buildBaseFilter(
    allowedHostelIds: string[] | null,
    search?: string,
  ): Promise<Record<string, unknown>> {
    const conditions: Record<string, unknown>[] = [];

    if (allowedHostelIds !== null) {
      conditions.push({ hostelId: { $in: allowedHostelIds } });
    }

    if (search) {
      const regex = { $regex: search, $options: 'i' };
      const studentIds = await Student.find({
        $or: [{ name: regex }, { rollNumber: regex }],
      }).distinct('_id');
      const leaveIds = await LeaveRequest.find({ leaveId: regex }).distinct('_id');

      conditions.push({
        $or: [
          { gatePassNumber: regex },
          { studentId: { $in: studentIds } },
          { leaveRequestId: { $in: leaveIds } },
        ],
      });
    }

    return conditions.length > 0 ? { $and: conditions } : {};
  }

  /**
   * Send one-time overdue notifications for out-of-hostel passes whose
   * expected return day has fully elapsed. Safe to call repeatedly.
   */
  async notifyOverdue(allowedHostelIds: string[] | null = null): Promise<void> {
    const filter: Record<string, unknown> = {
      status: GatePassStatus.OUT_OF_HOSTEL,
      actualReturnTime: null,
      expectedReturn: { $lt: new Date() },
      overdueNotifiedAt: { $exists: false },
    };
    if (allowedHostelIds !== null) {
      filter.hostelId = { $in: allowedHostelIds };
    }

    const overdue = await GatePass.find(filter).limit(100);
    for (const pass of overdue) {
      const student = await Student.findById(pass.studentId)
        .select('userId name parentId')
        .populate('parentId', 'userId name')
        .lean();

      if (student?.userId) {
        await notificationService.create({
          userId: String(student.userId),
          title: 'Overdue Return',
          message: `The expected return time for gate pass ${pass.gatePassNumber} has passed. Please return to the hostel or contact the warden.`,
          type: NotificationType.STUDENT_OVERDUE,
          referenceId: pass._id.toString(),
          referenceModel: 'GatePass',
        });
      }

      const parentUserId = (student?.parentId as unknown as { userId?: unknown } | null)?.userId;
      if (parentUserId) {
        await notificationService.create({
          userId: String(parentUserId),
          title: 'Ward Overdue',
          message: `${student?.name ?? 'Your ward'}'s gate pass ${pass.gatePassNumber} is overdue. The expected return time has passed.`,
          type: NotificationType.STUDENT_OVERDUE,
          referenceId: pass._id.toString(),
          referenceModel: 'GatePass',
        });
      }

      await GatePass.updateOne(
        { _id: pass._id, overdueNotifiedAt: { $exists: false } },
        { $set: { overdueNotifiedAt: new Date() } },
      );
    }
  }

  /**
   * Dashboard summary + paginated list, scoped to the actor's hostels.
   * `allowedHostelIds === null` means institution-wide (admin / chief warden).
   */
  async getDashboard(
    allowedHostelIds: string[] | null,
    query: {
      page?: number;
      limit?: number;
      status?: string;
      hostelId?: string;
      studentId?: string;
      search?: string;
      fromDate?: string;
      toDate?: string;
    },
  ): Promise<{ summary: Record<string, number>; data: unknown[]; pagination: PaginationMeta }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    // Best-effort one-time overdue notifications; never block the dashboard.
    try {
      await this.notifyOverdue(allowedHostelIds);
    } catch (err) {
      logger.error('Failed to send overdue notifications:', err);
    }

    const baseFilter = await this.buildBaseFilter(allowedHostelIds, query.search);

    // Summary computed across the whole (scoped) set, ignoring status filter.
    const scoped = await GatePass.find(baseFilter)
      .select('status expectedReturn actualReturnTime hostelId studentId leaveRequestId')
      .populate('studentId', 'name rollNumber')
      .populate('hostelId', 'name')
      .lean();

    const todayKey = new Date().toISOString().slice(0, 10);
    let approved = 0;
    let outOfHostel = 0;
    let returned = 0;
    let overdue = 0;
    let expectedExitsToday = 0;
    let expectedReturnsToday = 0;

    for (const pass of scoped) {
      const effective = computeEffectiveStatus(pass as unknown as { status: GatePassStatus; actualReturnTime?: Date | null; expectedReturn: Date });
      if (effective === GatePassStatus.APPROVED) approved += 1;
      else if (effective === GatePassStatus.OUT_OF_HOSTEL) outOfHostel += 1;
      else if (effective === GatePassStatus.RETURNED) returned += 1;
      else if (effective === GatePassStatus.OVERDUE) overdue += 1;

      const expectedReturn = new Date(pass.expectedReturn);
      if (expectedReturn.toISOString().slice(0, 10) === todayKey && effective === GatePassStatus.OUT_OF_HOSTEL) {
        expectedReturnsToday += 1;
      }
    }

    // Today's expected exits derived from the underlying leave departures.
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);
    expectedExitsToday = await GatePass.countDocuments({
      ...baseFilter,
      approvedDeparture: { $gte: startOfToday, $lt: endOfToday },
      actualExitTime: null,
    });

    const summary = {
      total: scoped.length,
      approved,
      out_of_hostel: outOfHostel,
      returned,
      overdue,
      expected_exits_today: expectedExitsToday,
      expected_returns_today: expectedReturnsToday,
    };

    // Filtered list.
    const filter: Record<string, unknown> = { ...baseFilter };
    if (query.status && query.status !== 'all') {
      if (query.status === GatePassStatus.OVERDUE) {
        // Overdue is derived: out_of_hostel AND expectedReturn passed.
        filter.status = GatePassStatus.OUT_OF_HOSTEL;
        filter.actualReturnTime = null;
        filter.expectedReturn = { $lt: new Date() };
      } else {
        filter.status = query.status;
      }
    }
    if (query.hostelId) filter.hostelId = query.hostelId;
    if (query.studentId) filter.studentId = query.studentId;
    if (query.fromDate || query.toDate) {
      const range: Record<string, Date> = {};
      if (query.fromDate) range.$gte = new Date(query.fromDate);
      if (query.toDate) range.$lte = new Date(query.toDate);
      filter.approvedDeparture = range;
    }

    const total = await GatePass.countDocuments(filter);
    const passes = await GatePass.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('studentId', 'name rollNumber phone')
      .populate('hostelId', 'name')
      .populate('leaveRequestId', 'leaveId fromDate toDate status')
      .lean();

    return {
      summary,
      data: passes.map((p) => serializePass(p as unknown as IGatePassDocument)),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  /**
   * List gate passes visible to a guard (all) or filtered, for the scan log.
   */
  async listForGuard(query: {
    page?: number;
    limit?: number;
    status?: string;
    hostelId?: string;
    studentId?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{ data: unknown[]; pagination: PaginationMeta }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const filter = await this.buildBaseFilter(null, query.search);
    if (query.status && query.status !== 'all') {
      if (query.status === GatePassStatus.OVERDUE) {
        filter.status = GatePassStatus.OUT_OF_HOSTEL;
        filter.actualReturnTime = null;
        filter.expectedReturn = { $lt: new Date() };
      } else {
        filter.status = query.status;
      }
    }
    if (query.fromDate || query.toDate) {
      const range: Record<string, Date> = {};
      if (query.fromDate) range.$gte = new Date(query.fromDate);
      if (query.toDate) range.$lte = new Date(query.toDate);
      filter.approvedDeparture = range;
    }
    if (query.hostelId) filter.hostelId = query.hostelId;
    if (query.studentId) filter.studentId = query.studentId;

    const total = await GatePass.countDocuments(filter);
    const passes = await GatePass.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('studentId', 'name rollNumber phone')
      .populate('hostelId', 'name')
      .populate('leaveRequestId', 'leaveId fromDate toDate status')
      .lean();

    return {
      data: passes.map((p) => serializePass(p as unknown as IGatePassDocument)),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }
}

export const gatePassService = new GatePassService();