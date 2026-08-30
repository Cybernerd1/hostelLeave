/**
 * Notification API Service
 */

import api from './api';

export interface NotificationRecord {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export const notificationApi = {
  getAll: async (): Promise<NotificationRecord[]> => {
    const res = await api.get<{ success: boolean; data: NotificationRecord[] }>('/notifications');
    return res.data.data ?? [];
  },

  markRead: async (id: string): Promise<void> => {
    await api.put(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.put('/notifications/read-all');
  },
};
