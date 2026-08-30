/**
 * Auth API Service
 *
 * Methods for authentication endpoints.
 */

import api from './api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  _id: string;
  email: string;
  role: string;
  isActive: boolean;
  name: string;
  profile?: Record<string, unknown>;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const authApi = {
  login: async (payload: LoginPayload) => {
    const response = await api.post<{ success: boolean; data: LoginResponse }>('/auth/login', payload);
    return response.data.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post<{
      success: boolean;
      data: { accessToken: string; refreshToken: string };
    }>('/auth/refresh', { refreshToken });
    return response.data.data;
  },

  getProfile: async () => {
    const response = await api.get<{ success: boolean; data: Record<string, unknown> }>('/auth/me');
    return response.data.data;
  },

  changePassword: async (payload: ChangePasswordPayload) => {
    const response = await api.post('/auth/change-password', payload);
    return response.data;
  },
};
