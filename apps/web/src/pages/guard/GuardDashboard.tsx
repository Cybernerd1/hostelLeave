/**
 * Guard Dashboard
 * Displays live gate log stats and today's exit/entry movements.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import api from '@/services/api';
import '../student/DashboardPage.css';

interface GateLogEntry {
  _id: string;
  leaveId: { _id?: string; leaveId?: string; studentId?: { name: string; rollNumber: string } };
  action: 'exit' | 'return';
  timestamp: string;
  guardId?: { name: string };
}

export function GuardDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<GateLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.get<{ success: boolean; data: GateLogEntry[] }>('/guard/logs?limit=10')
      .then((res) => {
        if (isMounted) setLogs(res.data?.data || []);
      })
      .catch(() => {
        if (isMounted) setLogs([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const exitsCount = logs.filter(l => l.action === 'exit').length;
  const entriesCount = logs.filter(l => l.action === 'return').length;

  const formatDate = (d: string) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="dashboard-page animate-fade-in-up">
      <div className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__greeting">
            Welcome, {user?.name?.split(' ')[0] || 'Guard'}! 👋
          </h1>
          <p className="dashboard-page__subtitle">Monitor gate activity and scan QR passes</p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => navigate('/guard/scan')}
        >
          📷 Scan / Verify Pass
        </button>
      </div>

      <div className="dashboard-page__stats-grid">
        <Card variant="default" padding="md" hoverable onClick={() => navigate('/guard/log')}>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--warning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">{loading ? '…' : exitsCount}</span>
              <span className="stat-card__label">Today's Exits</span>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="md" hoverable onClick={() => navigate('/guard/log')}>
          <div className="stat-card">
            <div className="stat-card__icon stat-card__icon--success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </div>
            <div className="stat-card__content">
              <span className="stat-card__value">{loading ? '…' : entriesCount}</span>
              <span className="stat-card__label">Today's Entries</span>
            </div>
          </div>
        </Card>
      </div>

      <Card variant="default" padding="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Recent Gate Movements</h3>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/guard/log')}>Full Gate Log →</button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-neutral-500)', fontSize: '0.9rem' }}>Loading activity logs…</p>
        ) : logs.length === 0 ? (
          <div className="dashboard-page__empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-300)" strokeWidth="1.25"><path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            <h3>No Gate Activity</h3>
            <p>No student exits or entries have been logged yet today.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Leave ID</th>
                  <th>Movement</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const leaveIdStr = typeof l.leaveId === 'object' ? l.leaveId?._id || l.leaveId?.leaveId : l.leaveId;
                  const displayId = typeof l.leaveId === 'object' ? l.leaveId?.leaveId : l.leaveId;
                  return (
                    <tr key={l._id}>
                      <td className="cell-secondary">{formatDate(l.timestamp)}</td>
                      <td>
                        <strong>{typeof l.leaveId === 'object' ? l.leaveId?.studentId?.name : 'Student'}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-neutral-500)' }}>
                          {typeof l.leaveId === 'object' ? l.leaveId?.studentId?.rollNumber : ''}
                        </div>
                      </td>
                      <td><code className="leave-id">{displayId || '—'}</code></td>
                      <td>
                        <span className={`status-badge status-badge--${l.action === 'exit' ? 'rejected' : 'approved'}`}>
                          {l.action === 'exit' ? '↑ Exit' : '↓ Return'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn--outline btn--sm"
                          onClick={async () => {
                            try {
                              if (!leaveIdStr) return;
                              const res = await api.get(`/leaves/${leaveIdStr}/pdf`, { responseType: 'blob' });
                              const blob = new Blob([res.data], { type: 'application/pdf' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `leave-pass-${displayId || 'pass'}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } catch {
                              alert('Could not download PDF pass.');
                            }
                          }}
                        >
                          📄 Download PDF Pass
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
