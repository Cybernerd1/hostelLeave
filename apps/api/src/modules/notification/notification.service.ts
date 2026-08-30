/**
 * Notification Service
 */

import { Notification, type INotificationDocument } from '../../models/notification.model';
import type { NotificationType } from '@hostel/shared-types';
import { buildPaginationMeta } from '../../utils/response.util';
import type { PaginationMeta } from '@hostel/shared-types';

export class NotificationService {
  /**
   * Create a notification.
   */
  async create(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    referenceId?: string;
    referenceModel?: string;
  }): Promise<INotificationDocument> {
    return Notification.create(data);
  }

  /**
   * Get notifications for a user.
   */
  async getUserNotifications(
    userId: string,
    query: { page: number; limit: number; isRead?: boolean },
  ): Promise<{ data: INotificationDocument[]; pagination: PaginationMeta }> {
    const filter: Record<string, unknown> = { userId };
    if (query.isRead !== undefined) {
      filter.isRead = query.isRead;
    }

    const total = await Notification.countDocuments(filter);
    const data = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean();

    return {
      data: data as INotificationDocument[],
      pagination: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  /**
   * Get unread notification count.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, isRead: false });
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
    );
  }

  /**
   * Mark all notifications as read.
   */
  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true },
    );
  }
}

export const notificationService = new NotificationService();
