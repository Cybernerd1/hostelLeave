/**
 * Absence Monitoring API Service
 *
 * Frontend service for communicating with the absence monitoring backend.
 */

import axios from 'axios';

const API_BASE_URL = '/api/v1/absence';

export interface AbsenceMetrics {
  totalRegisteredStudents: number;
  currentlyOutside: number;
  returnedToday: number;
  overdueReturns: number;
  dailyAbsentAtAnyPoint: number;
  approvedLeaveNotExited: number;
}

export interface StudentAbsenceRecord {
  _id: string;
  studentId: string;
  name: string;
  rollNumber: string;
  enrollmentNumber?: string;
  hostelName?: string;
  roomNumber?: string;
  phone?: string;
  exitTime?: Date;
  exitTimestamp?: string;
  expectedReturnTime?: Date;
  expectedReturnTimestamp?: string;
  returnTime?: Date;
  returnTimestamp?: string;
  gatePassNumber?: string;
  leaveStatus?: string;
  presenceStatus: 'in_hostel' | 'out_of_hostel' | 'overdue' | 'approved_not_exited';
  overdueDuration?: string;
  departmentId?: string;
  courseId?: string;
}

export interface HostelAbsenceStatistics {
  hostelId: string;
  hostelName: string;
  totalAssignedStudents: number;
  currentlyOutside: number;
  returnedToday: number;
  overdueStudents: number;
  dailyAbsentAtAnyPoint: number;
  absencePercentage: number;
}

export interface AbsenceDashboardData {
  selectedDate: string;
  metrics: AbsenceMetrics;
  hostelStats: HostelAbsenceStatistics[];
  studentRecords: {
    currentlyOutside: StudentAbsenceRecord[];
    overdueStudents: StudentAbsenceRecord[];
    returnedToday: StudentAbsenceRecord[];
    dailyAbsentHistory: StudentAbsenceRecord[];
    approvedNotExited: StudentAbsenceRecord[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class AbsenceService {
  /**
   * Get complete dashboard data for a selected date.
   */
  async getDashboard(params: {
    date: string;
    page?: number;
    limit?: number;
    hostelId?: string;
    tab?: string;
    search?: string;
    departmentId?: string;
    courseId?: string;
  }): Promise<AbsenceDashboardData> {
    const response = await axios.get(`${API_BASE_URL}/dashboard`, { params });
    return response.data.data;
  }

  /**
   * Get just the metrics for a date (lightweight).
   */
  async getMetrics(params: {
    date: string;
    hostelId?: string;
  }): Promise<{ selectedDate: string; metrics: AbsenceMetrics }> {
    const response = await axios.get(`${API_BASE_URL}/metrics`, { params });
    return response.data.data;
  }

  /**
   * Get hostel-wise statistics for a date.
   */
  async getHostelStats(params: {
    date: string;
  }): Promise<{ selectedDate: string; hostelStats: HostelAbsenceStatistics[] }> {
    const response = await axios.get(`${API_BASE_URL}/hostels`, { params });
    return response.data.data;
  }

  /**
   * Get student records for a specific tab.
   */
  async getStudentRecords(params: {
    tab: string;
    date: string;
    page?: number;
    limit?: number;
    hostelId?: string;
    search?: string;
    departmentId?: string;
    courseId?: string;
  }): Promise<{
    selectedDate: string;
    students: StudentAbsenceRecord[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await axios.get(`${API_BASE_URL}/students/${params.tab}`, {
      params: {
        date: params.date,
        page: params.page,
        limit: params.limit,
        hostelId: params.hostelId,
        search: params.search,
        departmentId: params.departmentId,
        courseId: params.courseId,
      },
    });
    return response.data.data;
  }
}

export const absenceService = new AbsenceService();
