import type { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/response.util';
import { UserRole } from '@hostel/shared-types';
import { academicHolidayService } from './academicHoliday.service';

function getActor(req: Request) {
  return { userId: req.user!.userId, role: req.user!.role };
}

export const listAcademicHolidays = asyncHandler(async (req: Request, res: Response) => {
  const holidays = await academicHolidayService.list(getActor(req), {
    fromDate: req.query.fromDate as string | undefined,
    toDate: req.query.toDate as string | undefined,
  });
  sendSuccess(res, holidays, 'Academic holidays retrieved');
});

/** GET /academic-holidays/calendar?fromDate=&toDate= — calendar view with events grouped by date */
export const getCalendarView = asyncHandler(async (req: Request, res: Response) => {
  const result = await academicHolidayService.getCalendarView(getActor(req), {
    fromDate: req.query.fromDate as string | undefined,
    toDate: req.query.toDate as string | undefined,
    hostelId: req.query.hostelId as string | undefined,
  });
  sendSuccess(res, result, 'Calendar view retrieved');
});

/** GET /academic-holidays/summary?fromDate=&toDate= — summary by holiday type */
export const getCalendarSummary = asyncHandler(async (req: Request, res: Response) => {
  const result = await academicHolidayService.getSummary(getActor(req), {
    fromDate: req.query.fromDate as string | undefined,
    toDate: req.query.toDate as string | undefined,
  });
  sendSuccess(res, result, 'Calendar summary retrieved');
});

/** GET /academic-holidays/classify?fromDate=&toDate= — day-wise leave mapping */
export const classifyAcademicCalendar = asyncHandler(async (req: Request, res: Response) => {
  const fromDate = req.query.fromDate as string | undefined;
  const toDate = req.query.toDate as string | undefined;
  const result = await academicHolidayService.classifyRange(getActor(req), fromDate || '', toDate || '');
  sendSuccess(res, result, 'Leave dates classified against the academic calendar');
});

export const createAcademicHoliday = asyncHandler(async (req: Request, res: Response) => {
  const holiday = await academicHolidayService.create(req.body, getActor(req));
  sendCreated(res, holiday, 'Academic holiday created successfully');
});

export const updateAcademicHoliday = asyncHandler(async (req: Request, res: Response) => {
  const holiday = await academicHolidayService.update(req.params.id, req.body, getActor(req));
  sendSuccess(res, holiday, 'Academic holiday updated successfully');
});

export const deleteAcademicHoliday = asyncHandler(async (req: Request, res: Response) => {
  await academicHolidayService.remove(req.params.id, getActor(req));
  sendSuccess(res, null, 'Academic holiday deleted successfully');
});