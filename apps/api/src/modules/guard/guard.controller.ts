/**
 * Guard Controller
 */

import type { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/asyncHandler';
import { guardService } from './guard.service';
import { sendSuccess, sendPaginated } from '../../utils/response.util';
import { GuardAction } from '@hostel/shared-types';

export const verifyQR = asyncHandler(async (req: Request, res: Response) => {
  const { qrData } = req.body;
  const result = await guardService.verifyQR(qrData);
  sendSuccess(res, result, result.message);
});

/** GET /guard/lookup/:identifier — look up a leave/pass for the scan screen. */
export const lookupPass = asyncHandler(async (req: Request, res: Response) => {
  const result = await guardService.lookupPass(req.params.identifier);
  sendSuccess(res, result, 'Pass retrieved');
});

export const markExit = asyncHandler(async (req: Request, res: Response) => {
  const guardId = req.user!.userId;
  const { leaveRequestId, remarks, location } = req.body;

  const guardLog = await guardService.markExit(guardId, leaveRequestId, remarks, location);
  sendSuccess(res, guardLog, 'Exit marked successfully');
});

export const markEntry = asyncHandler(async (req: Request, res: Response) => {
  const guardId = req.user!.userId;
  const { leaveRequestId, remarks, location } = req.body;

  const guardLog = await guardService.markEntry(guardId, leaveRequestId, remarks, location);
  sendSuccess(res, guardLog, 'Entry marked successfully. Leave completed.');
});

export const markCheckOut = asyncHandler(async (req: Request, res: Response) => {
  const guardId = req.user!.userId;
  // Accept either leaveRequestId or leaveId (frontend compatibility).
  const leaveRequestId = (req.body.leaveRequestId ?? req.body.leaveId) as string;
  const { action, remarks, location } = req.body;

  if (!leaveRequestId) {
    return sendSuccess(res, null, 'leaveRequestId is required');
  }

  const isExit = action === 'exit' || action === GuardAction.EXIT;
  if (isExit) {
    const guardLog = await guardService.markExit(guardId, leaveRequestId, remarks, location);
    return sendSuccess(res, guardLog, 'Exit recorded successfully');
  }
  const guardLog = await guardService.markEntry(guardId, leaveRequestId, remarks, location);
  return sendSuccess(res, guardLog, 'Return recorded successfully');
});

export const getGateLog = asyncHandler(async (req: Request, res: Response) => {
  const guardId = req.user!.role === 'admin' ? undefined : req.user!.userId;
  const { page = 1, limit = 20, action, fromDate, toDate } = req.query;

  const result = await guardService.getGateLog(guardId, {
    page: Number(page),
    limit: Number(limit),
    action: action as string,
    fromDate: fromDate as string,
    toDate: toDate as string,
  });

  sendPaginated(res, result.data, result.pagination, 'Gate log retrieved');
});
