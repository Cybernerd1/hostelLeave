/**
 * Student Dashboard
 * Real-time student leave statistics, active pass card, and recent applications.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import { leaveApi, type LeaveRequest } from '@/services/leave.service';
import './DashboardPage.css';

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { error: showError } = useFeedback();

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    leaveApi.getMyLeaves({ page: 1, limit: 10 })
      .then((res) => {
        if (isMounted) setLeaves(res.data || []);
      })
      .catch(() => {
        if (isMounted) setLeaves([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const totalLeaves = leaves.length;
  const pendingLeaves = leaves.filter(l => l.status.startsWith('pending_')).length;
  const approvedLeaves = leaves.filter(l => l.status === 'approved').length;
  const rejectedLeaves = leaves.filter(l => l.status === 'rejected').length;

  const activePass = leaves.find(l => l.status === 'approved');

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const downloadPDF = async (leave: LeaveRequest) => {
    setPdfLoadingId(leave._id);
    try {
      const blob = await leaveApi.downloadPDF(leave._id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leave-pass-${leave.leaveId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showError('Could not download PDF pass.');
    } finally {
      setPdfLoadingId(null);
    }
  };

  return (
    <div className="dashboard-page animate-fade-in-up">
      <div className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__greeting">
            Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <p className="dashboard-page__subtitle">Here's an overview of your leave activity</p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => navigate('/student/leaves/new')}
        >
          + Apply for Leave
        </button>
      </div>

      <div className="dashboard-page__stats-grid">
        <Card variant="default" padding="md" hoverable onClick={() => navigate('/student/leaves')}>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">{loading ? '…' : totalLeaves}</span>
              <span className="stat-card__label">Total Applications</span>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="md" hoverable onClick={() => navigate('/student/leaves')}>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--warning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">{loading ? '…' : pendingLeaves}</span>
              <span className="stat-card__label">Pending</span>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="md" hoverable onClick={() => navigate('/student/leaves')}>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">{loading ? '…' : approvedLeaves}</span>
              <span className="stat-card__label">Approved</span>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="md" hoverable onClick={() => navigate('/student/leaves')}>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--error">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">{loading ? '…' : rejectedLeaves}</span>
              <span className="stat-card__label">Rejected</span>
            </div>
          </div>
        </Card>
      </div>

      {activePass && (
        <Card variant="default" padding="lg" style={{ borderLeft: '4px solid var(--color-success-500)', background: 'var(--color-success-50, #f0fdf4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857', letterSpacing: '0.05em' }}>✅ ACTIVE APPROVED PASS</span>
              <h3 style={{ margin: '0.25rem 0', fontSize: '1.25rem', fontWeight: 700 }}>Pass ID: {activePass.leaveId}</h3>
              <p style={{ margin: 0, color: 'var(--color-neutral-600)', fontSize: '0.9rem' }}>
                Valid: <strong>{formatDate(activePass.fromDate)}</strong> to <strong>{formatDate(activePass.toDate)}</strong> · {activePass.destination}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn--primary"
                onClick={() => downloadPDF(activePass)}
                disabled={pdfLoadingId === activePass._id}
              >
                {pdfLoadingId === activePass._id ? 'Generating PDF…' : '📄 Download Leave Pass PDF'}
              </button>
              <button
                className="btn btn--outline"
                onClick={() => navigate(`/student/leaves/${activePass._id}`)}
              >
                View Pass
              </button>
            </div>
          </div>
        </Card>
      )}

      <Card variant="default" padding="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Recent Applications</h3>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/student/leaves')}>View All →</button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-neutral-500)', fontSize: '0.9rem' }}>Loading recent activity…</p>
        ) : leaves.length === 0 ? (
          <div className="dashboard-page__empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-300)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3>No Leave Applications Yet</h3>
            <p>Click "+ Apply for Leave" to submit your first hostel leave request.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Leave ID</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaves.slice(0, 5).map((l) => (
                  <tr key={l._id}>
                    <td><code className="leave-id">{l.leaveId}</code></td>
                    <td>{l.leaveType}</td>
                    <td>{formatDate(l.fromDate)} → {formatDate(l.toDate)}</td>
                    <td>{l.destination}</td>
                    <td>
                      <span className={`status-badge status-badge--${l.status === 'approved' ? 'approved' : l.status.startsWith('pending') ? 'pending' : 'rejected'}`}>
                        {l.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn--outline btn--sm" onClick={() => navigate(`/student/leaves/${l._id}`)}>
                        Details
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
