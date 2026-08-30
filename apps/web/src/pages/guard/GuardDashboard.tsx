/**
 * Guard Dashboard
 */
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import '../student/DashboardPage.css';

export function GuardDashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-page animate-fade-in-up">
      <div className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__greeting">
            Welcome, {user?.name?.split(' ')[0] || 'Guard'}! 👋
          </h1>
          <p className="dashboard-page__subtitle">Monitor gate activity and scan QR codes</p>
        </div>
      </div>

      <div className="dashboard-page__stats-grid">
        <Card variant="default" padding="md" hoverable>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">—</span>
              <span className="stat-card__label">Today's Exits</span>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="md" hoverable>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">—</span>
              <span className="stat-card__label">Today's Entries</span>
            </div>
          </div>
        </Card>
      </div>

      <Card variant="default" padding="md">
        <div className="dashboard-page__empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-300)" strokeWidth="1.25"><path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          <h3>Gate Activity</h3>
          <p>Today's gate activity log will appear here.</p>
        </div>
      </Card>
    </div>
  );
}
