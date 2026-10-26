/**
 * My Leaves Page
 *
 * Full implementation for students to view all their leave requests.
 * Features:
 *  - Summary stat chips (total / approved / pending / rejected)
 *  - Filter tabs (All | Pending | Approved | Rejected | Completed)
 *  - Leave cards with status badge, dates, type, quick actions
 *  - View detail → /student/leaves/:id
 *  - Cancel leave (with inline confirmation)
 *  - PDF download for approved leaves
 *  - Empty state per filter
 *  - Pagination
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaveApi, type LeaveRequest } from '@/services/leave.service';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import './MyLeavesPage.css';

/* ─── Constants ─────────────────────────────────────────────────── */
const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:                { label: 'Draft',              color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
  pending_parent:       { label: 'Pending Parent',     color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  pending_warden:       { label: 'Pending Warden',     color: '#7c2d12', bg: '#ffedd5', border: '#fdba74' },
  pending_chief_warden: { label: 'Pending Chief Warden', color: '#7c2d12', bg: '#ffedd5', border: '#fdba74' },
  pending_hod:          { label: 'Pending HOD',        color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  approved:             { label: 'Approved',           color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
  rejected:             { label: 'Rejected',           color: '#7f1d1d', bg: '#fee2e2', border: '#fca5a5' },
  cancelled:            { label: 'Cancelled',          color: '#374151', bg: '#f3f4f6', border: '#d1d5db' },
  completed:            { label: 'Completed',          color: '#1e3a5f', bg: '#dbeafe', border: '#93c5fd' },
  expired:              { label: 'Expired',            color: '#4b5563', bg: '#f9fafb', border: '#9ca3af' },
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  home_visit: 'Home Visit',
  medical:    'Medical',
  emergency:  'Emergency',
  function:   'Function',
  academic:   'Academic',
  personal:   'Personal',
  other:      'Other',
};

const FILTER_TABS = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'completed',label: 'Completed' },
  { key: 'cancelled',label: 'Cancelled' },
];

// Map filter tab key → status values to show
const FILTER_STATUS_MAP: Record<string, string[]> = {
  all:       [],
  pending:   ['pending_parent', 'pending_warden', 'pending_chief_warden', 'pending_hod'],
  approved:  ['approved'],
  rejected:  ['rejected'],
  completed: ['completed'],
  cancelled: ['cancelled', 'expired'],
};

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcDays(from: string, to: string) {
  const d1 = new Date(from), d2 = new Date(to);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
}

function isPending(status: string) {
  return status.startsWith('pending_');
}

/* ─── Component ─────────────────────────────────────────────────── */
export function MyLeavesPage() {
  const navigate = useNavigate();
  const { error: showError } = useFeedback();

  const [leaves, setLeaves]       = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Cancel state
  const [cancellingId, setCancellingId]     = useState<string | null>(null);
  const [cancelReason, setCancelReason]     = useState('');
  const [cancelLoading, setCancelLoading]   = useState(false);

  // PDF state
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await leaveApi.getMyLeaves({ page, limit: 10 });
      setLeaves(res.data);
      const pag = res.pagination as { totalPages?: number };
      setTotalPages(pag?.totalPages ?? 1);
    } catch {
      showError('Failed to load leave requests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  // Derive stats from all loaded leaves (no pagination filter)
  const stats = {
    total:    leaves.length,
    pending:  leaves.filter(l => isPending(l.status)).length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
    completed:leaves.filter(l => l.status === 'completed').length,
  };

  // Client-side tab filter
  const filterKeys = FILTER_STATUS_MAP[activeTab];
  const filtered = filterKeys.length === 0
    ? leaves
    : leaves.filter(l => filterKeys.includes(l.status));

  /* ─── Cancel Handlers ───────────────────────────────────────── */
  const startCancel = (id: string) => {
    setCancellingId(id);
    setCancelReason('');
  };

  const confirmCancel = async () => {
    if (!cancellingId) return;
    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      showError('Please enter a reason with at least 5 characters.');
      return;
    }
    setCancelLoading(true);
    try {
      await leaveApi.cancelLeave(cancellingId, cancelReason.trim());
      setCancellingId(null);
      await load();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const e = err as { response?: { data?: { message?: string } } };
        showError(e.response?.data?.message || 'Failed to cancel leave');
      } else {
        showError('Network error. Please try again.');
      }
    } finally {
      setCancelLoading(false);
    }
  };

  /* ─── PDF Download ──────────────────────────────────────────── */
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

  /* ─── Render ────────────────────────────────────────────────── */
  return (
    <div className="my-leaves">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="my-leaves__header">
        <div>
          <h1 className="my-leaves__title">My Leave Requests</h1>
          <p className="my-leaves__subtitle">Track and manage all your leave applications</p>
        </div>
        <button
          className="my-leaves__apply-btn"
          onClick={() => navigate('/student/leaves/new')}
          id="apply-new-leave"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Apply for Leave
        </button>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────── */}
      {!isLoading && leaves.length > 0 && (
        <div className="my-leaves__stats">
          {[
            { label: 'Total',     value: stats.total,     color: 'primary' },
            { label: 'Pending',   value: stats.pending,   color: 'warning' },
            { label: 'Approved',  value: stats.approved,  color: 'success' },
            { label: 'Rejected',  value: stats.rejected,  color: 'error'   },
            { label: 'Completed', value: stats.completed, color: 'info'    },
          ].map(s => (
            <div key={s.label} className={`my-leaves__stat my-leaves__stat--${s.color}`}>
              <span className="my-leaves__stat-value">{s.value}</span>
              <span className="my-leaves__stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter Tabs ──────────────────────────────────────────── */}
      <div className="my-leaves__tabs" role="tablist">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`my-leaves__tab ${activeTab === tab.key ? 'my-leaves__tab--active' : ''}`}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
          >
            {tab.label}
            {tab.key !== 'all' && !isLoading && (
              <span className="my-leaves__tab-count">
                {leaves.filter(l => (FILTER_STATUS_MAP[tab.key] || []).includes(l.status)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="my-leaves__loading">
          {[1, 2, 3].map(i => <div key={i} className="my-leaves__skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="my-leaves__empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3>{activeTab === 'all' ? 'No leave requests yet' : `No ${activeTab} leaves`}</h3>
          <p>
            {activeTab === 'all'
              ? 'Apply for your first leave to get started.'
              : `You have no ${activeTab} leave requests.`}
          </p>
          {activeTab === 'all' && (
            <button className="my-leaves__apply-btn" onClick={() => navigate('/student/leaves/new')}>
              Apply for Leave
            </button>
          )}
        </div>
      ) : (
        <div className="my-leaves__list">
          {filtered.map(leave => {
            const meta = STATUS_META[leave.status] ?? STATUS_META['draft'];
            const days = calcDays(leave.fromDate, leave.toDate);
            const isCancelling = cancellingId === leave._id;
            const canCancel = isPending(leave.status);
            const canDownload = leave.status === 'approved' || leave.status === 'completed';

            return (
              <div key={leave._id} className="my-leaves__card">

                {/* Card Header */}
                <div className="my-leaves__card-header">
                  <div className="my-leaves__card-header-left">
                    <span className="my-leaves__leave-id">{leave.leaveId}</span>
                    <span
                      className="my-leaves__status-badge"
                      style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <span className="my-leaves__applied-on">
                    Applied {formatDate(leave.createdAt)}
                  </span>
                </div>

                {/* Card Body */}
                <div className="my-leaves__card-body">
                  <div className="my-leaves__card-info">
                    <div className="my-leaves__info-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <div>
                        <span className="my-leaves__info-label">Period</span>
                        <span className="my-leaves__info-value">
                          {formatDate(leave.fromDate)} → {formatDate(leave.toDate)}
                          <em> ({days} day{days !== 1 ? 's' : ''})</em>
                        </span>
                      </div>
                    </div>

                    <div className="my-leaves__info-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <span className="my-leaves__info-label">Type</span>
                        <span className="my-leaves__info-value">
                          {LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType}
                        </span>
                      </div>
                    </div>

                    <div className="my-leaves__info-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      <div>
                        <span className="my-leaves__info-label">Destination</span>
                        <span className="my-leaves__info-value">{leave.destination}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Indicator for pending leaves */}
                  {isPending(leave.status) && (
                    <div className="my-leaves__progress">
                      {['parent', 'warden', 'chief_warden', 'hod'].map((stage, i) => {
                        const stageStatus = `pending_${stage}`;
                        const stages = ['pending_parent', 'pending_warden', 'pending_chief_warden', 'pending_hod', 'approved'];
                        const currentIdx = stages.indexOf(leave.status);
                        const stageIdx = i;
                        const isComplete = stageIdx < currentIdx;
                        const isCurrent = stageIdx === currentIdx;
                        return (
                          <div key={stage} className={`my-leaves__progress-step ${isComplete ? 'my-leaves__progress-step--done' : isCurrent ? 'my-leaves__progress-step--current' : ''}`}>
                            <div className="my-leaves__progress-dot">
                              {isComplete ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                              ) : isCurrent ? (
                                <div className="my-leaves__progress-pulse" />
                              ) : null}
                            </div>
                            <span>{['Parent', 'Warden', 'Chief Warden', 'HOD'][i]}</span>
                          </div>
                        );
                        void stageStatus;
                      })}
                    </div>
                  )}

                  {/* Cancel Form */}
                  {isCancelling && (
                    <div className="my-leaves__cancel-form">
                      <p>Reason for cancellation:</p>
                      <textarea
                        className="my-leaves__cancel-input"
                        rows={2}
                        placeholder="Please state why you want to cancel (min 5 chars)…"
                        value={cancelReason}
                        onChange={e => setCancelReason(e.target.value)}
                      />
                      <div className="my-leaves__cancel-actions">
                        <button
                          className="my-leaves__btn my-leaves__btn--danger"
                          onClick={confirmCancel}
                          disabled={cancelLoading}
                        >
                          {cancelLoading ? 'Cancelling…' : 'Confirm Cancel'}
                        </button>
                        <button
                          className="my-leaves__btn my-leaves__btn--ghost"
                          onClick={() => setCancellingId(null)}
                          disabled={cancelLoading}
                        >
                          Keep Leave
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer — Actions */}
                <div className="my-leaves__card-footer">
                  <button
                    className="my-leaves__btn my-leaves__btn--outline"
                    onClick={() => navigate(`/student/leaves/${leave._id}`)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                    View Details
                  </button>

                  {canDownload && (
                    <button
                      className="my-leaves__btn my-leaves__btn--primary"
                      onClick={() => downloadPDF(leave)}
                      disabled={pdfLoadingId === leave._id}
                    >
                      {pdfLoadingId === leave._id ? (
                        <><div className="my-leaves__btn-spinner" /> Generating…</>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download PDF
                        </>
                      )}
                    </button>
                  )}

                  {canCancel && !isCancelling && (
                    <button
                      className="my-leaves__btn my-leaves__btn--ghost-danger"
                      onClick={() => startCancel(leave._id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      Cancel Leave
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="my-leaves__pagination">
          <button
            className="my-leaves__page-btn"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            ← Previous
          </button>
          <span className="my-leaves__page-info">Page {page} of {totalPages}</span>
          <button
            className="my-leaves__page-btn"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </div>
      )}

    </div>
  );
}
