/**
 * Warden Dashboard
 */
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import '../student/DashboardPage.css';

export function WardenDashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-page animate-fade-in-up">
      <div className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__greeting">
            Welcome, {user?.name?.split(' ')[0] || 'Warden'}! 👋
          </h1>
          <p className="dashboard-page__subtitle">Manage hostel leave approvals and monitor activity</p>
        </div>
      </div>

      <div className="dashboard-page__stats-grid">
        <Card variant="default" padding="md" hoverable>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--warning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">—</span>
              <span className="stat-card__label">Pending Approvals</span>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="md" hoverable>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">—</span>
              <span className="stat-card__label">Active Leaves</span>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="md" hoverable>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--info">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">—</span>
              <span className="stat-card__label">Students Out</span>
            </div>
          </div>
        </Card>
      </div>

      <Card variant="default" padding="md">
        <div className="dashboard-page__empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-300)" strokeWidth="1.25"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h3>Leave Activity</h3>
          <p>Recent leave approvals and hostel activity will appear here.</p>
        </div>
      </Card>
    </div>
  );
}
