/**
 * Warden Dashboard
 * Complete live statistics and pending request overview.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { leaveApi, type LeaveRequest } from '@/services/leave.service';
import '../student/DashboardPage.css';

interface StatsData {
  pendingCount?: number;
  approvedCount?: number;
  activeCount?: number;
  studentsOutCount?: number;
}

export function WardenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<StatsData>({});
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      leaveApi.getStats().catch(() => ({})),
      leaveApi.getPending().catch(() => []),
    ]).then(([statsRes, pendingRes]) => {
      if (!isMounted) return;
      setStats((statsRes as StatsData) || {});
      setPendingLeaves((pendingRes as LeaveRequest[]) || []);
    }).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

  return (
    <div className="dashboard-page animate-fade-in-up">
      <div className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__greeting">
            Welcome, {user?.name?.split(' ')[0] || 'Warden'}! 👋
          </h1>
          <p className="dashboard-page__subtitle">Manage hostel leave approvals and monitor activity</p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => navigate('/warden/approvals')}
        >
          View Pending Approvals ({pendingLeaves.length})
        </button>
      </div>

      <div className="dashboard-page__stats-grid">
        <Card variant="default" padding="md" hoverable onClick={() => navigate('/warden/approvals')}>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--warning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">{loading ? '…' : stats.pendingCount ?? pendingLeaves.length}</span>
              <span className="stat-card__label">Pending Approvals</span>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="md" hoverable onClick={() => navigate('/warden/leaves')}>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">{loading ? '…' : stats.activeCount ?? stats.approvedCount ?? 0}</span>
              <span className="stat-card__label">Active / Approved Leaves</span>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="md" hoverable onClick={() => navigate('/warden/leaves')}>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--info">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">{loading ? '…' : stats.studentsOutCount ?? 0}</span>
              <span className="stat-card__label">Students Out</span>
            </div>
          </div>
        </Card>
      </div>

      <Card variant="default" padding="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Recent Pending Requests</h3>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/warden/approvals')}>See All →</button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-neutral-500)', fontSize: '0.9rem' }}>Loading pending requests…</p>
        ) : pendingLeaves.length === 0 ? (
          <div className="dashboard-page__empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-300)" strokeWidth="1.25"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3>All Caught Up!</h3>
            <p>No leave applications currently awaiting your approval.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Leave ID</th>
                  <th>Student</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map((l) => (
                  <tr key={l._id}>
                    <td><code className="leave-id">{l.leaveId}</code></td>
                    <td>
                      <strong>{l.studentId?.name || 'Student'}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>{l.studentId?.rollNumber}</div>
                    </td>
                    <td>{l.leaveType}</td>
                    <td>{formatDate(l.fromDate)} → {formatDate(l.toDate)}</td>
                    <td>
                      <button className="btn btn--outline btn--sm" onClick={() => navigate(`/warden/leaves/${l._id}`)}>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
