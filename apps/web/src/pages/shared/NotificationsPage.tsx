/**
 * Shared: Notifications Page
 */

import { useState, useEffect } from 'react';
import { notificationApi, type NotificationRecord } from '@/services/notification.service';
import { Card } from '@/components/ui/Card';
import './NotificationsPage.css';

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_ICON: Record<string, string> = {
  leave_submitted: '📄',
  leave_approved: '✅',
  leave_rejected: '❌',
  leave_cancelled: '🚫',
  parent_approval: '👨‍👩‍👧',
  qr_scan: '📷',
  system: '🔔',
};

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationApi.getAll()
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id: string) => {
    await notificationApi.markRead(id);
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllRead = async () => {
    await notificationApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="notifications-page animate-fade-in-up">
      <div className="notifications-page__header">
        <div>
          <h1 className="notifications-page__title">Notifications</h1>
          <p className="notifications-page__subtitle">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn--secondary" onClick={handleMarkAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      <Card variant="default" padding="none">
        {loading ? (
          <div className="notifications-empty">
            <div className="spinner" />
            <p>Loading notifications…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <span className="notifications-empty__icon">🔔</span>
            <p>No notifications yet</p>
          </div>
        ) : (
          <ul className="notifications-list">
            {notifications.map((n) => (
              <li
                key={n._id}
                className={`notification-item ${!n.isRead ? 'notification-item--unread' : ''}`}
                onClick={() => !n.isRead && handleMarkRead(n._id)}
              >
                <span className="notification-item__icon">
                  {TYPE_ICON[n.type] ?? '🔔'}
                </span>
                <div className="notification-item__body">
                  <p className="notification-item__title">{n.title}</p>
                  <p className="notification-item__message">{n.message}</p>
                </div>
                <div className="notification-item__meta">
                  <span className="notification-item__time">{timeAgo(n.createdAt)}</span>
                  {!n.isRead && <span className="notification-item__dot" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
