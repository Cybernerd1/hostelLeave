import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/response.util';
import { academicHolidayService } from './academicHoliday.service';

export const listAcademicHolidays = asyncHandler(async (req: Request, res: Response) => {
  const holidays = await academicHolidayService.list({
    fromDate: req.query.fromDate as string | undefined,
    toDate: req.query.toDate as string | undefined,
  });
  sendSuccess(res, holidays, 'Academic holidays retrieved');
});

export const createAcademicHoliday = asyncHandler(async (req: Request, res: Response) => {
  const holiday = await academicHolidayService.create(req.body, req.user!.userId);
  sendCreated(res, holiday, 'Academic holiday created successfully');
});

export const updateAcademicHoliday = asyncHandler(async (req: Request, res: Response) => {
  const holiday = await academicHolidayService.update(req.params.id, req.body, req.user!.userId);
  sendSuccess(res, holiday, 'Academic holiday updated successfully');
});

export const deleteAcademicHoliday = asyncHandler(async (req: Request, res: Response) => {
  await academicHolidayService.remove(req.params.id, req.user!.userId);
  sendSuccess(res, null, 'Academic holiday deleted successfully');
});
