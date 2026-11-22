/**
 * Absence Monitoring Controller
 *
 * Handles requests for student hostel presence and absence monitoring dashboard.
 */

import type { Request, Response, NextFunction } from 'express';

import { absenceService } from './absence.service';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../middleware/asyncHandler';

/**
 * GET /absence/dashboard
 *
 * Returns absence monitoring dashboard for a selected date.
 *
 * Query Parameters:
 *   - date: YYYY-MM-DD format (required)
 *   - hostelId: Filter by specific hostel (optional)
 *   - tab: Tab to display - currently_outside, overdue, returned_today, daily_absent, approved_not_exited (default: currently_outside)
 *   - page: Pagination page (default: 1)
 *   - limit: Items per page (default: 20)
 *   - search: Search by student name or roll number (optional)
 *   - departmentId: Filter by department (optional)
 *   - courseId: Filter by course (optional)
 */
export const getDashboard = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      throw AppError.badRequest('Date parameter (YYYY-MM-DD format) is required');
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw AppError.badRequest('Date must be in YYYY-MM-DD format');
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    if (page < 1 || limit < 1 || limit > 100) {
      throw AppError.badRequest('Invalid pagination parameters');
    }

    const filters = {
      hostelId: req.query.hostelId as string | undefined,
      tab: (req.query.tab as string | undefined) || 'currently_outside' as any,
      search: req.query.search as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
      courseId: req.query.courseId as string | undefined,
    };

    const result = await absenceService.getDashboard(
      req.user.userId,
      req.user.role,
      date,
      page,
      limit,
      filters,
    );

    logger.info(`Absence dashboard requested for date ${date} by user ${req.user.userId}`);

    res.json({
      success: true,
      data: result,
    });
  },
);

/**
 * GET /absence/metrics
 *
 * Returns just the summary metrics for a selected date and hostel(s).
 * Lightweight endpoint for quick dashboard refresh.
 */
export const getMetrics = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { date, hostelId } = req.query;

    if (!date || typeof date !== 'string') {
      throw AppError.badRequest('Date parameter (YYYY-MM-DD format) is required');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw AppError.badRequest('Date must be in YYYY-MM-DD format');
    }

    const filters = {
      hostelId: hostelId as string | undefined,
    };

    const dashboard = await absenceService.getDashboard(
      req.user.userId,
      req.user.role,
      date,
      1,
      1,
      filters,
    );

    res.json({
      success: true,
      data: {
        selectedDate: dashboard.selectedDate,
        metrics: dashboard.metrics,
      },
    });
  },
);

/**
 * GET /absence/hostels
 *
 * Returns hostel-wise statistics for a selected date.
 */
export const getHostelStats = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      throw AppError.badRequest('Date parameter (YYYY-MM-DD format) is required');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw AppError.badRequest('Date must be in YYYY-MM-DD format');
    }

    const dashboard = await absenceService.getDashboard(
      req.user.userId,
      req.user.role,
      date,
      1,
      1,
    );

    res.json({
      success: true,
      data: {
        selectedDate: dashboard.selectedDate,
        hostelStats: dashboard.hostelStats,
      },
    });
  },
);

/**
 * GET /absence/students/:tab
 *
 * Returns detailed student records for a specific tab.
 * Tab options: currently_outside, overdue, returned_today, daily_absent, approved_not_exited
 */
export const getStudentRecords = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { tab } = req.params;
    const { date } = req.query;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    if (!date || typeof date !== 'string') {
      throw AppError.badRequest('Date parameter (YYYY-MM-DD format) is required');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw AppError.badRequest('Date must be in YYYY-MM-DD format');
    }

    const validTabs = ['currently_outside', 'overdue', 'returned_today', 'daily_absent', 'approved_not_exited'];
    if (!validTabs.includes(tab)) {
      throw AppError.badRequest(`Invalid tab. Must be one of: ${validTabs.join(', ')}`);
    }

    const filters = {
      tab: tab as any,
      hostelId: req.query.hostelId as string | undefined,
      search: req.query.search as string | undefined,
      departmentId: req.query.departmentId as string | undefined,
      courseId: req.query.courseId as string | undefined,
    };

    const dashboard = await absenceService.getDashboard(
      req.user.userId,
      req.user.role,
      date,
      page,
      limit,
      filters,
    );

    res.json({
      success: true,
      data: {
        selectedDate: dashboard.selectedDate,
        students: dashboard.studentRecords[tab as keyof typeof dashboard.studentRecords] || [],
        pagination: dashboard.pagination,
      },
    });
  },
);
