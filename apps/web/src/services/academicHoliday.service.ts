import api from './api';

export type AcademicHolidayType = 'national' | 'festival' | 'institutional' | 'vacation' | 'other';

export interface AcademicHoliday {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
  type?: AcademicHolidayType;
  createdBy?: { _id: string; name: string; email: string; role: string };
}

export const academicHolidayApi = {
  list: async (params?: { fromDate?: string; toDate?: string }): Promise<AcademicHoliday[]> => {
    const response = await api.get<{ success: boolean; data: AcademicHoliday[] }>(
      '/academic-holidays',
      { params },
    );
    return response.data.data;
  },

  create: async (
    data: Omit<AcademicHoliday, '_id' | 'createdBy'> & { confirmOverlap?: boolean },
  ): Promise<AcademicHoliday> => {
    const response = await api.post<{ success: boolean; data: AcademicHoliday }>(
      '/academic-holidays',
      data,
    );
    return response.data.data;
  },

  update: async (
    id: string,
    data: Partial<Omit<AcademicHoliday, '_id' | 'createdBy'>> & { confirmOverlap?: boolean },
  ): Promise<AcademicHoliday> => {
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
