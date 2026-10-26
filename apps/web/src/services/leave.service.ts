/**
 * Leave API Service
 *
 * Methods for leave request endpoints including PDF download.
 */

import api from './api';

/**
 * Matches the populated LeaveApproval document returned by GET /leaves/:id
 * approverId is populated with { name, email, role }
 */
export interface LeaveApprovalEntry {
  _id: string;
  approverId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  /** The approver's UserRole (same as approverId.role) */
  role: string;
  /** 'approved' | 'rejected' */
  action: string;
  remarks?: string;
  actionDate: string;
}

export interface LeaveRequest {
  _id: string;
  leaveId: string;
  studentId: {
    _id: string;
    name: string;
    rollNumber: string;
    phone: string;
    departmentId?: { name: string };
    courseId?: { name: string };
    hostelId?: { name: string };
    roomId?: { roomNumber: string };
    /** userId of the User document (for PDF ownership check) */
    userId?: string;
  };
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  destination: string;
  attendance?: number;
  status: string;
  documents?: string[];
  approvals?: LeaveApprovalEntry[];
  exitTime?: string;
  entryTime?: string;
  createdAt: string;
  updatedAt: string;
}


export const leaveApi = {
  getById: async (id: string): Promise<LeaveRequest> => {
    const response = await api.get<{ success: boolean; data: LeaveRequest }>(`/leaves/${id}`);
    return response.data.data;
  },

  getMyLeaves: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get<{ success: boolean; data: LeaveRequest[]; pagination: unknown }>(
      '/leaves/my',
      { params },
    );
    return response.data;
  },

  /**
   * Download approved leave PDF.
   * Returns a Blob that the caller can create an object URL from.
   */
  downloadPDF: async (leaveId: string): Promise<Blob> => {
    const response = await api.get(`/leaves/${leaveId}/pdf`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  cancelLeave: async (id: string, reason: string) => {
    const response = await api.put(`/leaves/${id}/cancel`, { reason });
    return response.data;
  },

  processApproval: async (
    id: string,
    action: 'approve' | 'reject' | 'approved' | 'rejected',
    remarks?: string,
  ) => {
    const normalizedAction =
      action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action;
    const response = await api.put(`/leaves/${id}/approve`, { action: normalizedAction, remarks });
    return response.data;
  },

  getAll: async (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const response = await api.get<{ success: boolean; data: LeaveRequest[]; pagination: unknown }>(
      '/leaves',
      { params },
    );
    return response.data;
  },

  getPending: async () => {
    const response = await api.get<{ success: boolean; data: LeaveRequest[] }>('/leaves/pending');
    return response.data.data ?? [];
  },

  getStats: async (): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    active: number;
  }> => {
    const response = await api.get<{ success: boolean; data: Record<string, number> }>('/leaves/stats');
    return response.data.data as {
      total: number; pending: number; approved: number; rejected: number; active: number;
    };
  },
};

