/**
 * Guard Controller
 */

import type { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/asyncHandler';
import { guardService } from './guard.service';
import { sendSuccess, sendPaginated } from '../../utils/response.util';

export const verifyQR = asyncHandler(async (req: Request, res: Response) => {
  const { qrData } = req.body;
  const result = await guardService.verifyQR(qrData);
  sendSuccess(res, result, result.message);
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
  const { leaveRequestId, action, remarks, location } = req.body;

  if (action === 'exit') {
    const guardLog = await guardService.markExit(guardId, leaveRequestId, remarks, location);
    return sendSuccess(res, guardLog, 'Exit recorded successfully');
  } else {
    const guardLog = await guardService.markEntry(guardId, leaveRequestId, remarks, location);
    return sendSuccess(res, guardLog, 'Return recorded successfully');
  }
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
