/**
 * Gate Pass Controller
 *
 * Dashboard and history endpoints for gate passes. Hostel scoping for wardens
 * and ownership checks for students/parents are enforced here (the frontend
 * cannot widen scope via query params).
 */

import type { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/asyncHandler';
import { sendSuccess } from '../../utils/response.util';
import { UserRole } from '@hostel/shared-types';
import { Hostel } from '../../models/hostel.model';
import { Student } from '../../models/student.model';
import { Parent } from '../../models/parent.model';
import { AppError } from '../../utils/AppError';
import { gatePassService } from './gatePass.service';

/**
 * Resolve the set of hostel ids a warden may see, or null for institution-wide
 * (admin / chief warden / guard).
 */
async function resolveScope(req: Request): Promise<string[] | null> {
  const role = req.user!.role;
  if (role === UserRole.ADMIN || role === UserRole.CHIEF_WARDEN) {
    return null;
  }
  if (role === UserRole.WARDEN) {
    const hostels = await Hostel.find({ wardenId: req.user!.userId }).select('_id').lean();
    return hostels.map((h) => String(h._id));
  }
  // Guards may view gate passes institution-wide for gate operations.
  if (role === UserRole.GUARD) {
    return null;
  }
  return [];
}

function passStudentId(pass: { studentId?: unknown }): string {
  const value = pass.studentId as { _id?: unknown } | string | undefined;
  if (value && typeof value === 'object' && '_id' in value) {
    return String((value as { _id?: unknown })._id ?? '');
  }
  return value ? String(value) : '';
}

/**
 * Whether the authenticated actor may view this gate pass.
 * Students only see their own passes; parents only their children's; wardens
 * only passes for their hostels; admin/chief warden/guard are institution-wide.
 */
async function canViewPass(req: Request, pass: { hostelId?: unknown; studentId?: unknown }): Promise<boolean> {
  const { userId, role } = req.user!;

  if (role === UserRole.ADMIN || role === UserRole.CHIEF_WARDEN || role === UserRole.GUARD) {
    return true;
  }

  if (role === UserRole.WARDEN) {
    const scope = await resolveScope(req);
    const hostelId = pass.hostelId ? String(pass.hostelId) : '';
    return scope !== null && !!hostelId && scope.includes(hostelId);
  }

  if (role === UserRole.STUDENT) {
    const student = await Student.findOne({ userId }).select('_id').lean();
    return !!student && String(student._id) === passStudentId(pass);
  }

  if (role === UserRole.PARENT) {
    const parent = await Parent.findOne({ userId }).select('_id').lean();
    if (!parent) return false;
    const children = await Student.find({ parentId: parent._id }).distinct('_id');
    return children.map(String).includes(passStudentId(pass));
  }

  return false;
}

/** GET /api/v1/gate-passes — dashboard summary + paginated list. */
export const getGatePassDashboard = asyncHandler(async (req: Request, res: Response) => {
  const scope = await resolveScope(req);
  const requestedHostel = req.query.hostelId as string | undefined;

  // A warden may further filter by hostel only within their own scope.
  let hostelFilter = requestedHostel;
  if (scope !== null && requestedHostel && !scope.includes(requestedHostel)) {
    hostelFilter = undefined; // ignore out-of-scope hostel filter
  }

  const result = await gatePassService.getDashboard(scope, {
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    status: req.query.status as string | undefined,
    hostelId: hostelFilter,
    studentId: req.query.studentId as string | undefined,
    search: req.query.search as string | undefined,
    fromDate: req.query.fromDate as string | undefined,
    toDate: req.query.toDate as string | undefined,
  });

  sendSuccess(res, result, 'Gate pass dashboard retrieved');
});

/** GET /api/v1/gate-passes/history — paginated gate-pass history (guard log). */
export const getGatePassHistory = asyncHandler(async (req: Request, res: Response) => {
  const scope = await resolveScope(req);
  const result = await gatePassService.getDashboard(scope, {
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    status: req.query.status as string | undefined,
    hostelId: req.query.hostelId as string | undefined,
    studentId: req.query.studentId as string | undefined,
    search: req.query.search as string | undefined,
    fromDate: req.query.fromDate as string | undefined,
    toDate: req.query.toDate as string | undefined,
  });
  sendSuccess(res, result, 'Gate pass history retrieved');
});

/** GET /api/v1/gate-passes/:id — single gate pass. */
export const getGatePassById = asyncHandler(async (req: Request, res: Response) => {
  const pass = await gatePassService.getByIdDetailed(req.params.id);
  if (!pass) {
    throw AppError.notFound('Gate pass not found');
  }
  if (!(await canViewPass(req, pass))) {
    throw AppError.forbidden('You are not allowed to view this gate pass');
  }
  return sendSuccess(res, pass, 'Gate pass retrieved');
});

/** GET /api/v1/gate-passes/leave/:leaveId — gate pass for a specific leave. */
export const getGatePassByLeave = asyncHandler(async (req: Request, res: Response) => {
  const pass = await gatePassService.getByLeaveIdDetailed(req.params.leaveId);
  if (!pass) {
    return sendSuccess(res, null, 'Gate pass not found');
  }
  if (!(await canViewPass(req, pass))) {
    throw AppError.forbidden('You are not allowed to view this gate pass');
  }
  return sendSuccess(res, pass, 'Gate pass retrieved');
});
