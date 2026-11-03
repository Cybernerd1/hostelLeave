import mongoose from 'mongoose';
import { HolidayType } from '@hostel/shared-types';

import { AcademicHoliday } from '../../models/academicHoliday.model';
import { AppError } from '../../utils/AppError';
import { createAuditLog } from '../../middleware/audit.middleware';
import { config } from '../../config';

export type HolidayInput = {
  name?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  type?: HolidayType;
  confirmOverlap?: boolean;
};

/** Convert an institution-local date-only value to its stored UTC instant. */
function toStoredDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const assumedUtc = new Date(Date.UTC(year, month - 1, day));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: config.institution.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(assumedUtc)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
  const displayedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const timezoneOffset = displayedAsUtc - assumedUtc.getTime();
  return new Date(assumedUtc.getTime() - timezoneOffset);
}

function toDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.institution.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function validateRange(startDate: string, endDate: string) {
  if (endDate < startDate) {
    throw AppError.badRequest('End date cannot be earlier than start date');
  }
}

function serializeHoliday(holiday: Record<string, unknown>) {
  return {
    ...holiday,
    startDate: toDateKey(holiday.startDate as Date),
    endDate: toDateKey(holiday.endDate as Date),
  };
}

export class AcademicHolidayService {
  async list(query?: { fromDate?: string; toDate?: string }) {
    const filter: Record<string, unknown> = {};
    if (query?.fromDate || query?.toDate) {
      filter.startDate = { $lte: toStoredDate(query.toDate || '9999-12-31') };
      filter.endDate = { $gte: toStoredDate(query.fromDate || '0001-01-01') };
    }

    const holidays = await AcademicHoliday.find(filter)
      .sort({ startDate: 1, endDate: 1, name: 1 })
      .populate('createdBy', 'name email role')
      .lean();

    return holidays.map((holiday) =>
      serializeHoliday(holiday as unknown as Record<string, unknown>),
    );
  }

  async create(data: HolidayInput, actorId: string) {
    if (!data.startDate || !data.endDate) {
      throw AppError.badRequest('Holiday start and end dates are required');
    }
    validateRange(data.startDate, data.endDate);

    const startDate = toStoredDate(data.startDate);
    const endDate = toStoredDate(data.endDate);
    const duplicate = await AcademicHoliday.exists({ startDate, endDate });
    if (duplicate) {
      throw AppError.conflict('A holiday with the same date range already exists');
    }

    const overlap = await AcademicHoliday.findOne({
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    }).lean();
    if (overlap && !data.confirmOverlap) {
      throw AppError.conflict(
        `This range overlaps the holiday "${overlap.name}" (${toDateKey(overlap.startDate)} to ${toDateKey(overlap.endDate)}). Confirm to save the overlapping holiday.`,
      );
    }

    const holiday = await AcademicHoliday.create({
      name: data.name,
      startDate,
      endDate,
      description: data.description,
      type: data.type || HolidayType.OTHER,
      createdBy: actorId,
    });

    await createAuditLog({
      userId: actorId,
      action: 'create',
      entity: 'AcademicHoliday',
      entityId: holiday._id.toString(),
      newData: holiday.toObject(),
      description: `Academic holiday "${holiday.name}" created`,
    });

    return serializeHoliday(holiday.toObject() as unknown as Record<string, unknown>);
  }

  async update(id: string, data: HolidayInput, actorId: string) {
    const holiday = await AcademicHoliday.findById(id);
    if (!holiday) throw AppError.notFound('Academic holiday not found');

    const startKey = data.startDate || toDateKey(holiday.startDate);
    const endKey = data.endDate || toDateKey(holiday.endDate);
    validateRange(startKey, endKey);
    const startDate = toStoredDate(startKey);
    const endDate = toStoredDate(endKey);

    const duplicate = await AcademicHoliday.exists({
      _id: { $ne: new mongoose.Types.ObjectId(id) },
      startDate,
      endDate,
    });
    if (duplicate) throw AppError.conflict('A holiday with the same date range already exists');

    const overlap = await AcademicHoliday.findOne({
      _id: { $ne: new mongoose.Types.ObjectId(id) },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    }).lean();
    if (overlap && !data.confirmOverlap) {
      throw AppError.conflict(
        `This range overlaps the holiday "${overlap.name}" (${toDateKey(overlap.startDate)} to ${toDateKey(overlap.endDate)}). Confirm to save the overlapping holiday.`,
      );
    }

    const previousData = holiday.toObject();
    if (data.name !== undefined) holiday.name = data.name;
    if (data.description !== undefined) holiday.description = data.description;
    if (data.type !== undefined) holiday.type = data.type;
    holiday.startDate = startDate;
    holiday.endDate = endDate;
    await holiday.save();

    await createAuditLog({
      userId: actorId,
      action: 'update',
      entity: 'AcademicHoliday',
      entityId: id,
      previousData,
      newData: holiday.toObject(),
      description: `Academic holiday "${holiday.name}" updated`,
    });

    return serializeHoliday(holiday.toObject() as unknown as Record<string, unknown>);
  }

  async remove(id: string, actorId: string) {
    const holiday = await AcademicHoliday.findByIdAndDelete(id);
    if (!holiday) throw AppError.notFound('Academic holiday not found');

    await createAuditLog({
      userId: actorId,
      action: 'delete',
      entity: 'AcademicHoliday',
      entityId: id,
      previousData: holiday.toObject(),
      description: `Academic holiday "${holiday.name}" deleted`,
    });
  }
}

export const academicHolidayService = new AcademicHolidayService();
