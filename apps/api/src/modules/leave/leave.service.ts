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
import { Department } from '../../models/department.model';
import { User } from '../../models/user.model';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { createAuditLog } from '../../middleware/audit.middleware';
import { notificationService } from '../notification/notification.service';
import { emailService } from '../email/email.service';
import { qrService } from '../qr/qr.service';
import { buildPaginationMeta } from '../../utils/response.util';

import type { PaginationMeta } from '@hostel/shared-types';

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

    // Validate that this role can approve at the current stage
    let workflow = APPROVAL_WORKFLOW[approverRole];

    if (!workflow && (approverRole === UserRole.ADMIN || approverRole === UserRole.VICE_CHANCELLOR)) {
      if (leaveRequest.status === LeaveStatus.PENDING_PARENT) {
        workflow = APPROVAL_WORKFLOW[UserRole.PARENT];
      } else if (leaveRequest.status === LeaveStatus.PENDING_WARDEN) {
        workflow = APPROVAL_WORKFLOW[UserRole.WARDEN];
      } else if (leaveRequest.status === LeaveStatus.PENDING_CHIEF_WARDEN) {
        workflow = APPROVAL_WORKFLOW[UserRole.CHIEF_WARDEN];
      } else if (leaveRequest.status === LeaveStatus.PENDING_HOD) {
        workflow = APPROVAL_WORKFLOW[UserRole.HOD];
      }
    }

    if (!workflow) {
      throw AppError.forbidden('Your role cannot approve/reject leave requests');
    }

    if (leaveRequest.status !== workflow.fromStatus) {
      throw AppError.badRequest(
        `This leave is not pending approval at this stage. Current status: ${leaveRequest.status}`,
      );
    }

    // Get student document (may already be populated via leaveRequest.studentId)
    const studentDoc = (leaveRequest.studentId as any)?._id
      ? (leaveRequest.studentId as any)
      : await Student.findById(leaveRequest.studentId);

    // For warden: verify the student belongs to their hostel if warden is linked to a specific hostel
    if (approverRole === UserRole.WARDEN) {
      if (studentDoc) {
        const hostel = await Hostel.findOne({ wardenId: approverId });
        if (hostel && studentDoc.hostelId && hostel._id.toString() !== studentDoc.hostelId.toString()) {
          throw AppError.forbidden('This student is not in your hostel');
        }
      }
    }

    // For chief warden: verify the student belongs to their hostel if linked
    if (approverRole === UserRole.CHIEF_WARDEN) {
      if (studentDoc) {
        const hostel = await Hostel.findOne({ chiefWardenId: approverId });
        if (hostel && studentDoc.hostelId && hostel._id.toString() !== studentDoc.hostelId.toString()) {
          throw AppError.forbidden('This student is not in your hostel');
        }
      }
    }

    // For HOD: verify the student belongs to their department if linked
    if (approverRole === UserRole.HOD) {
      if (studentDoc) {
        const dept = await Department.findOne({ hodId: approverId });
        if (dept && studentDoc.departmentId && dept._id.toString() !== studentDoc.departmentId.toString()) {
          throw AppError.forbidden('This student is not in your department');
        }
      }
    }

    // For parent: verify this is their child
    if (approverRole === UserRole.PARENT) {
      if (studentDoc) {
        const parent = await Parent.findOne({ userId: approverId });
        const studentParentId = studentDoc.parentId?._id || studentDoc.parentId;
        if (parent && studentParentId && parent._id.toString() !== studentParentId.toString()) {
          throw AppError.forbidden('This is not your child\'s leave request');
        }
      }
    }

    // Create approval record
    const approval = await LeaveApproval.create({
      leaveRequestId: leaveRequest._id,
      approverId,
      role: approverRole,
      action,
      remarks,
      actionDate: new Date(),
    });

    // Update leave request
    if (action === ApprovalAction.REJECTED) {
      leaveRequest.status = LeaveStatus.REJECTED;
    } else {
      leaveRequest.status = workflow.toStatusApproved;
      if (workflow.nextStage) {
        leaveRequest.currentApprovalStage = workflow.nextStage;
      } else {
        leaveRequest.currentApprovalStage = ApprovalStage.COMPLETED;
      }
    }

    leaveRequest.approvals.push(approval._id as mongoose.Types.ObjectId);
    await leaveRequest.save();

    // If fully approved, generate QR code
    if (leaveRequest.status === LeaveStatus.APPROVED) {
      const qrData = await qrService.generateQR(leaveRequest);
      leaveRequest.qrToken = qrData.token;
      leaveRequest.qrExpiry = qrData.expiry;
      await leaveRequest.save();
    }

    // Send notifications
    const student = studentDoc;
    if (student) {
      const studentUser = await User.findById(student.userId);

      if (action === ApprovalAction.REJECTED) {
        // Notify student about rejection
        if (studentUser) {
          await notificationService.create({
            userId: studentUser._id.toString(),
            title: 'Leave Rejected',
            message: `Your leave ${leaveRequest.leaveId} has been rejected by ${approverRole}. ${remarks ? `Reason: ${remarks}` : ''}`,
            type: NotificationType.LEAVE_REJECTED,
            referenceId: leaveRequest._id.toString(),
            referenceModel: 'LeaveRequest',
          });

          await emailService.sendLeaveRejectedEmail(studentUser.email, {
            studentName: student.name,
            leaveId: leaveRequest.leaveId,
            rejectedBy: approverRole,
            remarks: remarks || 'No remarks provided',
          });
        }
      } else {
        // Notify student about approval
        if (studentUser) {
          const statusLabel = leaveRequest.status === LeaveStatus.APPROVED
            ? 'fully approved'
            : `approved by ${approverRole}`;

          await notificationService.create({
            userId: studentUser._id.toString(),
            title: 'Leave Update',
            message: `Your leave ${leaveRequest.leaveId} has been ${statusLabel}.`,
            type: leaveRequest.status === LeaveStatus.APPROVED
              ? NotificationType.LEAVE_APPROVED
              : NotificationType.LEAVE_STAGE_UPDATE,
            referenceId: leaveRequest._id.toString(),
            referenceModel: 'LeaveRequest',
          });

          if (leaveRequest.status === LeaveStatus.APPROVED) {
            await emailService.sendLeaveApprovedEmail(studentUser.email, {
              studentName: student.name,
              leaveId: leaveRequest.leaveId,
              fromDate: leaveRequest.fromDate.toISOString(),
              toDate: leaveRequest.toDate.toISOString(),
            });
          }
        }
      }
    }

    // Audit log
    await createAuditLog({
      userId: approverId,
      action: action === ApprovalAction.APPROVED ? 'approve' : 'reject',
      entity: 'LeaveRequest',
      entityId: leaveRequest._id.toString(),
      description: `Leave ${leaveRequest.leaveId} ${action} by ${approverRole}`,
    });

    logger.info(
      `Leave ${leaveRequest.leaveId} ${action} by ${approverRole} (${approverId})`,
    );

    return leaveRequest;
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
   * Get a single leave request by ID with all populated fields.
   */
  async getLeaveById(leaveRequestId: string): Promise<ILeaveRequestDocument | null> {
    return LeaveRequest.findById(leaveRequestId)
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
   */
  async getPendingLeaves(
    approverId: string,
    role: UserRole,
    query: { page: number; limit: number; search?: string; sortOrder?: string },
  ): Promise<{ data: ILeaveRequestDocument[]; pagination: PaginationMeta }> {
    const workflow = APPROVAL_WORKFLOW[role];
    const filter: Record<string, unknown> = {};

    if (role === UserRole.ADMIN || role === UserRole.VICE_CHANCELLOR) {
      filter.status = {
        $in: [
          LeaveStatus.PENDING_PARENT,
          LeaveStatus.PENDING_WARDEN,
          LeaveStatus.PENDING_CHIEF_WARDEN,
          LeaveStatus.PENDING_HOD,
        ],
      };
    } else if (workflow) {
      filter.status = workflow.fromStatus;
    } else {
      throw AppError.forbidden('Your role does not have approval permissions');
    }

    // Scope to relevant students based on role
    if (role === UserRole.WARDEN) {
      const hostel = await Hostel.findOne({ wardenId: approverId });
      if (hostel) {
        const studentIds = await Student.find({ hostelId: hostel._id }).distinct('_id');
        filter.studentId = { $in: studentIds };
      }
    } else if (role === UserRole.CHIEF_WARDEN) {
      const hostel = await Hostel.findOne({ chiefWardenId: approverId });
      if (hostel) {
        const studentIds = await Student.find({ hostelId: hostel._id }).distinct('_id');
        filter.studentId = { $in: studentIds };
      }
    } else if (role === UserRole.HOD) {
      const dept = await Department.findOne({ hodId: approverId });
      if (dept) {
        const studentIds = await Student.find({ departmentId: dept._id }).distinct('_id');
        filter.studentId = { $in: studentIds };
      }
    } else if (role === UserRole.PARENT) {
      const parent = await Parent.findOne({ userId: approverId });
      if (parent) {
        const studentIds = await Student.find({ parentId: parent._id }).distinct('_id');
        filter.studentId = { $in: studentIds };
      }
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
   * Get all leaves with filters (Admin / VC view).
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
  ): Promise<{ data: ILeaveRequestDocument[]; pagination: PaginationMeta }> {
    const filter: Record<string, unknown> = {};

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

    // Filter by hostel or department
    if (query.hostelId || query.departmentId) {
      const studentFilter: Record<string, unknown> = {};
      if (query.hostelId) {
        studentFilter.hostelId = query.hostelId;
      }
      if (query.departmentId) {
        studentFilter.departmentId = query.departmentId;
      }
      const studentIds = await Student.find(studentFilter).distinct('_id');
      filter.studentId = { $in: studentIds };
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
              $cond: [
                {
                  $in: [
                    '$status',
                    [
                      LeaveStatus.PENDING_PARENT,
                      LeaveStatus.PENDING_WARDEN,
                      LeaveStatus.PENDING_CHIEF_WARDEN,
                      LeaveStatus.PENDING_HOD,
                    ],
                  ],
                },
                1,
                0,
              ],
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
