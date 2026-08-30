/**
 * Shared: Profile Page
 * Shows the logged-in user's details and allows password change.
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import api from '@/services/api';
import { getRoleLabel } from '@/utils/roleConfig';
import './ProfilePage.css';

export function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setMsg({ type: 'error', text: axiosErr.response?.data?.message || 'Failed to change password.' });
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  return (
    <div className="profile-page animate-fade-in-up">
      <div className="profile-page__header">
        <h1 className="profile-page__title">My Profile</h1>
        <p className="profile-page__subtitle">View and manage your account</p>
      </div>

      <div className="profile-page__grid">
        {/* User Card */}
        <Card variant="default" padding="lg">
          <div className="profile-card">
            <div className="profile-card__avatar">{initials}</div>
            <div className="profile-card__info">
              <h2 className="profile-card__name">{user?.name}</h2>
              <span className="profile-card__role-badge">{getRoleLabel(user?.role ?? '')}</span>
            </div>
            <div className="profile-card__details">
              <div className="profile-detail-row">
                <span className="profile-detail-label">Email</span>
                <span className="profile-detail-value">{user?.email}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">Role</span>
                <span className="profile-detail-value">{getRoleLabel(user?.role ?? '')}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">Status</span>
                <span className={`status-badge status-badge--${user?.isActive ? 'approved' : 'rejected'}`}>
                  {user?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card variant="default" padding="lg">
          <h3 className="profile-section__title">Change Password</h3>
          <form className="profile-form" onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label" htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                className="form-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            {msg && (
              <div className={`form-message form-message--${msg.type}`}>{msg.text}</div>
            )}
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
