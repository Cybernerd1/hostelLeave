/**
 * Admin API Service
 *
 * Wraps all /api/v1/admin/* endpoints.
 */

import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────

export interface StudentRecord {
  _id: string;
  rollNumber: string;
  studentNumber?: string;
  name: string;
  phone: string;
  gender: string;
  year: number;
  semester: string;
  admissionYear: number;
  bloodGroup?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  dateOfBirth?: string;
  admissionNumber?: string;
  academicSession?: string;
  fatherName?: string;
  fatherEmail?: string;
  fatherPhone?: string;
  motherName?: string;
  motherEmail?: string;
  motherPhone?: string;
  guardianAddressLine1?: string;
  guardianAddressLine2?: string;
  guardianCity?: string;
  guardianState?: string;
  guardianPincode?: string;
  guardianCountry?: string;
  applicationStatus: 'pending' | 'approved' | 'rejected' | 'allocated';
  allocationStatus?: 'none' | 'active' | 'transferred' | 'ended';
  allocatedAt?: string;
  allocatedBy?: { _id: string; name: string; email?: string; role?: string };
  isActive: boolean;
  createdAt: string;
  departmentId?: { _id: string; name: string; code: string };
  courseId?: { _id: string; name: string; code: string };
  hostelId?: { _id: string; name: string; type: string };
  roomId?: { _id: string; roomNumber: string; floor: string };
  parentId?: { _id: string; name: string; phone: string; email: string };
  userId?: { _id: string; email: string; role: string; isActive: boolean };
}

export interface ParentRecord {
  _id: string;
  name: string;
  phone: string;
  email: string;
  relation: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isActive: boolean;
  createdAt: string;
  userId?: { _id: string; email: string };
}

export interface DepartmentRecord {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface CourseRecord {
  _id: string;
  name: string;
  code: string;
  duration: number;
  totalSemesters: number;
  isActive: boolean;
  departmentId?: { _id: string; name: string; code: string };
}

export interface HostelRecord {
  _id: string;
  name: string;
  type: string;
  totalRooms: number;
  studentsPerRoom: 1 | 2 | 3;
  capacity: number;
  occupancy: number;
  occupiedSeats: number;
  availableSeats: number;
  fullyOccupiedRooms: number;
  occupancyPercentage: number;
  isActive: boolean;
  address?: string;
  contactNumber?: string;
  wardenId?: { _id: string; name: string; email: string };
  chiefWardenId?: { _id: string; name: string; email: string };
}

export interface RoomRecord {
  _id: string;
  roomNumber: string;
  floor: string;
  type: string;
  capacity: number;
  occupied: number;
  availableSeats: number;
  occupancyStatus: 'Available' | 'Partially Occupied' | 'Full';
  isActive: boolean;
  hostelId?: { _id: string; name: string };
  students?: Array<{ _id: string; name: string; rollNumber: string; studentNumber?: string; email?: string }>;
}

export interface AllocationCandidate {
  _id: string;
  name: string;
  rollNumber: string;
  studentNumber?: string;
  gender: string;
  hostelId?: string;
  roomId?: string;
  applicationStatus: string;
}

export interface StaffRecord {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
}

export interface ApplicationRecord {
  _id: string;
  applicationNumber: string;
  status: string;
  source: string;
  fullName: string;
  studentNumber: string;
  admissionNumber?: string;
  email: string;
  phoneNumber: string;
  gender: string;
  bloodGroup?: string;
  dateOfBirth?: string;
  city: string;
  residentialAddress: string;
  departmentId?: { _id: string; name: string; code: string };
  courseId?: { _id: string; name: string; code: string };
  yearOfStudy: number;
  semester: string;
  admissionYear: number;
  academicSession?: string;
  fatherName?: string;
  fatherEmail?: string;
  fatherPhone?: string;
  motherName?: string;
  motherEmail?: string;
  motherPhone?: string;
  guardianAddressLine1?: string;
  guardianAddressLine2?: string;
  guardianCity?: string;
  guardianState?: string;
  guardianPincode?: string;
  guardianCountry?: string;
  hostelId?: { _id: string; name: string; type: string };
  roomId?: { _id: string; roomNumber: string; floor: string };
  reviewedBy?: { _id: string; name: string; email: string };
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  allocatedAt?: string;
  allocatedBy?: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationFormRecord {
  _id: string;
  title: string;
  description?: string;
  token: string;
  academicSession?: string;
  isActive: boolean;
  expiresAt?: string;
  submissionLimit?: number;
  submissionCount: number;
  requiredFields: string[];
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRecord {
  _id: string;
  userId: { _id: string; name: string; email: string; role: string } | string;
  action: string;
  entity: string;
  entityId?: string;
  description: string;
  createdAt: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalParents: number;
  totalDepartments: number;
  totalHostels: number;
  totalRooms: number;
  totalBedCapacity: number;
  occupiedSeats: number;
  availableSeats: number;
  fullyOccupiedRooms: number;
  studentsAwaitingAllocation: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  allocatedStudents: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Service ──────────────────────────────────────────────────────────────

export const adminApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await api.get<{ success: boolean; data: DashboardStats }>('/admin/dashboard');
    return res.data.data;
  },

  // Students
  getStudents: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    hostelId?: string;
  }): Promise<PaginatedResponse<StudentRecord>> => {
    const res = await api.get('/admin/students', { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  getStudentById: async (id: string): Promise<StudentRecord> => {
    const res = await api.get<{ success: boolean; data: StudentRecord }>(`/admin/students/${id}`);
    return res.data.data;
  },

  assignParentToStudent: async (studentId: string, parentId: string): Promise<void> => {
    await api.put(`/admin/students/${studentId}/assign-parent`, { parentId });
  },

  // Chief Warden: assign (or null to unassign) a hostel to a student
  assignHostelToStudent: async (studentId: string, hostelId: string | null): Promise<StudentRecord> => {
    const res = await api.put<{ success: boolean; data: StudentRecord }>(
      `/admin/students/${studentId}/assign-hostel`,
      { hostelId },
    );
    return res.data.data;
  },

  // Parents
  getParents: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<ParentRecord>> => {
    const res = await api.get('/admin/parents', { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  // Departments
  getDepartments: async (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<DepartmentRecord>> => {
    const res = await api.get('/admin/departments', { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  createDepartment: async (data: { name: string; code: string; description?: string }): Promise<DepartmentRecord> => {
    const res = await api.post<{ success: boolean; data: DepartmentRecord }>('/admin/departments', data);
    return res.data.data;
  },

  updateDepartment: async (id: string, data: Partial<{ name: string; code: string; description: string; isActive: boolean }>): Promise<DepartmentRecord> => {
    const res = await api.put<{ success: boolean; data: DepartmentRecord }>(`/admin/departments/${id}`, data);
    return res.data.data;
  },

  deleteDepartment: async (id: string): Promise<DepartmentRecord> => {
    const res = await api.delete<{ success: boolean; data: DepartmentRecord }>(`/admin/departments/${id}`);
    return res.data.data;
  },

  // Courses
  getCourses: async (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<CourseRecord>> => {
    const res = await api.get('/admin/courses', { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  createCourse: async (data: { name: string; code: string; departmentId: string; duration: number; totalSemesters: number; description?: string }): Promise<CourseRecord> => {
    const res = await api.post<{ success: boolean; data: CourseRecord }>('/admin/courses', data);
    return res.data.data;
  },

  updateCourse: async (id: string, data: Partial<{ name: string; code: string; departmentId: string; duration: number; totalSemesters: number; description: string; isActive: boolean }>): Promise<CourseRecord> => {
    const res = await api.put<{ success: boolean; data: CourseRecord }>(`/admin/courses/${id}`, data);
    return res.data.data;
  },

  deleteCourse: async (id: string): Promise<CourseRecord> => {
    const res = await api.delete<{ success: boolean; data: CourseRecord }>(`/admin/courses/${id}`);
    return res.data.data;
  },

  // Hostels
  getHostels: async (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<HostelRecord>> => {
    const res = await api.get('/admin/hostels', { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  getHostelsWithWardens: async (): Promise<HostelRecord[]> => {
    const res = await api.get('/admin/hostels', { params: { limit: 100 } });
    return res.data.data as HostelRecord[];
  },

  createHostel: async (data: {
    name: string;
    type: string;
    totalRooms: number;
    studentsPerRoom: 1 | 2 | 3;
  }): Promise<HostelRecord> => {
    const res = await api.post<{ success: boolean; data: HostelRecord }>('/admin/hostels', data);
    return res.data.data;
  },

  updateHostel: async (id: string, data: Partial<{
    name: string;
    type: string;
    totalRooms: number;
    studentsPerRoom: 1 | 2 | 3;
    isActive: boolean;
  }>): Promise<HostelRecord> => {
    const res = await api.put<{ success: boolean; data: HostelRecord }>(`/admin/hostels/${id}`, data);
    return res.data.data;
  },

  deleteHostel: async (id: string): Promise<void> => {
    await api.delete(`/admin/hostels/${id}`);
  },

  // Chief Warden: create warden
  createWarden: async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<StaffRecord> => {
    const res = await api.post<{ success: boolean; data: StaffRecord }>('/admin/wardens', { ...data, role: 'warden' });
    return res.data.data;
  },

  // Chief Warden: assign warden to hostel
  assignWardenToHostel: async (hostelId: string, wardenId: string | null): Promise<HostelRecord> => {
    const res = await api.put<{ success: boolean; data: HostelRecord }>(`/admin/hostels/${hostelId}/assign-warden`, { wardenId });
    return res.data.data;
  },

  // Rooms
  getRooms: async (params?: { page?: number; limit?: number; hostelId?: string; search?: string; availability?: string }): Promise<PaginatedResponse<RoomRecord>> => {
    const res = await api.get('/admin/rooms', { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  getHostelRooms: async (hostelId: string, params?: { search?: string }): Promise<RoomRecord[]> => {
    const res = await api.get<{ success: boolean; data: RoomRecord[] }>(`/admin/hostels/${hostelId}/rooms`, { params });
    return res.data.data;
  },

  updateRoom: async (id: string, data: Partial<{ roomNumber: string; floor: string; capacity: 1 | 2 | 3; isActive: boolean }>): Promise<RoomRecord> => {
    const res = await api.put<{ success: boolean; data: RoomRecord }>(`/admin/rooms/${id}`, data);
    return res.data.data;
  },

  deleteRoom: async (id: string): Promise<void> => {
    await api.delete(`/admin/rooms/${id}`);
  },

  getAllocationCandidates: async (): Promise<AllocationCandidate[]> => {
    const res = await api.get<{ success: boolean; data: AllocationCandidate[] }>('/admin/students/allocation-candidates');
    return res.data.data;
  },

  getAvailableHostels: async (): Promise<Array<{
    _id: string;
    name: string;
    type: string;
    roomsAvailable: number;
    seatsRemaining: number;
  }>> => {
    const res = await api.get('/admin/hostels/available');
    return res.data.data;
  },

  getAvailableRooms: async (hostelId: string): Promise<RoomRecord[]> => {
    const res = await api.get<{ success: boolean; data: RoomRecord[] }>(`/admin/hostels/${hostelId}/available-rooms`);
    return res.data.data;
  },

  // Staff
  getStaff: async (role?: string): Promise<StaffRecord[]> => {
    const res = await api.get<{ success: boolean; data: StaffRecord[] }>('/admin/staff', { params: role ? { role } : undefined });
    return res.data.data;
  },

  // Audit Logs
  getAuditLogs: async (params?: {
    page?: number;
    limit?: number;
    action?: string;
    entity?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<PaginatedResponse<AuditLogRecord>> => {
    const res = await api.get('/admin/audit-logs', { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  // ─── Student Registration ──────────────────────────────────────────────

  registerStudent: async (data: Record<string, unknown>): Promise<ApplicationRecord> => {
    const res = await api.post<{ success: boolean; data: ApplicationRecord }>('/admin/students/register', data);
    return res.data.data;
  },

  previewImport: async (records: Record<string, unknown>[]): Promise<any[]> => {
    const res = await api.post<{ success: boolean; data: any[] }>('/admin/students/import/preview', { records });
    return res.data.data;
  },

  importStudents: async (records: Record<string, unknown>[]): Promise<any> => {
    const res = await api.post<{ success: boolean; data: any }>('/admin/students/import', { records });
    return res.data.data;
  },

  // ─── Application Approval Workflow ─────────────────────────────────────

  getApplications: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    source?: string;
    departmentId?: string;
    courseId?: string;
    hostelId?: string;
  }): Promise<PaginatedResponse<ApplicationRecord>> => {
    const res = await api.get('/admin/applications', { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  getApplicationById: async (id: string): Promise<ApplicationRecord> => {
    const res = await api.get<{ success: boolean; data: ApplicationRecord }>(`/admin/applications/${id}`);
    return res.data.data;
  },

  approveRejectApplication: async (id: string, data: {
    action: 'approve' | 'reject';
    reviewNotes?: string;
    rejectionReason?: string;
    hostelId?: string;
    roomId?: string;
  }): Promise<ApplicationRecord> => {
    const res = await api.post<{ success: boolean; data: ApplicationRecord }>(
      `/admin/applications/${id}/approve-reject`,
      data,
    );
    return res.data.data;
  },

  // ─── Hostel and Room Allocation ────────────────────────────────────────

  allocateRoom: async (studentId: string, data: {
    hostelId: string;
    roomId: string;
    reason: string;
  }): Promise<StudentRecord> => {
    const res = await api.post<{ success: boolean; data: StudentRecord }>(
      `/admin/students/${studentId}/allocate`,
      data,
    );
    return res.data.data;
  },

  allocateApplication: async (applicationId: string, data: {
    hostelId: string;
    roomId: string;
    reason: string;
  }): Promise<StudentRecord> => {
    const res = await api.post<{ success: boolean; data: StudentRecord }>(`/admin/applications/${applicationId}/allocate`, data);
    return res.data.data;
  },

  getStudentAllocation: async (studentId: string): Promise<{ student: StudentRecord; history: Array<Record<string, unknown>> }> => {
    const res = await api.get(`/admin/students/${studentId}/allocation`);
    return res.data.data;
  },

  removeStudentFromRoom: async (studentId: string): Promise<StudentRecord> => {
    const res = await api.delete<{ success: boolean; data: StudentRecord }>(`/admin/students/${studentId}/room`);
    return res.data.data;
  },

  // ─── Registration Form Management ──────────────────────────────────────

  createRegistrationForm: async (data: Record<string, unknown>): Promise<RegistrationFormRecord> => {
    const res = await api.post<{ success: boolean; data: RegistrationFormRecord }>('/admin/registration-forms', data);
    return res.data.data;
  },

  getRegistrationForms: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<RegistrationFormRecord>> => {
    const res = await api.get('/admin/registration-forms', { params });
    return { data: res.data.data, pagination: res.data.pagination };
  },

  updateRegistrationForm: async (id: string, data: Record<string, unknown>): Promise<RegistrationFormRecord> => {
    const res = await api.put<{ success: boolean; data: RegistrationFormRecord }>(
      `/admin/registration-forms/${id}`,
      data,
    );
    return res.data.data;
  },

  // ─── Public Registration ───────────────────────────────────────────────

  getPublicFormConfig: async (token: string): Promise<any> => {
    const res = await api.get<{ success: boolean; data: any }>(`/admin/registration-forms/${token}/config`);
    return res.data.data;
  },

  submitPublicRegistration: async (token: string, data: Record<string, unknown>): Promise<any> => {
    const res = await api.post<{ success: boolean; data: any }>(
      `/admin/registration-forms/${token}/submit`,
      data,
    );
    return res.data.data;
  },
};
