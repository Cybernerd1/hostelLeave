/**
 * Public Guard Verification Page
 *
 * Accessible without login via QR code scan.
 * Shows leave status, student info, and allows guard to mark exit/entry.
 *
 * Route: /verify/:leaveId
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import './GuardVerifyPage.css';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

interface PublicLeaveData {
  _id: string;
  leaveId: string;
  status: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  destination: string;
  reason: string;
  exitTime?: string;
  entryTime?: string;
  createdAt: string;
  student: {
    name: string;
    rollNumber: string;
    phone: string;
    year: number;
    semester: string;
    departmentId?: { name: string; code: string };
    courseId?: { name: string; code: string };
    hostelId?: { name: string };
    roomId?: { roomNumber: string };
  };
  approvals?: Array<{
    role: string;
    action: string;
    approverId: { name: string };
    actionDate: string;
    remarks?: string;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  approved:  { label: 'Approved',  color: '#065f46', bg: '#d1fae5', icon: '✓' },
  completed: { label: 'Completed', color: '#1e3a5f', bg: '#dbeafe', icon: '✓' },
  rejected:  { label: 'Rejected',  color: '#7f1d1d', bg: '#fee2e2', icon: '✗' },
  cancelled: { label: 'Cancelled', color: '#374151', bg: '#f3f4f6', icon: '✗' },
  expired:   { label: 'Expired',   color: '#4b5563', bg: '#f9fafb', icon: '!' },
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  home_visit: 'Home Visit',
  medical:    'Medical Leave',
  emergency:  'Emergency Leave',
  function:   'Function',
  academic:   'Academic Leave',
  personal:   'Personal Leave',
  other:      'Other',
};

function formatDate(d: string | Date) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string | Date) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function GuardVerifyPage() {
  const { leaveId } = useParams<{ leaveId: string }>();

  const [leave, setLeave]           = useState<PublicLeaveData | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState('');

  // Guard auth state
  const [guardToken, setGuardToken]     = useState('');
  const [guardEmail, setGuardEmail]     = useState('');
  const [guardPass, setGuardPass]       = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]     = useState('');
  const [isLoggedIn, setIsLoggedIn]     = useState(false);

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg]         = useState('');
  const [actionError, setActionError]     = useState('');

  const fetchLeave = useCallback(async () => {
    if (!leaveId) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/leaves/public/${leaveId}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Not found');
      setLeave(json.data);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load leave details');
    } finally {
      setIsLoading(false);
    }
  }, [leaveId]);

  useEffect(() => { fetchLeave(); }, [fetchLeave]);

  // Check if guard already logged in (token in sessionStorage)
  useEffect(() => {
    const t = sessionStorage.getItem('guardVerifyToken');
    if (t) { setGuardToken(t); setIsLoggedIn(true); }
  }, []);

  const handleGuardLogin = async () => {
    if (!guardEmail.trim() || !guardPass.trim()) {
      setLoginError('Please enter your guard email and password.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: guardEmail, password: guardPass }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Login failed');
      if (json.data?.user?.role !== 'guard') throw new Error('Only guards can verify leave passes.');
      const token = json.data?.accessToken;
      setGuardToken(token);
      sessionStorage.setItem('guardVerifyToken', token);
      setIsLoggedIn(true);
    } catch (e: unknown) {
      setLoginError((e as Error).message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAction = async (action: 'exit' | 'entry') => {
    if (!leave || !guardToken) return;
    setActionLoading(true);
    setActionMsg('');
    setActionError('');
    try {
      const res = await fetch(`${API_BASE}/guard/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${guardToken}`,
        },
        body: JSON.stringify({ leaveRequestId: leave._id, action, }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Action failed');
      setActionMsg(action === 'exit'
        ? '✅ Exit recorded successfully! Student has left the hostel.'
        : '✅ Entry recorded! Student has returned. Leave is now completed.');
      await fetchLeave();
    } catch (e: unknown) {
      setActionError((e as Error).message || 'Failed to record action.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('guardVerifyToken');
    setGuardToken('');
    setIsLoggedIn(false);
  };

  const isValid       = leave?.status === 'approved';
  const isCompleted   = leave?.status === 'completed';
  const canExit       = isValid && !leave?.exitTime;
  const canEntry      = isValid && !!leave?.exitTime && !leave?.entryTime;
  const statusCfg     = leave ? (STATUS_CONFIG[leave.status] || { label: leave.status, color: '#374151', bg: '#f3f4f6', icon: '?' }) : null;

  return (
    <div className="gvp">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="gvp__header">
        <div className="gvp__header-inner">
          <div className="gvp__logo">
            <div className="gvp__logo-icon">🏛</div>
            <div>
              <div className="gvp__logo-college">AKGEC</div>
              <div className="gvp__logo-sub">Hostel Leave Verification</div>
            </div>
          </div>
          {isLoggedIn && (
            <button className="gvp__logout-btn" onClick={handleLogout}>
              Sign Out
            </button>
          )}
        </div>
      </header>

      <main className="gvp__main">

        {/* ── Loading ─────────────────────────────────────────── */}
        {isLoading && (
          <div className="gvp__loading">
            <div className="gvp__spinner" />
            <p>Loading leave details…</p>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────── */}
        {!isLoading && error && (
          <div className="gvp__error-card">
            <div className="gvp__error-icon">⛔</div>
            <h2>Leave Not Found</h2>
            <p>{error}</p>
            <p className="gvp__error-hint">The QR code may be invalid or the leave may have been cancelled.</p>
          </div>
        )}

        {/* ── Leave Info ──────────────────────────────────────── */}
        {!isLoading && leave && (
          <div className="gvp__content">

            {/* Status Banner */}
            <div className="gvp__status-banner" style={{ background: statusCfg?.bg, borderColor: statusCfg?.color + '44' }}>
              <span className="gvp__status-icon" style={{ color: statusCfg?.color }}>{statusCfg?.icon}</span>
              <div>
                <div className="gvp__status-label" style={{ color: statusCfg?.color }}>
                  {statusCfg?.label}
                  {isCompleted && ' — Student has returned'}
                  {isValid && leave.exitTime && !leave.entryTime && ' — Student has exited'}
                  {isValid && !leave.exitTime && ' — Student has not exited yet'}
                </div>
                <div className="gvp__leave-id">Leave ID: <strong>{leave.leaveId}</strong></div>
              </div>
            </div>

            {/* Student Card */}
            <div className="gvp__card">
              <h2 className="gvp__card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Student Information
              </h2>
              <div className="gvp__grid">
                <div className="gvp__field"><span className="gvp__label">Name</span><span className="gvp__value">{leave.student?.name || '—'}</span></div>
                <div className="gvp__field"><span className="gvp__label">Roll No.</span><span className="gvp__value gvp__value--mono">{leave.student?.rollNumber || '—'}</span></div>
                <div className="gvp__field"><span className="gvp__label">Course</span><span className="gvp__value">{leave.student?.courseId?.name || '—'}</span></div>
                <div className="gvp__field"><span className="gvp__label">Department</span><span className="gvp__value">{leave.student?.departmentId?.name || '—'}</span></div>
                <div className="gvp__field"><span className="gvp__label">Hostel</span><span className="gvp__value">{leave.student?.hostelId?.name || '—'}</span></div>
                <div className="gvp__field"><span className="gvp__label">Room</span><span className="gvp__value">{leave.student?.roomId?.roomNumber || '—'}</span></div>
              </div>
            </div>

            {/* Leave Details Card */}
            <div className="gvp__card">
              <h2 className="gvp__card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Leave Details
              </h2>
              <div className="gvp__grid">
                <div className="gvp__field"><span className="gvp__label">Type</span><span className="gvp__value">{LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType}</span></div>
                <div className="gvp__field"><span className="gvp__label">Destination</span><span className="gvp__value">{leave.destination}</span></div>
                <div className="gvp__field"><span className="gvp__label">From</span><span className="gvp__value">{formatDate(leave.fromDate)}</span></div>
                <div className="gvp__field"><span className="gvp__label">To</span><span className="gvp__value">{formatDate(leave.toDate)}</span></div>
                {leave.exitTime && (
                  <div className="gvp__field"><span className="gvp__label">Exit Time</span><span className="gvp__value gvp__value--highlight">{formatDateTime(leave.exitTime)}</span></div>
                )}
                {leave.entryTime && (
                  <div className="gvp__field"><span className="gvp__label">Return Time</span><span className="gvp__value gvp__value--highlight">{formatDateTime(leave.entryTime)}</span></div>
                )}
              </div>
              {leave.reason && (
                <div className="gvp__reason">
                  <span className="gvp__label">Reason</span>
                  <p className="gvp__reason-text">{leave.reason}</p>
                </div>
              )}
            </div>

            {/* Approvals */}
            {leave.approvals && leave.approvals.length > 0 && (
              <div className="gvp__card">
                <h2 className="gvp__card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  Approval Chain
                </h2>
                <div className="gvp__approvals">
                  {leave.approvals.map((a, i) => (
                    <div key={i} className={`gvp__approval-item gvp__approval-item--${a.action}`}>
                      <div className={`gvp__approval-dot gvp__approval-dot--${a.action}`}>
                        {a.action === 'approved' ? '✓' : '✗'}
                      </div>
                      <div className="gvp__approval-info">
                        <span className="gvp__approval-role">{a.role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                        <span className="gvp__approval-by">by {a.approverId?.name}</span>
                        <span className="gvp__approval-date">{formatDateTime(a.actionDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Guard Action Panel */}
            <div className="gvp__card gvp__action-card">
              <h2 className="gvp__card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                Guard Actions
              </h2>

              {!isLoggedIn ? (
                <div className="gvp__login-form">
                  <p className="gvp__login-hint">Sign in with your guard credentials to record entry/exit</p>
                  <div className="gvp__login-fields">
                    <input
                      id="guard-email"
                      className="gvp__input"
                      type="email"
                      placeholder="Guard email"
                      value={guardEmail}
                      onChange={e => setGuardEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleGuardLogin()}
                    />
                    <input
                      id="guard-password"
                      className="gvp__input"
                      type="password"
                      placeholder="Password"
                      value={guardPass}
                      onChange={e => setGuardPass(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleGuardLogin()}
                    />
                  </div>
                  {loginError && <div className="gvp__login-error">{loginError}</div>}
                  <button
                    id="guard-login-btn"
                    className="gvp__btn gvp__btn--primary"
                    onClick={handleGuardLogin}
                    disabled={loginLoading}
                  >
                    {loginLoading ? 'Signing in…' : 'Sign In as Guard'}
                  </button>
                </div>
              ) : (
                <div className="gvp__actions">
                  {actionMsg && <div className="gvp__action-success">{actionMsg}</div>}
                  {actionError && <div className="gvp__action-error">{actionError}</div>}

                  {(isValid || isCompleted) ? (
                    <>
                      {canExit && (
                        <div className="gvp__action-block">
                          <p className="gvp__action-desc">Student is about to exit the hostel. Click to record exit time.</p>
                          <button
                            id="mark-exit-btn"
                            className="gvp__btn gvp__btn--exit"
                            onClick={() => handleAction('exit')}
                            disabled={actionLoading}
                          >
                            {actionLoading ? <><span className="gvp__btn-spinner"/> Processing…</> : '🚪 Mark Check-Out (Exit)'}
                          </button>
                        </div>
                      )}

                      {canEntry && (
                        <div className="gvp__action-block">
                          <p className="gvp__action-desc">Student is returning to hostel. Click to record return time.</p>
                          <button
                            id="mark-entry-btn"
                            className="gvp__btn gvp__btn--entry"
                            onClick={() => handleAction('entry')}
                            disabled={actionLoading}
                          >
                            {actionLoading ? <><span className="gvp__btn-spinner"/> Processing…</> : '🏠 Mark Check-In (Return)'}
                          </button>
                        </div>
                      )}

                      {!canExit && !canEntry && (
                        <div className="gvp__no-action">
                          <div className="gvp__no-action-icon">✅</div>
                          <p>All gate actions for this leave have been recorded.</p>
                          {leave.exitTime && <p className="gvp__gate-time">Exit: {formatDateTime(leave.exitTime)}</p>}
                          {leave.entryTime && <p className="gvp__gate-time">Return: {formatDateTime(leave.entryTime)}</p>}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="gvp__no-action">
                      <div className="gvp__no-action-icon">⛔</div>
                      <p>This leave is <strong>{leave.status.replace(/_/g, ' ')}</strong>. No gate actions are allowed.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      <footer className="gvp__footer">
        <p>Hostel Leave Management System · AKGEC Ghaziabad</p>
        <p>This is a digitally verified leave pass. Scan QR code to verify authenticity.</p>
      </footer>
    </div>
  );
}
