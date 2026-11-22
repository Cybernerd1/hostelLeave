import {
  classifyLeaveDays,
  expandDateRange,
  toDateKey,
} from '@hostel/shared-utils';
import { DayClassification, HolidayType } from '@hostel/shared-types';

describe('classifyLeaveDays', () => {
  it('treats plain weekdays inside a Mon–Fri range as working days', () => {
    // 2026-11-16 is a Monday, 2026-11-20 a Friday.
    const result = classifyLeaveDays('2026-11-16', '2026-11-20', []);

    expect(result.total).toBe(5);
    expect(result.workingDays).toBe(5);
    expect(result.holidays).toBe(0);
    expect(result.weekendDays).toBe(0);
    expect(result.days.every((d) => d.classification === DayClassification.WORKING_DAY)).toBe(true);
  });

  it('marks Saturday and Sunday as weekend days', () => {
    const result = classifyLeaveDays('2026-11-21', '2026-11-22', []);

    expect(result.total).toBe(2);
    expect(result.weekendDays).toBe(2);
    expect(result.workingDays).toBe(0);
    expect(result.days.map((d) => d.classification)).toEqual([
      DayClassification.WEEKEND,
      DayClassification.WEEKEND,
    ]);
  });

  it('classifies a saved holiday event as a holiday, not a working day', () => {
    const result = classifyLeaveDays('2026-11-16', '2026-11-18', [
      {
        startDate: '2026-11-17',
        endDate: '2026-11-17',
        type: HolidayType.NATIONAL,
      },
    ]);

    expect(result.total).toBe(3);
    expect(result.workingDays).toBe(2);
    expect(result.holidays).toBe(1);
    expect(result.days[1].classification).toBe(DayClassification.HOLIDAY);
  });

  it('classifies vacation categories separately from ordinary holidays', () => {
    const result = classifyLeaveDays('2026-12-24', '2026-12-28', [
      {
        startDate: '2026-12-24',
        endDate: '2026-12-28',
        type: HolidayType.WINTER_VACATION,
      },
    ]);

    expect(result.vacationDays).toBe(5);
    expect(result.holidays).toBe(0);
    expect(result.workingDays).toBe(0);
  });

  it('lets an examination marker override a weekend so it counts as a working day', () => {
    const result = classifyLeaveDays('2026-11-21', '2026-11-21', [
      { startDate: '2026-11-21', endDate: '2026-11-21', type: HolidayType.EXAMINATION },
    ]);

    expect(result.examinationDays).toBe(1);
    expect(result.workingDays).toBe(1);
    expect(result.weekendDays).toBe(0);
  });

  it('lets a working_day marker override a saved holiday', () => {
    const result = classifyLeaveDays('2026-11-17', '2026-11-17', [
      { startDate: '2026-11-17', endDate: '2026-11-17', type: HolidayType.FESTIVAL },
      { startDate: '2026-11-17', endDate: '2026-11-17', type: HolidayType.WORKING_DAY },
    ]);

    expect(result.workingDays).toBe(1);
    expect(result.holidays).toBe(0);
  });

  it('ignores calendar events outside the requested range', () => {
    const result = classifyLeaveDays('2026-11-16', '2026-11-16', [
      { startDate: '2027-01-01', endDate: '2027-01-05', type: HolidayType.NATIONAL },
    ]);

    expect(result.workingDays).toBe(1);
    expect(result.holidays).toBe(0);
  });

  it('expands multi-day holiday ranges across the whole span', () => {
    const result = classifyLeaveDays('2026-12-24', '2026-12-26', [
      { startDate: '2026-12-24', endDate: '2026-12-26', type: HolidayType.FESTIVAL },
    ]);

    expect(result.total).toBe(3);
    expect(result.holidays).toBe(3);
  });

  it('returns a day-by-day entry for every requested day', () => {
    const result = classifyLeaveDays('2026-11-16', '2026-11-18', []);

    expect(result.days).toHaveLength(3);
    expect(result.days.map((d) => d.date)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
    ]);
  });
});

describe('date range helpers', () => {
  it('expands an inclusive range of day keys', () => {
    expect(expandDateRange('2026-11-16', '2026-11-18')).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
    ]);
  });

  it('returns an empty list for an inverted range', () => {
    expect(expandDateRange('2026-11-18', '2026-11-16')).toEqual([]);
  });

  it('serialises dates to UTC day keys', () => {
    expect(toDateKey(new Date('2026-11-16T23:30:00Z'))).toBe('2026-11-16');
  });
});