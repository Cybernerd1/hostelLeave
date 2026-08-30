/**
 * Notification type definitions
 */

import type { NotificationType } from '../enums';

/** Notification document */
export interface INotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  referenceId?: string;
  referenceModel?: 'LeaveRequest' | 'GuardLog' | 'User';
  createdAt: Date;
  updatedAt: Date;
}

/** Notification count summary */
export interface INotificationCount {
  total: number;
  unread: number;
}
