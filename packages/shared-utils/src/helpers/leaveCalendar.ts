/**
 * Leave ↔ Academic Calendar mapping helpers.
 *
 * Pure, side-effect-free functions used to classify the days of a leave
 * request against the saved academic calendar. No holidays are hardcoded:
 * every classification derives from the supplied calendar entries.
 *
 * Dates are handled as calendar-day keys ("YYYY-MM-DD") to avoid timezone
 * drift between server and browser.
 */

import { DayClassification, HolidayType } from '@hostel/shared-types';

export interface CalendarEventLike {
  startDate: string | Date;
  endDate: string | Date;
  /** Human-readable event title, e.g. "Diwali Break". */
  name?: string;
  type?: string;
  scope?: string;
  hostelId?: string | null;
}

export interface DayInfo {
  /** Calendar-day key, e.g. "2026-12-20". */
  date: string;
  /** 0 = Sunday … 6 = Saturday (UTC day of week). */
  weekday: number;
  classification: DayClassification;
  /** The matching calendar event title/type, if any. */
  eventName?: string;
  eventType?: string;
}

export interface LeaveDayClassification {
  days: DayInfo[];
  total: number;
  workingDays: number;
  holidays: number;
  vacationDays: number;
  weekendDays: number;
  examinationDays: number;
}

/** Convert a Date or string to a YYYY-MM-DD key using UTC. */
export function toDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Build a Date from a YYYY-MM-DD key at UTC midnight. */
export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Add `amount` days to a YYYY-MM-DD key. */
export function addDaysToKey(key: string, amount: number): string {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

/**
 * Whether two inclusive date ranges overlap. Accepts day keys or dates.
 * Used by the academic calendar to warn about overlapping entries.
 */
export function rangesOverlap(
  aStart: string | Date,
  aEnd: string | Date,
  bStart: string | Date,
  bEnd: string | Date,
): boolean {
  return toDateKey(aStart) <= toDateKey(bEnd) && toDateKey(bStart) <= toDateKey(aEnd);
}

/** Expand an inclusive [startKey, endKey] range into an array of day keys. */
export function expandDateRange(startKey: string, endKey: string): string[] {
  const days: string[] = [];
  if (!startKey || !endKey) return days;
  let cursor = startKey;
  // Guard against runaway loops on malformed input.
  let guard = 0;
  while (cursor <= endKey && guard < 1000) {
    days.push(cursor);
    cursor = addDaysToKey(cursor, 1);
    guard += 1;
  }
  return days;
}

function eventCoversDay(event: CalendarEventLike, dayKey: string): boolean {
  const start = toDateKey(event.startDate);
  const end = toDateKey(event.endDate);
  return dayKey >= start && dayKey <= end;
}

const VACATION_TYPES = new Set<string>([
  HolidayType.VACATION,
  HolidayType.SEMESTER_BREAK,
  HolidayType.SUMMER_VACATION,
  HolidayType.WINTER_VACATION,
]);

const EXAMINATION_TYPES = new Set<string>([HolidayType.EXAMINATION]);

const WORKING_TYPES = new Set<string>([HolidayType.WORKING_DAY]);

/**
 * Determine whether an event type represents a working day. Any recognised
 * non-working type makes the day a holiday; `working_day` / `examination`
 * keep it a working day.
 */
function isWorkingEventType(type?: string): boolean {
  if (!type) return false;
  if (WORKING_TYPES.has(type)) return true;
  if (EXAMINATION_TYPES.has(type)) return true;
  return false;
}

/**
 * Classify each day of a leave request against the academic calendar.
 *
 * Rules (priority order): examination/working-day override, vacation, holiday,
 * weekend, then default working day. Overlapping events: the first matching
 * non-working event in the provided list wins for the event label, but a
 * later working-day/exam event still marks the day as a working day.
 */
export function classifyLeaveDays(
  fromDate: string | Date,
  toDate: string | Date,
  events: CalendarEventLike[],
): LeaveDayClassification {
  const startKey = toDateKey(fromDate);
  const endKey = toDateKey(toDate);
  const dayKeys = expandDateRange(startKey, endKey);

  const days: DayInfo[] = dayKeys.map((key) => {
    const weekday = dateFromKey(key).getUTCDay(); // 0 Sun … 6 Sat
    const isWeekend = weekday === 0 || weekday === 6;

    const matches = events.filter((event) => eventCoversDay(event, key));

    // A working-day / examination marker forces a working day.
    const workingMatch = matches.find(
      (event) => event.type && isWorkingEventType(event.type),
    );

    let classification: DayClassification;
    let eventName: string | undefined;
    let eventType: string | undefined;

    if (workingMatch) {
      classification =
        workingMatch.type && EXAMINATION_TYPES.has(workingMatch.type)
          ? DayClassification.EXAMINATION
          : DayClassification.WORKING_DAY;
      eventName = workingMatch.name || workingMatch.type;
      eventType = workingMatch.type;
    } else if (matches.length > 0) {
      const chosen = matches[0];
      eventType = chosen.type;
      eventName = chosen.name || chosen.type;
      if (chosen.type && VACATION_TYPES.has(chosen.type)) {
        classification = DayClassification.VACATION;
      } else {
        classification = DayClassification.HOLIDAY;
      }
    } else if (isWeekend) {
      classification = DayClassification.WEEKEND;
    } else {
      classification = DayClassification.WORKING_DAY;
    }

    return { date: key, weekday, classification, eventName, eventType };
  });

  let workingDays = 0;
  let holidays = 0;
  let vacationDays = 0;
  let weekendDays = 0;
  let examinationDays = 0;

  for (const day of days) {
    switch (day.classification) {
      case DayClassification.WORKING_DAY:
        workingDays += 1;
        break;
      case DayClassification.HOLIDAY:
        holidays += 1;
        break;
      case DayClassification.VACATION:
        vacationDays += 1;
        break;
      case DayClassification.WEEKEND:
        weekendDays += 1;
        break;
      case DayClassification.EXAMINATION:
        examinationDays += 1;
        workingDays += 1;
        break;
      default:
        break;
    }
  }

  return {
    days,
    total: days.length,
    workingDays,
    holidays,
    vacationDays,
    weekendDays,
    examinationDays,
  };
}