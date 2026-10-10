/**
 * Parent Dashboard
 * Displays live stats and pending leave requests from ward.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { leaveApi, type LeaveRequest } from '@/services/leave.service';
import '../student/DashboardPage.css';

export function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    leaveApi.getPending()
      .then((res) => {
        if (isMounted) setPendingLeaves(res || []);
      })
      .catch(() => {
        if (isMounted) setPendingLeaves([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="dashboard-page animate-fade-in-up">
      <div className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__greeting">
            Welcome, {user?.name?.split(' ')[0] || 'Parent'}! 👋
          </h1>
          <p className="dashboard-page__subtitle">Review and approve your ward's leave requests</p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => navigate('/parent/approvals')}
        >
          View All Approvals ({pendingLeaves.length})
        </button>
      </div>

      <div className="dashboard-page__stats-grid">
        <Card variant="default" padding="md" hoverable onClick={() => navigate('/parent/approvals')}>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--warning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">{loading ? '…' : pendingLeaves.length}</span>
              <span className="stat-card__label">Pending Approvals</span>
            </div>
          </div>
        </Card>
      </div>

      <Card variant="default" padding="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Ward Leave Applications</h3>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/parent/approvals')}>Open Approvals Page →</button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-neutral-500)', fontSize: '0.9rem' }}>Loading ward requests…</p>
        ) : pendingLeaves.length === 0 ? (
          <div className="dashboard-page__empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-300)" strokeWidth="1.25"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3>No Pending Approvals</h3>
            <p>Your ward does not have any active leave applications waiting for approval.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Leave ID</th>
                  <th>Student Name</th>
                  <th>Reason & Destination</th>
                  <th>From Date</th>
                  <th>To Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.map((l) => (
                  <tr key={l._id}>
                    <td><code className="leave-id">{l.leaveId}</code></td>
                    <td><strong>{l.studentId?.name || 'Student'}</strong></td>
                    <td>
                      <div>{l.reason}</div>
                      <small style={{ color: 'var(--color-neutral-500)' }}>📍 {l.destination}</small>
                    </td>
                    <td>{formatDate(l.fromDate)}</td>
                    <td>{formatDate(l.toDate)}</td>
                    <td>
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={() => navigate(`/parent/leaves/${l._id}`)}
                      >
                        Review Application
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
