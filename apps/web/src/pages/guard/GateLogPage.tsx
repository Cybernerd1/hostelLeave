/**
 * Guard: Gate Log Page
 */
import { useState, useEffect } from 'react';
import api from '@/services/api';
import { Card } from '@/components/ui/Card';
import '../shared/ApprovalsPage.css';
import './GuardPages.css';

interface GateLogEntry {
  _id: string;
  leaveId: { _id?: string; leaveId?: string; studentId?: { name: string; rollNumber: string } };
  action: 'exit' | 'return';
  timestamp: string;
  guardId: { name: string };
}

export function GateLogPage() {
  const [logs, setLogs] = useState<GateLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; data: GateLogEntry[] }>('/guard/logs')
      .then((res) => setLogs(res.data.data ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) => new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div>
          <h1 className="approvals-page__title">Gate Log</h1>
          <p className="approvals-page__subtitle">Record of student exits and returns</p>
        </div>
      </div>
      <Card variant="default" padding="none">
        {loading ? (
          <div className="table-empty"><div className="spinner" /><p>Loading…</p></div>
        ) : logs.length === 0 ? (
          <div className="table-empty">
            <p>No gate logs recorded today.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Leave ID</th>
                  <th>Action</th>
                  <th>Guard</th>
                  <th>Pass PDF</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const leaveIdStr = typeof l.leaveId === 'object' ? l.leaveId?._id || l.leaveId?.leaveId : l.leaveId;
                  const displayLeaveId = typeof l.leaveId === 'object' ? l.leaveId?.leaveId : l.leaveId;
                  return (
                    <tr key={l._id}>
                      <td className="cell-secondary">{formatDate(l.timestamp)}</td>
                      <td>
                        <div className="cell-primary">{typeof l.leaveId === 'object' ? l.leaveId?.studentId?.name : '—'}</div>
                        <div className="cell-secondary">{typeof l.leaveId === 'object' ? l.leaveId?.studentId?.rollNumber : ''}</div>
                      </td>
                      <td><code className="leave-id">{displayLeaveId || '—'}</code></td>
                      <td>
                        <span className={`status-badge status-badge--${l.action === 'exit' ? 'rejected' : 'approved'}`}>
                          {l.action === 'exit' ? '↑ Exit' : '↓ Return'}
                        </span>
                      </td>
                      <td>{l.guardId?.name ?? '—'}</td>
                      <td>
                        <button
                          className="btn btn--outline btn--sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={async () => {
                            try {
                              const targetId = leaveIdStr;
                              if (!targetId) return;
                              const res = await api.get(`/leaves/${targetId}/pdf`, { responseType: 'blob' });
                              const blob = new Blob([res.data], { type: 'application/pdf' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `leave-pass-${displayLeaveId || 'pass'}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } catch {
                              alert('Could not download PDF pass.');
                            }
                          }}
                        >
                          📄 Download PDF
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
