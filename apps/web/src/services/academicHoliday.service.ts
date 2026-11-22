import api from './api';

export type AcademicHolidayType =
  | 'national'
  | 'festival'
  | 'institutional'
  | 'vacation'
  | 'other'
  | 'public_holiday'
  | 'semester_break'
  | 'summer_vacation'
  | 'winter_vacation'
  | 'examination'
  | 'working_day'
  | 'special_holiday';

export type CalendarScope = 'institution' | 'hostel';

export type DayClassification =
  | 'working_day'
  | 'weekend'
  | 'holiday'
  | 'vacation'
  | 'examination';

export interface AcademicHoliday {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
  type?: AcademicHolidayType;
  scope?: CalendarScope;
  hostelId?: { _id: string; name: string } | string | null;
  academicYear?: string;
  createdBy?: { _id: string; name: string; email: string; role: string };
}

export interface ClassifiedDay {
  date: string;
  weekday: number;
  classification: DayClassification;
  eventName?: string;
  eventType?: string;
}

export interface LeaveClassification {
  days: ClassifiedDay[];
  total: number;
  workingDays: number;
  holidays: number;
  vacationDays: number;
  weekendDays: number;
  examinationDays: number;
}

export interface CalendarViewEvent {
  name: string;
  type?: string;
  scope?: string;
}

export interface CalendarView {
  fromDate: string;
  toDate: string;
  events: Record<string, CalendarViewEvent[]>;
  count: number;
}

export interface CalendarSummary {
  [type: string]: { label: string; count: number; days: number };
}

export interface HolidayInput {
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
  type?: AcademicHolidayType;
  scope?: CalendarScope;
  hostelId?: string;
  academicYear?: string;
  confirmOverlap?: boolean;
}

export const academicHolidayApi = {
  list: async (params?: { fromDate?: string; toDate?: string }): Promise<AcademicHoliday[]> => {
    const response = await api.get<{ success: boolean; data: AcademicHoliday[] }>(
      '/academic-holidays',
      { params },
    );
    return response.data.data;
  },

  getCalendarView: async (
    fromDate: string,
    toDate: string,
    hostelId?: string,
  ): Promise<CalendarView> => {
    const response = await api.get<{ success: boolean; data: CalendarView }>(
      '/academic-holidays/calendar',
      { params: { fromDate, toDate, ...(hostelId ? { hostelId } : {}) } },
    );
    return response.data.data;
  },

  getCalendarSummary: async (
    fromDate: string,
    toDate: string,
  ): Promise<CalendarSummary> => {
    const response = await api.get<{ success: boolean; data: CalendarSummary }>(
      '/academic-holidays/summary',
      { params: { fromDate, toDate } },
    );
    return response.data.data;
  },

  classify: async (fromDate: string, toDate: string): Promise<LeaveClassification> => {
    const response = await api.get<{ success: boolean; data: LeaveClassification }>(
      '/academic-holidays/classify',
      { params: { fromDate, toDate } },
    );
    return response.data.data;
  },

  create: async (data: HolidayInput): Promise<AcademicHoliday> => {
    const response = await api.post<{ success: boolean; data: AcademicHoliday }>(
      '/academic-holidays',
      data,
    );
    return response.data.data;
  },

  update: async (id: string, data: Partial<HolidayInput>): Promise<AcademicHoliday> => {
    const response = await api.put<{ success: boolean; data: AcademicHoliday }>(
      `/academic-holidays/${id}`,
      data,
    );
    return response.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/academic-holidays/${id}`);
  },
};