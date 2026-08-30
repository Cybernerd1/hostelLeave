/**
 * Notification Controller
 */

import type { Request, Response } from 'express';

import { asyncHandler } from '../../middleware/asyncHandler';
import { notificationService } from './notification.service';
import { sendSuccess, sendPaginated } from '../../utils/response.util';

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { page = 1, limit = 20, isRead } = req.query;

  const result = await notificationService.getUserNotifications(userId, {
    page: Number(page),
    limit: Number(limit),
    isRead: isRead !== undefined ? isRead === 'true' : undefined,
  });

  sendPaginated(res, result.data, result.pagination, 'Notifications retrieved');
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const count = await notificationService.getUnreadCount(userId);

  sendSuccess(res, { count }, 'Unread count retrieved');
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  await notificationService.markAsRead(id, userId);

  sendSuccess(res, null, 'Notification marked as read');
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  await notificationService.markAllAsRead(userId);

  sendSuccess(res, null, 'All notifications marked as read');
});
