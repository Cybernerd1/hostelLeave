/**
 * Gate Pass API Service
 * 
 * Manages gate pass lifecycle: from generation on leave approval, through exit/return
 * registration, and includes dashboard and history views with overdue status tracking.
 */

import api from './api';

export type GatePassStatus = 'approved' | 'out_of_hostel' | 'returned' | 'overdue' | 'cancelled';
export type EffectiveGatePassStatus = GatePassStatus;

export interface GatePass {
  _id: string;
  gatePassNumber: string;
  leaveRequestId: {
    _id: string;
    leaveId: string;
    fromDate: string;
    toDate: string;
    status: string;
    leaveType?: string;
    reason?: string;
    destination?: string;
  } | string;
  studentId: {
    _id: string;
    name: string;
    rollNumber: string;
    phone?: string;
  } | string;
  hostelId?: { _id: string; name: string } | string;
  status: GatePassStatus;
  /** Effective status computed server-side: OUT_OF_HOSTEL becomes OVERDUE if past expectedReturn. */
  effectiveStatus?: EffectiveGatePassStatus;
  approvedDeparture: string;
  expectedReturn: string;
  actualExitTime?: string;
  actualReturnTime?: string;
  exitVerifiedBy?: { _id: string; name: string; role?: string } | string;
  returnVerifiedBy?: { _id: string; name: string; role?: string } | string;
  exitRemarks?: string;
  returnRemarks?: string;
  cancelledAt?: string;
  /** Timestamp of the last overdue notification sent for this pass. */
  overdueNotifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GatePassSummary {
  total: number;
  approved: number;
  out_of_hostel: number;
  returned: number;
  overdue: number;
  expected_exits_today: number;
  expected_returns_today: number;
}

export interface GatePassDashboard {
  summary: GatePassSummary;
  data: GatePass[];
  pagination: { page: number; totalPages: number; total: number };
}

/**
 * Compute effective gate pass status on the frontend.
 * A stored OUT_OF_HOSTEL pass whose expected return day has fully elapsed
 * is treated as OVERDUE until an actual return is recorded.
 * 
 * Note: The server computes this, so this is primarily for display consistency
 * if the API response doesn't include effectiveStatus.
 */
export function computeEffectiveGatePassStatus(
  pass: { status: GatePassStatus; actualReturnTime?: string | null; expectedReturn: string },
  now: Date = new Date(),
): EffectiveGatePassStatus {
  if (pass.status === 'out_of_hostel' && !pass.actualReturnTime) {
    const expectedReturnTime = new Date(pass.expectedReturn);
    expectedReturnTime.setUTCHours(23, 59, 59, 999);
    if (expectedReturnTime.getTime() < now.getTime()) {
      return 'overdue';
    }
  }
  return pass.status;
}

export const gatePassApi = {
  getDashboard: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    hostelId?: string;
    studentId?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<GatePassDashboard> => {
    const response = await api.get<{ success: boolean; data: GatePassDashboard }>(
      '/gate-passes',
      { params },
    );
    return response.data.data;
  },

  getHistory: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    hostelId?: string;
    studentId?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<GatePassDashboard> => {
    const response = await api.get<{ success: boolean; data: GatePassDashboard }>(
      '/gate-passes/history',
      { params },
    );
    return response.data.data;
  },

  getById: async (id: string): Promise<GatePass | null> => {
    const response = await api.get<{ success: boolean; data: GatePass | null }>(
      `/gate-passes/${id}`,
    );
    return response.data.data;
  },

  getByLeave: async (leaveId: string): Promise<GatePass | null> => {
    const response = await api.get<{ success: boolean; data: GatePass | null }>(
      `/gate-passes/leave/${leaveId}`,
    );
    return response.data.data;
  },
};