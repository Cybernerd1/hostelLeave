/**
 * API Response Types
 *
 * Standardized response wrappers used by all API endpoints.
 * Ensures consistent response structure across the entire API.
 */

/** Standard API success response */
export interface ApiResponse<T = null> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

/** Standard API error response */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  errors?: ValidationError[];
  stack?: string;
  timestamp: string;
}

/** Validation error detail */
export interface ValidationError {
  field: string;
  message: string;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  success: true;
  message: string;
  data: T[];
  pagination: PaginationMeta;
  timestamp: string;
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Auth response with tokens */
export interface AuthResponse {
  user: {
    _id: string;
    email: string;
    role: string;
    isActive: boolean;
    profile?: Record<string, unknown>;
  };
  accessToken: string;
  refreshToken: string;
}

/** Token refresh response */
export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/** Dashboard stats response */
export interface DashboardStats {
  totalStudents: number;
  totalLeaves: number;
  pendingLeaves: number;
  approvedLeaves: number;
  rejectedLeaves: number;
  completedLeaves: number;
  activeLeaves: number;
  todayExits: number;
  todayEntries: number;
}

/** Report export response */
export interface ExportResponse {
  filename: string;
  contentType: string;
  data: Uint8Array | string;
}
