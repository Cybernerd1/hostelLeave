/**
 * Presence Controller
 *
 * Handles all HTTP requests for student hostel presence monitoring.
 * Applies role-based access control and delegates to the presence service.
 */

import { Request, Response, NextFunction } from 'express';
import { presenceService } from './presence.service';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../middleware/asyncHandler';
import { buildPaginationMeta } from '../../utils/response.util';

export class PresenceController {
  /**
   * GET /api/presence/dashboard-overview
   * Returns dashboard metrics (total, outside, returned, overdue, absent, approved-not-exited)
   */
  getDashboardOverview = asyncHandler(async (req: Request, res: Response) => {
    const { selectedDate, hostelId } = req.query;

    if (!selectedDate || typeof selectedDate !== 'string') {
      throw new AppError('selectedDate query parameter is required', 400);
    }

    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    const metrics = await presenceService.getDashboardMetrics(
      selectedDate,
      userRole,
      userId,
      hostelId as string,
    );

    res.json({
      success: true,
      data: metrics,
    });
  });

  /**
   * GET /api/presence/hostel-statistics
   * Returns hostel-wise statistics for the selected date
   */
  getHostelStatistics = asyncHandler(async (req: Request, res: Response) => {
    const { selectedDate, hostelId } = req.query;

    if (!selectedDate || typeof selectedDate !== 'string') {
      throw new AppError('selectedDate query parameter is required', 400);
    }

    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    const statistics = await presenceService.getHostelStatistics(
      selectedDate,
      userRole,
      userId,
      hostelId as string,
    );

    res.json({
      success: true,
      data: statistics,
    });
  });

  /**
   * GET /api/presence/currently-outside
   * Returns students currently outside their hostel
   */
  getCurrentlyOutside = asyncHandler(async (req: Request, res: Response) => {
    const { hostelId, page = '1', limit = '20', search } = req.query;

    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    const result = await presenceService.getCurrentlyOutside(
      userRole,
      userId,
      hostelId as string,
      pageNum,
      limitNum,
      search as string,
    );

    res.json({
      success: true,
      data: result.data,
      meta: buildPaginationMeta(result.page, result.limit, result.total),
    });
  });

  /**
   * GET /api/presence/overdue-students
   * Returns students who are overdue
   */
  getOverdueStudents = asyncHandler(async (req: Request, res: Response) => {
    const { hostelId, page = '1', limit = '20', search } = req.query;

    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    const result = await presenceService.getOverdueStudents(
      userRole,
      userId,
      hostelId as string,
      pageNum,
      limitNum,
      search as string,
    );

    res.json({
      success: true,
      data: result.data,
      meta: buildPaginationMeta(result.page, result.limit, result.total),
    });
  });

  /**
   * GET /api/presence/returned-today
   * Returns students who returned on the selected date
   */
  getReturnedToday = asyncHandler(async (req: Request, res: Response) => {
    const { selectedDate, hostelId, page = '1', limit = '20', search } = req.query;

    if (!selectedDate || typeof selectedDate !== 'string') {
      throw new AppError('selectedDate query parameter is required', 400);
    }

    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    const result = await presenceService.getReturnedToday(
      selectedDate,
      userRole,
      userId,
      hostelId as string,
      pageNum,
      limitNum,
      search as string,
    );

    res.json({
      success: true,
      data: result.data,
      meta: buildPaginationMeta(result.page, result.limit, result.total),
    });
  });

  /**
   * GET /api/presence/daily-absence-history
   * Returns all students who were absent at any point during the selected date
   */
  getDailyAbsenceHistory = asyncHandler(async (req: Request, res: Response) => {
    const { selectedDate, hostelId, page = '1', limit = '20', search } = req.query;

    if (!selectedDate || typeof selectedDate !== 'string') {
      throw new AppError('selectedDate query parameter is required', 400);
    }

    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    const result = await presenceService.getDailyAbsenceHistory(
      selectedDate,
      userRole,
      userId,
      hostelId as string,
      pageNum,
      limitNum,
      search as string,
    );

    res.json({
      success: true,
      data: result.data,
      meta: buildPaginationMeta(result.page, result.limit, result.total),
    });
  });

  /**
   * GET /api/presence/approved-not-exited
   * Returns students with approved leave but no recorded exit
   */
  getApprovedNotExited = asyncHandler(async (req: Request, res: Response) => {
    const { selectedDate, hostelId, page = '1', limit = '20', search } = req.query;

    if (!selectedDate || typeof selectedDate !== 'string') {
      throw new AppError('selectedDate query parameter is required', 400);
    }

    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    const result = await presenceService.getApprovedNotExited(
      selectedDate,
      userRole,
      userId,
      hostelId as string,
      pageNum,
      limitNum,
      search as string,
    );

    res.json({
      success: true,
      data: result.data,
      meta: buildPaginationMeta(result.page, result.limit, result.total),
    });
  });

  /**
   * GET /api/presence/student/:studentId
   * Returns detailed absence record for a specific student on a specific date
   */
  getStudentAbsenceDetail = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { selectedDate } = req.query;

    if (!selectedDate || typeof selectedDate !== 'string') {
      throw new AppError('selectedDate query parameter is required', 400);
    }

    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    const detail = await presenceService.getStudentAbsenceDetail(
      studentId,
      selectedDate,
      userRole,
      userId,
    );

    if (!detail) {
      throw new AppError('Student not found', 404);
    }

    res.json({
      success: true,
      data: detail,
    });
  });
}

export const presenceController = new PresenceController();
