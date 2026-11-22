import mongoose from 'mongoose';
import { CalendarScope, HolidayType, NotificationType, UserRole } from '@hostel/shared-types';
import { classifyLeaveDays, rangesOverlap, type CalendarEventLike } from '@hostel/shared-utils';

import { AcademicHoliday } from '../../models/academicHoliday.model';
import { Hostel } from '../../models/hostel.model';
import { Student } from '../../models/student.model';
import { Parent } from '../../models/parent.model';
import { User } from '../../models/user.model';
import { AppError } from '../../utils/AppError';
import { createAuditLog } from '../../middleware/audit.middleware';
import { notificationService } from '../notification/notification.service';
import { config } from '../../config';

export type HolidayInput = {
  name?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  type?: HolidayType;
  scope?: CalendarScope | 'institution' | 'hostel';
  hostelId?: string;
  academicYear?: string;
  confirmOverlap?: boolean;
};

export interface CalendarActor {
  userId: string;
  role: UserRole;
}

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

/**
 * Resolve the set of hostel ids a warden is responsible for.
 */
async function getWardenHostelIds(userId: string): Promise<string[]> {
  const hostels = await Hostel.find({ wardenId: userId }).select('_id').lean();
  return hostels.map((h) => String(h._id));
}

/**
 * Resolve the hostel id a student belongs to (used for student/parent scope).
 */
async function getStudentHostelIds(userId: string, role: UserRole): Promise<string[]> {
  if (role === UserRole.STUDENT) {
    const student = await Student.findOne({ userId }).select('hostelId').lean();
    return student?.hostelId ? [String(student.hostelId)] : [];
  }
  if (role === UserRole.PARENT) {
    const parent = await Parent.findOne({ userId }).select('_id').lean();
    if (!parent) return [];
    const students = await Student.find({ parentId: parent._id }).select('hostelId').lean();
    return students
      .map((s) => (s.hostelId ? String(s.hostelId) : ''))
      .filter((id): id is string => !!id);
  }
  return [];
}

export class AcademicHolidayService {
  /**
   * List holidays visible to the actor.
   *
   * Visibility rules:
   * - Admin / Chief Warden: all institution-wide + all hostel-specific entries.
   * - Warden: institution-wide + entries for their own hostel(s).
   * - Student / Parent: institution-wide + entries for their hostel(s).
   */
  async list(actor: CalendarActor, query?: { fromDate?: string; toDate?: string }) {
    const filter: Record<string, unknown> = {};
    if (query?.fromDate || query?.toDate) {
      filter.startDate = { $lte: toStoredDate(query.toDate || '9999-12-31') };
      filter.endDate = { $gte: toStoredDate(query.fromDate || '0001-01-01') };
    }

    let accessibleHostelIds: string[] | null = null;
    if (actor.role === UserRole.WARDEN) {
      accessibleHostelIds = await getWardenHostelIds(actor.userId);
    } else if (actor.role === UserRole.STUDENT || actor.role === UserRole.PARENT) {
      accessibleHostelIds = await getStudentHostelIds(actor.userId, actor.role);
    }

    if (accessibleHostelIds !== null) {
      // Institution-wide entries are always visible; hostel entries only if in scope.
      filter.$or = [
        { scope: CalendarScope.INSTITUTION },
        { scope: CalendarScope.HOSTEL, hostelId: { $in: accessibleHostelIds } },
      ];
    }

    const holidays = await AcademicHoliday.find(filter)
      .sort({ startDate: 1, endDate: 1, name: 1 })
      .populate('createdBy', 'name email role')
      .populate('hostelId', 'name')
      .lean();

    return holidays.map((holiday) =>
      serializeHoliday(holiday as unknown as Record<string, unknown>),
    );
  }

  /**
   * Classify every day of a [fromDate, toDate] range against the calendar the
   * actor is allowed to see. Used for leave-to-calendar mapping.
   */
  async classifyRange(
    actor: CalendarActor,
    fromDate: string,
    toDate: string,
  ) {
    if (!fromDate || !toDate) {
      throw AppError.badRequest('Both fromDate and toDate are required');
    }
    const holidays = await this.list(actor, { fromDate, toDate });
    const events: CalendarEventLike[] = holidays.map((h) => {
      const record = h as unknown as {
        startDate: string;
        endDate: string;
        type?: string;
        scope?: string;
        hostelId?: string | null;
      };
      return {
        startDate: record.startDate,
        endDate: record.endDate,
        name: (record as unknown as { name?: string }).name,
        type: record.type,
        scope: record.scope,
        hostelId: record.hostelId ?? null,
      };
    });
    return classifyLeaveDays(fromDate, toDate, events);
  }

  async create(data: HolidayInput, actor: CalendarActor) {
    if (!data.startDate || !data.endDate) {
      throw AppError.badRequest('Holiday start and end dates are required');
    }
    validateRange(data.startDate, data.endDate);

    const scope: CalendarScope =
      data.scope === 'hostel'
        ? CalendarScope.HOSTEL
        : CalendarScope.INSTITUTION;

    // Resolve and authorize the target hostel.
    let hostelId: mongoose.Types.ObjectId | undefined;
    if (scope === CalendarScope.HOSTEL) {
      if (!data.hostelId) {
        throw AppError.badRequest('A hostel must be selected for a hostel-specific entry');
      }
      await this.assertCanManageHostel(actor, data.hostelId);
      hostelId = new mongoose.Types.ObjectId(data.hostelId);
    } else {
      // Institution-wide entries require admin or chief warden.
      this.assertInstitutionManager(actor);
    }

    const startDate = toStoredDate(data.startDate);
    const endDate = toStoredDate(data.endDate);

    const duplicate = await AcademicHoliday.exists({
      startDate,
      endDate,
      scope,
      hostelId: hostelId ?? null,
    });
    if (duplicate) {
      throw AppError.conflict('An entry with the same date range and scope already exists');
    }

    await this.assertNoOverlap(
      startDate,
      endDate,
      scope,
      hostelId,
      data.confirmOverlap,
    );

    const holiday = await AcademicHoliday.create({
      name: data.name,
      startDate,
      endDate,
      description: data.description,
      type: data.type || HolidayType.OTHER,
      scope,
      hostelId,
      academicYear: data.academicYear,
      createdBy: actor.userId,
    });

    await createAuditLog({
      userId: actor.userId,
      action: 'create',
      entity: 'AcademicHoliday',
      entityId: holiday._id.toString(),
      newData: holiday.toObject(),
      description: `Academic calendar entry "${holiday.name}" created`,
    });

    await this.notifyCalendarChange(holiday, 'created', actor.userId);

    return serializeHoliday(holiday.toObject() as unknown as Record<string, unknown>);
  }

  async update(id: string, data: HolidayInput, actor: CalendarActor) {
    const holiday = await AcademicHoliday.findById(id);
    if (!holiday) throw AppError.notFound('Academic holiday not found');

    // Authorization: must be allowed to manage this entry's scope/hostel.
    await this.assertCanManageExisting(actor, holiday);

    const startKey = data.startDate || toDateKey(holiday.startDate);
    const endKey = data.endDate || toDateKey(holiday.endDate);
    validateRange(startKey, endKey);
    const startDate = toStoredDate(startKey);
    const endDate = toStoredDate(endKey);

    const nextScope: CalendarScope =
      data.scope === 'hostel'
        ? CalendarScope.HOSTEL
        : data.scope === 'institution'
          ? CalendarScope.INSTITUTION
          : holiday.scope;

    let nextHostelId: mongoose.Types.ObjectId | undefined = holiday.hostelId
      ? new mongoose.Types.ObjectId(String(holiday.hostelId))
      : undefined;
    if (nextScope === CalendarScope.HOSTEL) {
      const targetHostel = data.hostelId || (holiday.hostelId ? String(holiday.hostelId) : '');
      if (!targetHostel) {
        throw AppError.badRequest('A hostel must be selected for a hostel-specific entry');
      }
      await this.assertCanManageHostel(actor, targetHostel);
      nextHostelId = new mongoose.Types.ObjectId(targetHostel);
    } else {
      this.assertInstitutionManager(actor);
      nextHostelId = undefined;
    }

    const duplicate = await AcademicHoliday.exists({
      _id: { $ne: holiday._id },
      startDate,
      endDate,
      scope: nextScope,
      hostelId: nextHostelId ?? null,
    });
    if (duplicate) throw AppError.conflict('An entry with the same date range and scope already exists');

    await this.assertNoOverlap(
      startDate,
      endDate,
      nextScope,
      nextHostelId,
      data.confirmOverlap,
      id,
    );

    const previousData = holiday.toObject();
    if (data.name !== undefined) holiday.name = data.name;
    if (data.description !== undefined) holiday.description = data.description;
    if (data.type !== undefined) holiday.type = data.type;
    if (data.academicYear !== undefined) holiday.academicYear = data.academicYear;
    holiday.startDate = startDate;
    holiday.endDate = endDate;
    holiday.scope = nextScope;
    holiday.hostelId = nextHostelId;
    await holiday.save();

    await createAuditLog({
      userId: actor.userId,
      action: 'update',
      entity: 'AcademicHoliday',
      entityId: id,
      previousData,
      newData: holiday.toObject(),
      description: `Academic calendar entry "${holiday.name}" updated`,
    });

    await this.notifyCalendarChange(holiday, 'updated', actor.userId);

    return serializeHoliday(holiday.toObject() as unknown as Record<string, unknown>);
  }

  /**
   * Get calendar events for a date range formatted for calendar UI display.
   * Returns events grouped by date with color and label information.
   */
  async getCalendarView(
    actor: CalendarActor,
    query: { fromDate?: string; toDate?: string; hostelId?: string },
  ) {
    if (!query.fromDate || !query.toDate) {
      throw AppError.badRequest('Both fromDate and toDate are required');
    }

    // Get holidays using existing list method (which respects scoping)
    const holidays = await this.list(actor, {
      fromDate: query.fromDate,
      toDate: query.toDate,
    });

    // Group by date for calendar display
    const byDate: Record<
      string,
      Array<{
        name: string;
        type?: string;
        scope?: string;
      }>
    > = {};

    for (const holiday of holidays) {
      const record = holiday as unknown as {
        startDate: string;
        endDate: string;
        type?: string;
        scope?: string;
        name?: string;
      };
      const startDate = new Date(`${record.startDate}T00:00:00Z`);
      const endDate = new Date(`${record.endDate}T00:00:00Z`);

      // Iterate through each day in the range
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateKey = current.toISOString().slice(0, 10);
        if (!byDate[dateKey]) {
          byDate[dateKey] = [];
        }
        byDate[dateKey].push({
          name: record.name || record.type || 'Holiday',
          type: record.type,
          scope: record.scope,
        });
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }

    return {
      fromDate: query.fromDate,
      toDate: query.toDate,
      events: byDate,
      count: holidays.length,
    };
  }

  /**
   * Get a summary of holidays by type for a date range.
   * Useful for dashboards and statistics.
   */
  async getSummary(
    actor: CalendarActor,
    query: { fromDate?: string; toDate?: string },
  ) {
    const holidays = await this.list(actor, query);

    const summary: Record<string, { label: string; count: number; days: number }> = {};

    for (const holiday of holidays) {
      const record = holiday as unknown as {
        startDate: string;
        endDate: string;
        type?: string;
        name?: string;
      };
      const type = record.type || 'other';

      if (!summary[type]) {
        summary[type] = { label: type, count: 0, days: 0 };
      }

      summary[type].count += 1;

      // Calculate days in this holiday
      const start = new Date(`${record.startDate}T00:00:00Z`);
      const end = new Date(`${record.endDate}T00:00:00Z`);
      const days = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
      summary[type].days += days;
    }

    return summary;
  }

  async remove(id: string, actor: CalendarActor) {
    const holiday = await AcademicHoliday.findById(id);
    if (!holiday) throw AppError.notFound('Academic holiday not found');
    await this.assertCanManageExisting(actor, holiday);

    await AcademicHoliday.findByIdAndDelete(id);

    await createAuditLog({
      userId: actor.userId,
      action: 'delete',
      entity: 'AcademicHoliday',
      entityId: id,
      previousData: holiday.toObject(),
      description: `Academic calendar entry "${holiday.name}" deleted`,
    });

    await this.notifyCalendarChange(holiday, 'deleted', actor.userId);
  }

  // ─── Overlap + notification helpers ─────────────────────────────

  /**
   * Find calendar entries whose date range intersects the supplied range in
   * the same scope (institution-wide or a specific hostel).
   */
  private async findOverlaps(
    startDate: Date,
    endDate: Date,
    scope: CalendarScope,
    hostelId: mongoose.Types.ObjectId | undefined,
    excludeId?: string,
  ) {
    const filter: Record<string, unknown> = {
      scope,
      hostelId: hostelId ?? null,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    };
    if (excludeId) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    const rows = await AcademicHoliday.find(filter)
      .select('name startDate endDate')
      .lean();

    return rows.filter((row) =>
      rangesOverlap(row.startDate, row.endDate, startDate, endDate),
    );
  }

  /** Reject an overlapping entry unless the caller explicitly confirmed it. */
  private async assertNoOverlap(
    startDate: Date,
    endDate: Date,
    scope: CalendarScope,
    hostelId: mongoose.Types.ObjectId | undefined,
    confirmOverlap: boolean | undefined,
    excludeId?: string,
  ) {
    if (confirmOverlap) return;

    const overlaps = await this.findOverlaps(startDate, endDate, scope, hostelId, excludeId);
    if (overlaps.length > 0) {
      const names = overlaps
        .slice(0, 3)
        .map((entry) => `"${entry.name}"`)
        .join(', ');
      throw AppError.conflict(
        `This date range overlaps with existing calendar ${overlaps.length === 1 ? 'entry' : 'entries'} (${names}). Confirm the overlap to save anyway.`,
      );
    }
  }

  /** Best-effort notification to wardens/chief wardens when the calendar changes. */
  private async notifyCalendarChange(
    holiday: { name: string; startDate: Date; endDate: Date; scope: CalendarScope },
    action: 'created' | 'updated' | 'deleted',
    actorId: string,
  ) {
    try {
      const recipients = await User.find({
        role: { $in: [UserRole.WARDEN, UserRole.CHIEF_WARDEN] },
        isActive: true,
      })
        .select('_id')
        .limit(100)
        .lean();

      const scopeLabel = holiday.scope === CalendarScope.INSTITUTION
        ? 'institution-wide'
        : 'hostel-specific';
      const message = `Academic calendar entry "${holiday.name}" (${scopeLabel}, ${toDateKey(holiday.startDate)} to ${toDateKey(holiday.endDate)}) was ${action}.`;

      for (const recipient of recipients) {
        if (String(recipient._id) === actorId) continue;
        await notificationService.create({
          userId: String(recipient._id),
          title: 'Academic Calendar Updated',
          message,
          type: NotificationType.CALENDAR_UPDATED,
          referenceModel: 'AcademicHoliday',
        });
      }
    } catch {
      // Notifications must never break calendar management.
    }
  }

  // ─── Authorization helpers ──────────────────────────────────────

  private assertInstitutionManager(actor: CalendarActor) {
    if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.CHIEF_WARDEN) {
      throw AppError.forbidden('Only an administrator or chief warden can manage institution-wide calendar entries');
    }
  }

  /** A warden may only manage hostels they are assigned to. */
  private async assertCanManageHostel(actor: CalendarActor, hostelId: string) {
    if (actor.role === UserRole.ADMIN || actor.role === UserRole.CHIEF_WARDEN) return;
    if (actor.role === UserRole.WARDEN) {
      const ids = await getWardenHostelIds(actor.userId);
      if (!ids.includes(hostelId)) {
        throw AppError.forbidden('You can only manage calendar entries for your assigned hostel');
      }
      return;
    }
    throw AppError.forbidden('Your role cannot manage academic calendar entries');
  }

  private async assertCanManageExisting(
    actor: CalendarActor,
    holiday: { scope: CalendarScope; hostelId?: unknown },
  ) {
    if (holiday.scope === CalendarScope.INSTITUTION) {
      this.assertInstitutionManager(actor);
      return;
    }
    const hostelId = holiday.hostelId ? String(holiday.hostelId) : '';
    if (!hostelId) {
      // Legacy/ambiguous hostel entry: restrict to institution managers.
      this.assertInstitutionManager(actor);
      return;
    }
    await this.assertCanManageHostel(actor, hostelId);
  }
}

export const academicHolidayService = new AcademicHolidayService();