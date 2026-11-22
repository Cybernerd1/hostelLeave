/**
 * Leave Service
 *
 * Core business logic for the leave approval workflow.
 * Implements the state machine for leave status transitions.
 */

import mongoose from 'mongoose';

import {
  ApprovalAction,
  ApprovalStage,
  LeaveStatus,
  NotificationType,
  UserRole,
} from '@hostel/shared-types';
import { APPROVAL_WORKFLOW, generateLeaveId } from '@hostel/shared-utils';

import { LeaveRequest, type ILeaveRequestDocument } from '../../models/leaveRequest.model';
import { LeaveApproval } from '../../models/leaveApproval.model';
import { Student } from '../../models/student.model';
import { Parent } from '../../models/parent.model';
import { Hostel } from '../../models/hostel.model';
import { User } from '../../models/user.model';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { createAuditLog } from '../../middleware/audit.middleware';
import { notificationService } from '../notification/notification.service';
import { emailService } from '../email/email.service';
import { qrService } from '../qr/qr.service';
import { gatePassService } from '../guard/gatePass.service';
import { buildPaginationMeta } from '../../utils/response.util';

import type { PaginationMeta } from '@hostel/shared-types';

/**
 * Roles that can approve/reject a leave at ANY pending stage,
 * across all hostels and departments. Their approval is FINAL: it moves the
 * leave straight to APPROVED (or REJECTED) regardless of the current stage,
 * so a chief warden's decision never leaves a leave stuck in a lower queue.
 */
const SUPER_APPROVER_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.CHIEF_WARDEN,
];

/**
 * Maps a pending status to the role whose workflow entry applies at that stage.
 */
const STATUS_TO_STAGE_ROLE: Partial<Record<LeaveStatus, UserRole>> = {
  [LeaveStatus.PENDING_PARENT]: UserRole.PARENT,
  [LeaveStatus.PENDING_WARDEN]: UserRole.WARDEN,
  [LeaveStatus.PENDING_CHIEF_WARDEN]: UserRole.CHIEF_WARDEN,
  [LeaveStatus.PENDING_HOD]: UserRole.HOD,
};

const ALL_PENDING_STATUSES: LeaveStatus[] = [
  LeaveStatus.PENDING_PARENT,
  LeaveStatus.PENDING_WARDEN,
  LeaveStatus.PENDING_CHIEF_WARDEN,
  LeaveStatus.PENDING_HOD,
];

/** MongoDB duplicate-key error (unique index violation). */
function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

export interface LeaveActor {
  userId: string;
  role: UserRole;
}

export class LeaveService {
  /**
   * Apply for a new leave (Student action).
   */
  async applyLeave(
    userId: string,
    data: {
      leaveType: string;
      fromDate: string;
      toDate: string;
      reason: string;
      destination: string;
      attendance?: number;
    },
    documentPaths: string[] = [],
  ): Promise<ILeaveRequestDocument> {
    // Find student profile
    const student = await Student.findOne({ userId }).populate('parentId');
    if (!student) {
      throw AppError.notFound('Student profile not found');
    }

    if (!student.parentId) {
      throw AppError.badRequest('No parent assigned to your profile. Contact admin.');
    }

    // Check for overlapping leaves
    const overlapping = await LeaveRequest.findOne({
      studentId: student._id,
      status: {
        $nin: [LeaveStatus.REJECTED, LeaveStatus.CANCELLED, LeaveStatus.COMPLETED, LeaveStatus.EXPIRED],
      },
      $or: [
        {
          fromDate: { $lte: new Date(data.toDate) },
          toDate: { $gte: new Date(data.fromDate) },
        },
      ],
    });

    if (overlapping) {
      throw AppError.conflict(
        `You already have an active leave (${overlapping.leaveId}) during this period.`,
      );
    }

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      leaveId: generateLeaveId(),
      studentId: student._id,
      leaveType: data.leaveType,
      fromDate: new Date(data.fromDate),
      toDate: new Date(data.toDate),
      reason: data.reason,
      destination: data.destination,
      ...(data.attendance !== undefined ? { attendance: data.attendance } : {}),
      documents: documentPaths,
      status: LeaveStatus.PENDING_PARENT,
      currentApprovalStage: ApprovalStage.PARENT,
    });

    // Get parent user for email notification
    const parent = await Parent.findById(student.parentId);
    if (parent) {
      // Send email to parent
      await emailService.sendLeaveAppliedEmail(parent.email, {
        parentName: parent.name,
        studentName: student.name,
        rollNumber: student.rollNumber,
        leaveType: data.leaveType,
        fromDate: data.fromDate,
        toDate: data.toDate,
        reason: data.reason,
        destination: data.destination,
      });

      // Create notification for parent
      await notificationService.create({
        userId: parent.userId.toString(),
        title: 'Leave Application',
        message: `${student.name} (${student.rollNumber}) has applied for leave from ${data.fromDate} to ${data.toDate}.`,
        type: NotificationType.LEAVE_APPLIED,
        referenceId: leaveRequest._id.toString(),
        referenceModel: 'LeaveRequest',
      });
    }

    // Notify student
    await notificationService.create({
      userId,
      title: 'Leave Applied',
      message: `Your leave application ${leaveRequest.leaveId} has been submitted and is pending parent approval.`,
      type: NotificationType.LEAVE_APPLIED,
      referenceId: leaveRequest._id.toString(),
      referenceModel: 'LeaveRequest',
    });

    // Audit log
    await createAuditLog({
      userId,
      action: 'create',
      entity: 'LeaveRequest',
      entityId: leaveRequest._id.toString(),
      newData: leaveRequest.toObject(),
      description: `Leave ${leaveRequest.leaveId} applied`,
    });

    logger.info(`Leave ${leaveRequest.leaveId} applied by student ${student.rollNumber}`);

    return leaveRequest;
  }

  /**
   * Approve or reject a leave at the current approval stage.
   *
   * Rules:
   *  - Admin and Chief Warden are "super approvers": they may act at ANY pending
   *    stage for ANY student, and their decision is FINAL. A chief warden
   *    approval moves the leave straight to APPROVED (never leaves it in a lower
   *    warden/pending queue); a rejection is final REJECTED.
   *  - Warden and Parent act only at their own stage and only for their scope.
   *  - Duplicate decisions at the same stage for the same role are rejected.
   *  - Already rejected/cancelled/approved leaves cannot be actioned again.
   */
  async processApproval(
    leaveRequestId: string,
    approverId: string,
    approverRole: UserRole,
    action: ApprovalAction,
    remarks?: string,
  ): Promise<ILeaveRequestDocument> {
    const leaveRequest = await LeaveRequest.findById(leaveRequestId)
      .populate('studentId');

    if (!leaveRequest) {
      throw AppError.notFound('Leave request not found');
    }

    const currentStatus = leaveRequest.status as LeaveStatus;
    if (!ALL_PENDING_STATUSES.includes(currentStatus)) {
      throw AppError.badRequest(
        `This leave is not pending approval (current status: ${currentStatus}). It may already be approved, rejected or cancelled.`,
      );
    }

    const isSuperApprover = SUPER_APPROVER_ROLES.includes(approverRole);

    // ── Resolve the workflow transition ──────────────────────────────
    let toApproved: LeaveStatus;
    let nextStage: ApprovalStage;

    if (isSuperApprover) {
      // Super approvers finalize immediately, regardless of current stage.
      toApproved = LeaveStatus.APPROVED;
      nextStage = ApprovalStage.COMPLETED;
    } else {
      const stageRole = STATUS_TO_STAGE_ROLE[currentStatus];
      const workflow = stageRole ? APPROVAL_WORKFLOW[stageRole] : undefined;
      if (!workflow) {
        throw AppError.badRequest(
          `This leave is not awaiting your role's approval (current stage: ${currentStatus}).`,
        );
      }
      // Non-super-approver roles must be acting at their own stage.
      if (stageRole !== approverRole) {
        throw AppError.badRequest('This leave is not awaiting approval at your stage.');
      }
      toApproved = workflow.toStatusApproved;
      nextStage = workflow.nextStage ?? ApprovalStage.COMPLETED;
    }

    // ── Authorization scope ──────────────────────────────────────────
    const studentDoc = (leaveRequest.studentId as any)?._id
      ? (leaveRequest.studentId as any)
      : await Student.findById(leaveRequest.studentId);

    // Warden: verify the student belongs to one of their hostels.
    if (approverRole === UserRole.WARDEN) {
      const wardenHostels = await Hostel.find({ wardenId: approverId }).select('_id').lean();
      const wardenHostelIds = wardenHostels.map((h) => String(h._id));
      const studentHostelId = studentDoc?.hostelId ? String(studentDoc.hostelId) : null;
      if (wardenHostelIds.length === 0 || !studentHostelId || !wardenHostelIds.includes(studentHostelId)) {
        throw AppError.forbidden('This student is not in your hostel');
      }
    }

    // Parent: verify this is their child.
    if (approverRole === UserRole.PARENT) {
      const parent = await Parent.findOne({ userId: approverId }).select('_id').lean();
      if (!parent) {
        throw AppError.forbidden('Parent profile not found');
      }
      const studentParentId = studentDoc?.parentId?._id
        ? String(studentDoc.parentId._id)
        : studentDoc?.parentId
          ? String(studentDoc.parentId)
          : null;
      if (!studentParentId || parent._id.toString() !== studentParentId) {
        throw AppError.forbidden('This is not your child\'s leave request');
      }
    }

    // ── Prevent duplicate decisions for the same role ────────────────
    const existingApproval = await LeaveApproval.exists({
      leaveRequestId: leaveRequest._id,
      role: approverRole,
    });
    if (existingApproval) {
      throw AppError.conflict(
        'You have already actioned this leave request. Refresh to see the latest status.',
      );
    }

    // ── Record the approval action ───────────────────────────────────
    // The compound unique index (leaveRequestId, role) is the final guard
    // against two concurrent decisions by the same role.
    let approvalId: mongoose.Types.ObjectId;
    const stageBypassed = isSuperApprover && currentStatus !== STATUS_TO_STAGE_ROLE[currentStatus];
    try {
      const approval = await LeaveApproval.create({
        leaveRequestId: leaveRequest._id,
        approverId,
        role: approverRole,
        action,
        remarks,
        actionDate: new Date(),
        stageBypassed: isSuperApprover && currentStatus !== LeaveStatus.PENDING_CHIEF_WARDEN,
        bypassedFromStatus: stageBypassed ? currentStatus : undefined,
      });
      approvalId = approval._id as mongoose.Types.ObjectId;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw AppError.conflict(
          'You have already actioned this leave request. Refresh to see the latest status.',
        );
      }
      throw err;
    }

    // ── Atomically advance the leave only if it is still at the stage we
    // authorized. This prevents two approvers from both advancing it.
    const nextStatus = action === ApprovalAction.REJECTED
      ? LeaveStatus.REJECTED
      : toApproved;

    const updated = await LeaveRequest.findOneAndUpdate(
      { _id: leaveRequest._id, status: currentStatus },
      {
        $set: {
          status: nextStatus,
          currentApprovalStage:
            action === ApprovalAction.REJECTED ? ApprovalStage.COMPLETED : nextStage,
        },
        $push: { approvals: approvalId },
      },
      { new: true },
    ).populate('studentId');

    if (!updated) {
      // Lost the race: remove the approval record we just wrote so the
      // audit trail stays consistent, then tell the caller to refresh.
      await LeaveApproval.deleteOne({ _id: approvalId });
      throw AppError.badRequest(
        'This leave was updated by someone else. Refresh and try again.',
      );
    }

    // If fully approved, generate QR code AND a gate pass.
    if (updated.status === LeaveStatus.APPROVED) {
      try {
        const qrData = await qrService.generateQR(updated);
        updated.qrToken = qrData.token;
        updated.qrExpiry = qrData.expiry;
        await LeaveRequest.updateOne(
          { _id: updated._id },
          { $set: { qrToken: qrData.token, qrExpiry: qrData.expiry } },
        );
        logger.info(`QR code generated for leave ${updated.leaveId}`);
      } catch (err) {
        logger.error(`Failed to generate QR for leave ${updated.leaveId}:`, err);
      }

      // Generate the gate pass (idempotent). A failure here must not roll back
      // the approval, but is logged.
      try {
        const pass = await gatePassService.generateForLeave(updated._id.toString());
        if (pass) {
          logger.info(
            `Gate pass ${pass.gatePassNumber} generated for leave ${updated.leaveId}`,
          );
        }
      } catch (err) {
        logger.error(
          `Failed to generate gate pass for leave ${updated.leaveId}:`,
          err,
        );
      }
    }

    // ── Notifications ────────────────────────────────────────────────
    const student = studentDoc;
    if (student) {
      const studentUser = await User.findById(student.userId);

      if (action === ApprovalAction.REJECTED) {
        if (studentUser) {
          await notificationService.create({
            userId: studentUser._id.toString(),
            title: 'Leave Rejected',
            message: `Your leave ${updated.leaveId} has been rejected by ${approverRole}. ${remarks ? `Reason: ${remarks}` : ''}`,
            type: NotificationType.LEAVE_REJECTED,
            referenceId: updated._id.toString(),
            referenceModel: 'LeaveRequest',
          });

          await emailService.sendLeaveRejectedEmail(studentUser.email, {
            studentName: student.name,
            leaveId: updated.leaveId,
            rejectedBy: approverRole,
            remarks: remarks || 'No remarks provided',
          });
        }
      } else if (studentUser) {
        const statusLabel = updated.status === LeaveStatus.APPROVED
          ? 'fully approved'
          : `approved by ${approverRole}`;

        await notificationService.create({
          userId: studentUser._id.toString(),
          title: 'Leave Update',
          message: `Your leave ${updated.leaveId} has been ${statusLabel}.`,
          type: updated.status === LeaveStatus.APPROVED
            ? NotificationType.LEAVE_APPROVED
            : NotificationType.LEAVE_STAGE_UPDATE,
          referenceId: updated._id.toString(),
          referenceModel: 'LeaveRequest',
        });

        if (updated.status === LeaveStatus.APPROVED) {
          // Notify parent/guardian when notification support exists.
          if (student.parentId) {
            const parent = await Parent.findById(student.parentId);
            if (parent?.userId) {
              await notificationService.create({
                userId: parent.userId.toString(),
                title: 'Leave Approved',
                message: `${student.name}'s leave ${updated.leaveId} has been approved.`,
                type: NotificationType.LEAVE_APPROVED,
                referenceId: updated._id.toString(),
                referenceModel: 'LeaveRequest',
              });
            }
          }

          await emailService.sendLeaveApprovedEmail(studentUser.email, {
            studentName: student.name,
            leaveId: updated.leaveId,
            fromDate: updated.fromDate.toISOString(),
            toDate: updated.toDate.toISOString(),
          });
        }
      }
    }

    // ── Audit log ────────────────────────────────────────────────────
    await createAuditLog({
      userId: approverId,
      action: action === ApprovalAction.APPROVED ? 'approve' : 'reject',
      entity: 'LeaveRequest',
      entityId: updated._id.toString(),
      description: `Leave ${updated.leaveId} ${action} by ${approverRole} (final status: ${updated.status})`,
    });

    logger.info(
      `Leave ${updated.leaveId} ${action} by ${approverRole} (${approverId}) → ${updated.status}`,
    );

    return updated;
  }

  /**
   * Cancel a leave request (Student action).
   */
  async cancelLeave(
    leaveRequestId: string,
    userId: string,
    reason: string,
  ): Promise<ILeaveRequestDocument> {
    const student = await Student.findOne({ userId });
    if (!student) {
      throw AppError.notFound('Student profile not found');
    }

    const leaveRequest = await LeaveRequest.findOne({
      _id: leaveRequestId,
      studentId: student._id,
    });

    if (!leaveRequest) {
      throw AppError.notFound('Leave request not found');
    }

    // Can only cancel if not already completed, cancelled, or expired
    const nonCancellableStatuses = [
      LeaveStatus.COMPLETED,
      LeaveStatus.CANCELLED,
      LeaveStatus.EXPIRED,
    ];

    if (nonCancellableStatuses.includes(leaveRequest.status)) {
      throw AppError.badRequest(`Cannot cancel a leave with status: ${leaveRequest.status}`);
    }

    // Cannot cancel if already exited
    if (leaveRequest.exitTime) {
      throw AppError.badRequest('Cannot cancel a leave after exit has been marked');
    }

    leaveRequest.status = LeaveStatus.CANCELLED;
    leaveRequest.cancelledAt = new Date();
    leaveRequest.cancelReason = reason;
    await leaveRequest.save();

    // If a gate pass was already generated (leave was approved), cancel it too.
    try {
      await gatePassService.cancelForLeave(leaveRequest._id.toString());
    } catch (err) {
      logger.error('Failed to cancel gate pass on leave cancellation:', err);
    }

    await createAuditLog({
      userId,
      action: 'update',
      entity: 'LeaveRequest',
      entityId: leaveRequest._id.toString(),
      description: `Leave ${leaveRequest.leaveId} cancelled`,
    });

    return leaveRequest;
  }

  /**
   * Enforce that an actor may view a specific leave request.
   *
   * - Student: only their own leave.
   * - Parent: only their child's leave.
   * - Warden: only students in an assigned hostel.
   * - Admin / Chief Warden / Guard / HOD / Director: institution-wide.
   *
   * Never trusts a hostel id supplied by the client; scope is derived from
   * the authenticated user's server-side relationships.
   */
  async assertCanViewLeave(leaveRequestId: string, actor: LeaveActor): Promise<void> {
    const leave = await LeaveRequest.findById(leaveRequestId)
      .select('studentId')
      .lean();
    if (!leave) {
      throw AppError.notFound('Leave request not found');
    }

    const student = await Student.findById(leave.studentId)
      .select('userId parentId hostelId')
      .lean();
    if (!student) {
      throw AppError.notFound('Student profile not found');
    }

    switch (actor.role) {
      case UserRole.STUDENT:
        if (String(student.userId) !== actor.userId) {
          throw AppError.forbidden('You can only view your own leave requests');
        }
        return;
      case UserRole.PARENT: {
        const parent = await Parent.findOne({ userId: actor.userId }).select('_id').lean();
        if (!parent || String(student.parentId) !== String(parent._id)) {
          throw AppError.forbidden('You can only view your child\'s leave requests');
        }
        return;
      }
      case UserRole.WARDEN: {
        const hostels = await Hostel.find({ wardenId: actor.userId }).select('_id').lean();
        const ids = hostels.map((h) => String(h._id));
        if (!student.hostelId || !ids.includes(String(student.hostelId))) {
          throw AppError.forbidden('This leave belongs to a student outside your hostel');
        }
        return;
      }
      case UserRole.ADMIN:
      case UserRole.CHIEF_WARDEN:
      case UserRole.GUARD:
      case UserRole.HOD:
      case UserRole.DIRECTOR:
        return;
      default:
        throw AppError.forbidden('Your role cannot view leave requests');
    }
  }

  /**
   * Get a single leave request by ID with all populated fields and enriched approval data.
   * When `actor` is supplied, view authorization is enforced.
   * 
   * Enriches approval records with bypass information for frontend workflow visualization.
   */
  async getLeaveById(
    leaveRequestId: string,
    actor?: LeaveActor,
  ): Promise<ILeaveRequestDocument | null> {
    if (actor) {
      await this.assertCanViewLeave(leaveRequestId, actor);
    }
    const leave = await LeaveRequest.findById(leaveRequestId)
      .populate({
        path: 'studentId',
        select: 'name rollNumber phone userId departmentId courseId hostelId roomId',
        populate: [
          { path: 'departmentId', select: 'name code' },
          { path: 'courseId', select: 'name code' },
          { path: 'hostelId', select: 'name type' },
          { path: 'roomId', select: 'roomNumber floor' },
        ],
      })
      .populate({
        path: 'approvals',
        populate: { path: 'approverId', select: 'name email role' },
      })
      .populate('exitGuardId', 'name')
      .populate('entryGuardId', 'name');

    // Enrich approval data with bypass information for frontend
    if (leave && Array.isArray((leave as any).approvals)) {
      (leave as any).approvals = (leave as any).approvals.map((approval: any) => ({
        ...approval.toObject?.() || approval,
        stageBypassed: approval.stageBypassed || false,
        bypassedFromStatus: approval.bypassedFromStatus || null,
      }));
    }

    return leave;
  }

  /**
   * Get leaves for a student.
   */
  async getStudentLeaves(
    userId: string,
    query: { page: number; limit: number; status?: string; sortOrder?: string },
  ): Promise<{ data: ILeaveRequestDocument[]; pagination: PaginationMeta }> {
    const student = await Student.findOne({ userId });
    if (!student) {
      throw AppError.notFound('Student profile not found');
    }

    const filter: Record<string, unknown> = { studentId: student._id };
    if (query.status) {
      filter.status = query.status;
    }

    const total = await LeaveRequest.countDocuments(filter);
    const data = await LeaveRequest.find(filter)
      .sort({ createdAt: query.sortOrder === 'asc' ? 1 : -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('studentId', 'name rollNumber')
      .lean();

    return {
      data: data as unknown as ILeaveRequestDocument[],
      pagination: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  /**
   * Get pending leaves for an approver based on their role.
   *
   * Admin, VC, Chief Warden and HOD see every pending leave (all stages, unscoped).
   */
  async getPendingLeaves(
    approverId: string,
    role: UserRole,
    query: { page: number; limit: number; search?: string; sortOrder?: string },
  ): Promise<{ data: ILeaveRequestDocument[]; pagination: PaginationMeta }> {
    const workflow = APPROVAL_WORKFLOW[role];
    const filter: Record<string, unknown> = {};

    if (SUPER_APPROVER_ROLES.includes(role)) {
      filter.status = { $in: ALL_PENDING_STATUSES };
    } else if (workflow) {
      filter.status = workflow.fromStatus;
    } else {
      throw AppError.forbidden('Your role does not have approval permissions');
    }

    // Scope to relevant students based on role (non-super approvers only).
    // A warden may manage multiple hostels, so collect all of their hostel ids.
    if (role === UserRole.WARDEN) {
      const hostels = await Hostel.find({ wardenId: approverId }).select('_id').lean();
      const hostelIds = hostels.map((h) => h._id);
      const studentIds = hostelIds.length
        ? await Student.find({ hostelId: { $in: hostelIds } }).distinct('_id')
        : [];
      filter.studentId = { $in: studentIds };
    } else if (role === UserRole.PARENT) {
      const parent = await Parent.findOne({ userId: approverId }).select('_id').lean();
      const studentIds = parent
        ? await Student.find({ parentId: parent._id }).distinct('_id')
        : [];
      filter.studentId = { $in: studentIds };
    }

    // Search by student name/roll or human-readable leave id.
    if (query.search) {
      const matchingStudents = await Student.find({
        $or: [
          { name: { $regex: query.search, $options: 'i' } },
          { rollNumber: { $regex: query.search, $options: 'i' } },
        ],
      }).distinct('_id');

      filter.$or = [
        { leaveId: { $regex: query.search, $options: 'i' } },
        { studentId: { $in: matchingStudents } },
      ];
    }

    const total = await LeaveRequest.countDocuments(filter);
    const data = await LeaveRequest.find(filter)
      .sort({ createdAt: query.sortOrder === 'asc' ? 1 : -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate({
        path: 'studentId',
        populate: [
          { path: 'departmentId', select: 'name code' },
          { path: 'hostelId', select: 'name' },
        ],
      })
      .lean();

    return {
      data: data as unknown as ILeaveRequestDocument[],
      pagination: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  /**
   * Get all leaves with filters, scoped to the actor's role.
   *
   * - Admin / Chief Warden: institution-wide (all hostels).
   * - Warden: only students in their assigned hostel(s).
   */
  async getAllLeaves(
    query: {
      page: number;
      limit: number;
      status?: string;
      leaveType?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
      hostelId?: string;
      departmentId?: string;
      sortBy?: string;
      sortOrder?: string;
    },
    actor?: { userId: string; role: UserRole },
  ): Promise<{ data: ILeaveRequestDocument[]; pagination: PaginationMeta }> {
    const filter: Record<string, unknown> = {};

    // ── Role-based student scoping ───────────────────────────────────
    // Wardens never see leaves outside their hostels, even if a hostelId
    // query param is supplied (frontend hostel ids are not trusted).
    if (actor) {
      if (actor.role === UserRole.WARDEN) {
        const hostels = await Hostel.find({ wardenId: actor.userId }).select('_id').lean();
        const hostelIds = hostels.map((h) => h._id);
        const studentIds = hostelIds.length
          ? await Student.find({ hostelId: { $in: hostelIds } }).distinct('_id')
          : [];
        filter.studentId = { $in: studentIds };
      } else if (actor.role === UserRole.PARENT) {
        const parent = await Parent.findOne({ userId: actor.userId }).select('_id').lean();
        const studentIds = parent
          ? await Student.find({ parentId: parent._id }).distinct('_id')
          : [];
        filter.studentId = { $in: studentIds };
      } else if (actor.role === UserRole.STUDENT) {
        const student = await Student.findOne({ userId: actor.userId }).select('_id').lean();
        filter.studentId = student ? student._id : { $in: [] };
      }
    }

    if (query.status) {
      filter.status = query.status;
    }
    if (query.leaveType) {
      filter.leaveType = query.leaveType;
    }
    if (query.fromDate || query.toDate) {
      filter.fromDate = {};
      if (query.fromDate) {
        (filter.fromDate as Record<string, unknown>).$gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        (filter.fromDate as Record<string, unknown>).$lte = new Date(query.toDate);
      }
    }

    // Search by student name or leave ID
    if (query.search) {
      const students = await Student.find({
        $or: [
          { name: { $regex: query.search, $options: 'i' } },
          { rollNumber: { $regex: query.search, $options: 'i' } },
        ],
      }).distinct('_id');

      filter.$or = [
        { leaveId: { $regex: query.search, $options: 'i' } },
        { studentId: { $in: students } },
      ];
    }

    // Filter by hostel or department — intersected with any existing
    // warden scope so a warden can never widen their visibility via query.
    if (query.hostelId || query.departmentId) {
      const studentFilter: Record<string, unknown> = {};
      if (query.hostelId) {
        studentFilter.hostelId = query.hostelId;
      }
      if (query.departmentId) {
        studentFilter.departmentId = query.departmentId;
      }
      const queryStudentIds = await Student.find(studentFilter).distinct('_id');
      const existingScope = (filter.studentId as { $in?: unknown[] } | undefined)?.$in;
      if (Array.isArray(existingScope)) {
        // Intersect warden scope with the requested hostel/department filter.
        const scopeSet = new Set(existingScope.map((id) => String(id)));
        const intersected = (queryStudentIds as unknown[]).filter((id) => scopeSet.has(String(id)));
        filter.studentId = { $in: intersected };
      } else {
        filter.studentId = { $in: queryStudentIds };
      }
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const total = await LeaveRequest.countDocuments(filter);
    const data = await LeaveRequest.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate({
        path: 'studentId',
        populate: [
          { path: 'departmentId', select: 'name code' },
          { path: 'hostelId', select: 'name' },
          { path: 'roomId', select: 'roomNumber' },
        ],
      })
      .lean();

    return {
      data: data as unknown as ILeaveRequestDocument[],
      pagination: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  /**
   * Get leave statistics.
   */
  async getLeaveStats(filter?: Record<string, unknown>) {
    const baseFilter = filter || {};

    const [stats] = await LeaveRequest.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [{ $in: ['$status', ALL_PENDING_STATUSES] }, 1, 0],
            },
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', LeaveStatus.APPROVED] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', LeaveStatus.REJECTED] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', LeaveStatus.COMPLETED] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', LeaveStatus.CANCELLED] }, 1, 0] },
          },
          expired: {
            $sum: { $cond: [{ $eq: ['$status', LeaveStatus.EXPIRED] }, 1, 0] },
          },
        },
      },
    ]);

    return stats || {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      cancelled: 0,
      expired: 0,
    };
  }
}

export const leaveService = new LeaveService();
