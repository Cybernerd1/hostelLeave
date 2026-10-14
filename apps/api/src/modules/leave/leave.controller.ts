/**
 * Leave Controller
 */

import type { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/asyncHandler';
import { leaveService } from './leave.service';
import { sendSuccess, sendPaginated, sendCreated } from '../../utils/response.util';
import { pdfService } from '../pdf/pdf.service';
import { cloudinaryService } from '../../utils/cloudinary.service';

/** POST /api/v1/leaves - Apply for leave */
export const applyLeave = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const files = (req.files as Express.Multer.File[]) || [];
  const documents = await cloudinaryService.uploadMultipleFiles(files);

  const leaveRequest = await leaveService.applyLeave(userId, req.body, documents);

  sendCreated(res, leaveRequest, 'Leave application submitted successfully');
});

/** PUT /api/v1/leaves/:id/approve - Approve or reject a leave */
export const processApproval = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, role } = req.user!;
  const { action, remarks } = req.body;

  const leaveRequest = await leaveService.processApproval(id, userId, role, action, remarks);

  sendSuccess(res, leaveRequest, `Leave ${action} successfully`);
});

/** PUT /api/v1/leaves/:id/cancel - Cancel a leave */
export const cancelLeave = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const { reason } = req.body;

  const leaveRequest = await leaveService.cancelLeave(id, userId, reason);

  sendSuccess(res, leaveRequest, 'Leave cancelled successfully');
});

/** GET /api/v1/leaves/:id - Get leave details */
export const getLeaveById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const leaveRequest = await leaveService.getLeaveById(id);

  if (!leaveRequest) {
    return sendSuccess(res, null, 'Leave request not found');
  }

  sendSuccess(res, leaveRequest, 'Leave details retrieved');
});

/** GET /api/v1/leaves/public/:leaveId - Public leave info for guard QR verification (no auth) */
export const getPublicLeaveInfo = asyncHandler(async (req: Request, res: Response) => {
  const { leaveId } = req.params;

  // Look up by leaveId (human-readable) string OR by MongoDB _id
  const { LeaveRequest } = await import('../../models/leaveRequest.model');
  const leaveRequest = await LeaveRequest.findOne(
    leaveId.match(/^[a-f\d]{24}$/i) ? { _id: leaveId } : { leaveId },
  )
    .populate({
      path: 'studentId',
      select: 'name rollNumber phone year semester',
      populate: [
        { path: 'departmentId', select: 'name code' },
        { path: 'courseId', select: 'name code' },
        { path: 'hostelId', select: 'name' },
        { path: 'roomId', select: 'roomNumber' },
      ],
    })
    .populate({
      path: 'approvals',
      populate: { path: 'approverId', select: 'name role' },
    })
    .lean();

  if (!leaveRequest) {
    return res.status(404).json({ success: false, message: 'Leave request not found' });
  }

  // Return a sanitized view safe for public display
  const publicData = {
    _id: leaveRequest._id,
    leaveId: leaveRequest.leaveId,
    status: leaveRequest.status,
    leaveType: leaveRequest.leaveType,
    fromDate: leaveRequest.fromDate,
    toDate: leaveRequest.toDate,
    destination: leaveRequest.destination,
    reason: leaveRequest.reason,
    exitTime: leaveRequest.exitTime,
    entryTime: leaveRequest.entryTime,
    createdAt: leaveRequest.createdAt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    student: leaveRequest.studentId as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    approvals: leaveRequest.approvals as any,
  };

  sendSuccess(res, publicData, 'Leave details retrieved');
});

/** GET /api/v1/leaves/my - Get student's own leaves */
export const getMyLeaves = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { page = 1, limit = 20, status, sortOrder = 'desc' } = req.query;

  const result = await leaveService.getStudentLeaves(userId, {
    page: Number(page),
    limit: Number(limit),
    status: status as string,
    sortOrder: sortOrder as string,
  });

  sendPaginated(res, result.data, result.pagination, 'Leaves retrieved');
});

/** GET /api/v1/leaves/pending - Get pending leaves for approver */
export const getPendingLeaves = asyncHandler(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  const { page = 1, limit = 20, search, sortOrder = 'desc' } = req.query;

  const result = await leaveService.getPendingLeaves(userId, role, {
    page: Number(page),
    limit: Number(limit),
    search: search as string,
    sortOrder: sortOrder as string,
  });

  sendPaginated(res, result.data, result.pagination, 'Pending leaves retrieved');
});

/** GET /api/v1/leaves - Get all leaves (Admin/VC) */
export const getAllLeaves = asyncHandler(async (req: Request, res: Response) => {
  const result = await leaveService.getAllLeaves({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    status: req.query.status as string,
    leaveType: req.query.leaveType as string,
    fromDate: req.query.fromDate as string,
    toDate: req.query.toDate as string,
    search: req.query.search as string,
    hostelId: req.query.hostelId as string,
    departmentId: req.query.departmentId as string,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as string,
  });

  sendPaginated(res, result.data, result.pagination, 'Leaves retrieved');
});

/** GET /api/v1/leaves/stats - Get leave statistics (role-scoped) */
export const getLeaveStats = asyncHandler(async (req: Request, res: Response) => {
  const { userId, role } = req.user!;
  let filter: Record<string, unknown> = {};

  if (role === 'warden') {
    const { Hostel } = await import('../../models/hostel.model');
    const { Student } = await import('../../models/student.model');
    const hostel = await Hostel.findOne({ wardenId: userId });
    if (hostel) {
      const studentIds = await Student.find({ hostelId: hostel._id }).distinct('_id');
      filter = { studentId: { $in: studentIds } };
    }
  } else if (role === 'chief_warden') {
    const { Hostel } = await import('../../models/hostel.model');
    const { Student } = await import('../../models/student.model');
    const hostel = await Hostel.findOne({ chiefWardenId: userId });
    if (hostel) {
      const studentIds = await Student.find({ hostelId: hostel._id }).distinct('_id');
      filter = { studentId: { $in: studentIds } };
    }
  } else if (role === 'hod') {
    const { Department } = await import('../../models/department.model');
    const { Student } = await import('../../models/student.model');
    const dept = await Department.findOne({ hodId: userId });
    if (dept) {
      const studentIds = await Student.find({ departmentId: dept._id }).distinct('_id');
      filter = { studentId: { $in: studentIds } };
    }
  }

  const stats = await leaveService.getLeaveStats(filter);

  sendSuccess(res, stats, 'Leave statistics retrieved');
});

/** GET /api/v1/leaves/:id/pdf - Download approved leave pass as PDF */
export const downloadLeavePDF = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const pdfDoc = await pdfService.generateLeavePDF(id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="leave-pass-${id}.pdf"`);

  pdfDoc.pipe(res);
});
