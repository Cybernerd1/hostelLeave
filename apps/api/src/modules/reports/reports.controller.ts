/**
 * Reports Controller
 */

import type { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/asyncHandler';
import { reportsService } from './reports.service';
import { sendSuccess } from '../../utils/response.util';

export const getLeavesByType = asyncHandler(async (req: Request, res: Response) => {
  const data = await reportsService.getLeavesByType(
    req.query.fromDate as string,
    req.query.toDate as string,
  );
  sendSuccess(res, data, 'Leave type breakdown retrieved');
});

export const getLeavesByMonth = asyncHandler(async (req: Request, res: Response) => {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const data = await reportsService.getLeavesByMonth(year);
  sendSuccess(res, data, 'Monthly leave data retrieved');
});

export const getLeavesByDepartment = asyncHandler(async (_req: Request, res: Response) => {
  const data = await reportsService.getLeavesByDepartment();
  sendSuccess(res, data, 'Department-wise leave data retrieved');
});

export const getLeavesByHostel = asyncHandler(async (_req: Request, res: Response) => {
  const data = await reportsService.getLeavesByHostel();
  sendSuccess(res, data, 'Hostel-wise leave data retrieved');
});

export const getTodayGateActivity = asyncHandler(async (_req: Request, res: Response) => {
  const data = await reportsService.getTodayGateActivity();
  sendSuccess(res, data, 'Today gate activity retrieved');
});

export const getLeaveStatusBreakdown = asyncHandler(async (_req: Request, res: Response) => {
  const data = await reportsService.getLeaveStatusBreakdown();
  sendSuccess(res, data, 'Leave status breakdown retrieved');
});

export const getAverageApprovalTime = asyncHandler(async (_req: Request, res: Response) => {
  const data = await reportsService.getAverageApprovalTime();
  sendSuccess(res, data, 'Average approval time retrieved');
});
