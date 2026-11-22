/**
 * Presence Service
 *
 * API client for student hostel presence monitoring dashboard.
 * Provides methods for fetching absence metrics, hostel statistics, and student records.
 */

import api from './api';

export interface StudentAbsenceData {
  studentId: string;
  name: string;
  rollNumber: string;
  hostelId?: string;
  hostelName?: string;
  roomId?: string;
  roomNumber?: string;
  departmentId: string;
  courseId: string;
  phone?: string;
  currentPresenceStatus: string;
  actualExitTime?: string;
  actualReturnTime?: string;
  expectedReturnTime?: string;
  gatePassNumber?: string;
  leaveRequestStatus?: string;
}

export interface AbsenceMetrics {
  totalRegisteredStudents: number;
  currentlyOutside: number;
  returnedToday: number;
  overdueStudents: number;
  absentAtAnyPoint: number;
  approvedButNotExited: number;
}

export interface HostelStatistics {
  hostelId: string;
  hostelName: string;
  totalAssignedStudents: number;
  currentlyOutside: number;
  returnedToday: number;
  overdueStudents: number;
  absentAtAnyPoint: number;
  absencePercentage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class PresenceService {
  /**
   * Get dashboard overview metrics for a selected date.
   */
  async getDashboardOverview(
    selectedDate: string,
    hostelId?: string,
  ): Promise<AbsenceMetrics> {
    const params = new URLSearchParams({ selectedDate });
    if (hostelId) params.append('hostelId', hostelId);

    const res = await api.get(`/presence/dashboard-overview?${params.toString()}`);
    return res.data.data;
  }

  /**
   * Get hostel-wise statistics for a selected date.
   */
  async getHostelStatistics(
    selectedDate: string,
    hostelId?: string,
  ): Promise<HostelStatistics[]> {
    const params = new URLSearchParams({ selectedDate });
    if (hostelId) params.append('hostelId', hostelId);

    const res = await api.get(`/presence/hostel-statistics?${params.toString()}`);
    return res.data.data;
  }

  /**
   * Get students currently outside their hostel.
   */
  async getCurrentlyOutside(
    hostelId?: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<PaginatedResponse<StudentAbsenceData>> {
    const params = new URLSearchParams();
    if (hostelId) params.append('hostelId', hostelId);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);

    const res = await api.get(`/presence/currently-outside?${params.toString()}`);
    return {
      data: res.data.data,
      meta: res.data.meta,
    };
  }

  /**
   * Get overdue students.
   */
  async getOverdueStudents(
    hostelId?: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<PaginatedResponse<StudentAbsenceData & { overdueBy: string }>> {
    const params = new URLSearchParams();
    if (hostelId) params.append('hostelId', hostelId);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);

    const res = await api.get(`/presence/overdue-students?${params.toString()}`);
    return {
      data: res.data.data,
      meta: res.data.meta,
    };
  }

  /**
   * Get students who returned on the selected date.
   */
  async getReturnedToday(
    selectedDate: string,
    hostelId?: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<PaginatedResponse<StudentAbsenceData>> {
    const params = new URLSearchParams({ selectedDate });
    if (hostelId) params.append('hostelId', hostelId);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);

    const res = await api.get(`/presence/returned-today?${params.toString()}`);
    return {
      data: res.data.data,
      meta: res.data.meta,
    };
  }

  /**
   * Get all students absent at any point during the selected date.
   */
  async getDailyAbsenceHistory(
    selectedDate: string,
    hostelId?: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<PaginatedResponse<StudentAbsenceData>> {
    const params = new URLSearchParams({ selectedDate });
    if (hostelId) params.append('hostelId', hostelId);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);

    const res = await api.get(`/presence/daily-absence-history?${params.toString()}`);
    return {
      data: res.data.data,
      meta: res.data.meta,
    };
  }

  /**
   * Get students with approved leave but no recorded exit.
   */
  async getApprovedNotExited(
    selectedDate: string,
    hostelId?: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<PaginatedResponse<StudentAbsenceData>> {
    const params = new URLSearchParams({ selectedDate });
    if (hostelId) params.append('hostelId', hostelId);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);

    const res = await api.get(`/presence/approved-not-exited?${params.toString()}`);
    return {
      data: res.data.data,
      meta: res.data.meta,
    };
  }

  /**
   * Get detailed absence record for a specific student on a specific date.
   */
  async getStudentAbsenceDetail(
    studentId: string,
    selectedDate: string,
  ): Promise<StudentAbsenceData> {
    const params = new URLSearchParams({ selectedDate });
    const res = await api.get(`/presence/student/${studentId}?${params.toString()}`);
    return res.data.data;
  }
}

export const presenceApi = new PresenceService();
