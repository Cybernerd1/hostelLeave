/**
 * Parent Dashboard
 */
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import '../student/DashboardPage.css';

export function ParentDashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-page animate-fade-in-up">
      <div className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__greeting">
            Welcome, {user?.name?.split(' ')[0] || 'Parent'}! 👋
          </h1>
          <p className="dashboard-page__subtitle">Review and approve your ward's leave requests</p>
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
            <div className="stat-card__icon stat-card__icon--success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">—</span>
              <span className="stat-card__label">Approved</span>
            </div>
          </div>
        </Card>
      </div>

      <Card variant="default" padding="md">
        <div className="dashboard-page__empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-300)" strokeWidth="1.25"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h3>Pending Approvals</h3>
          <p>Leave requests waiting for your approval will appear here.</p>
        </div>
      </Card>
    </div>
  );
}
