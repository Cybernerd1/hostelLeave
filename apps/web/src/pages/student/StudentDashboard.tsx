/**
 * Student Dashboard
 */

import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import './DashboardPage.css';

export function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-page animate-fade-in-up">
      <div className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__greeting">
            Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <p className="dashboard-page__subtitle">Here's an overview of your leave activity</p>
        </div>
      </div>

      <div className="dashboard-page__stats-grid">
        <Card variant="default" padding="md" hoverable>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">—</span>
              <span className="stat-card__label">Total Leaves</span>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="md" hoverable>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--warning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">—</span>
              <span className="stat-card__label">Pending</span>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="md" hoverable>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">—</span>
              <span className="stat-card__label">Approved</span>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="md" hoverable>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--error">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">—</span>
              <span className="stat-card__label">Rejected</span>
            </div>
          </div>
        </Card>
      </div>

      <Card variant="default" padding="md">
        <div className="dashboard-page__empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-300)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3>Recent Leave Activity</h3>
          <p>Your recent leave requests will appear here once data is loaded.</p>
        </div>
      </Card>
    </div>
  );
}
