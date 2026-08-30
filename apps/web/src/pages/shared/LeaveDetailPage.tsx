/**
 * Leave Detail Page
 *
 * Full implementation showing all leave info, approval timeline,
 * and a PDF download button for approved leaves (student view only).
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { leaveApi, type LeaveRequest } from '@/services/leave.service';
import './LeaveDetailPage.css';

// ─── Constants ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  pending_parent:       { label: 'Pending Parent Approval', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  pending_warden:       { label: 'Pending Warden Approval', color: '#7c2d12', bg: '#ffedd5', border: '#fdba74' },
  pending_chief_warden: { label: 'Pending Chief Warden',    color: '#7c2d12', bg: '#ffedd5', border: '#fdba74' },
  pending_hod:          { label: 'Pending HOD Approval',    color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  approved:             { label: 'Approved',                color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
  rejected:             { label: 'Rejected',                color: '#7f1d1d', bg: '#fee2e2', border: '#fca5a5' },
  cancelled:            { label: 'Cancelled',               color: '#374151', bg: '#f3f4f6', border: '#d1d5db' },
  completed:            { label: 'Completed',               color: '#1e3a5f', bg: '#dbeafe', border: '#93c5fd' },
  expired:              { label: 'Expired',                 color: '#4b5563', bg: '#f9fafb', border: '#e5e7eb' },
  draft:                { label: 'Draft',                   color: '#4b5563', bg: '#f9fafb', border: '#e5e7eb' },
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

const ROLE_LABELS: Record<string, string> = {
  parent:          'Parent',
  warden:          'Warden',
  chief_warden:    'Chief Warden',
  hod:             'HOD',
  vice_chancellor: 'Vice Chancellor',
};

function formatDate(dateStr: string | Date) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDateTime(dateStr: string | Date) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function calcDays(from: string | Date, to: string | Date) {
  const d1 = new Date(from);
  const d2 = new Date(to);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

// ─── Component ────────────────────────────────────────────────────
export function LeaveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [leave, setLeave] = useState<LeaveRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const fetchLeave = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await leaveApi.getById(id);
      setLeave(data);
    } catch {
      setError('Failed to load leave details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchLeave(); }, [fetchLeave]);

  const handleDownloadPDF = async () => {
    if (!id || !leave) return;
    setIsPdfLoading(true);
    setPdfError('');
    try {
      const blob = await leaveApi.downloadPDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leave-pass-${leave.leaveId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setPdfError('Could not generate PDF. Please try again.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  // Show PDF button only for the student who owns the leave when status is approved/completed
  const isApprovedOrCompleted = leave?.status === 'approved' || leave?.status === 'completed';
  const isOwningStudent =
    user?.role === 'student' &&
    leave?.studentId?.userId !== undefined &&
    String(leave.studentId.userId) === String(user._id);

  const canDownloadPDF = isApprovedOrCompleted && isOwningStudent;

  const statusInfo = leave ? (STATUS_CONFIG[leave.status] ?? STATUS_CONFIG['draft']) : null;

  if (isLoading) {
    return (
      <div className="leave-detail__loading">
        <div className="leave-detail__spinner" />
        <p>Loading leave details…</p>
      </div>
    );
  }

  if (error || !leave) {
    return (
      <div className="leave-detail__error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3>{error || 'Leave request not found'}</h3>
        <button className="leave-detail__btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="leave-detail">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="leave-detail__header">
        <div className="leave-detail__header-left">
          <button className="leave-detail__back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="leave-detail__title">Leave Details</h1>
            <p className="leave-detail__subtitle">Leave ID: <strong>{leave.leaveId}</strong></p>
          </div>
        </div>

        <div className="leave-detail__header-right">
          {statusInfo && (
            <span className="leave-detail__status-badge" style={{ color: statusInfo.color, background: statusInfo.bg, borderColor: statusInfo.border }}>
              {statusInfo.label}
            </span>
          )}

          {canDownloadPDF && (
            <button
              id="download-leave-pdf"
              className="leave-detail__pdf-btn"
              onClick={handleDownloadPDF}
              disabled={isPdfLoading}
              aria-label="Download leave pass as PDF"
            >
              {isPdfLoading ? (
                <><div className="leave-detail__btn-spinner" /> Generating…</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Leave Pass (PDF)
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {pdfError && (
        <div className="leave-detail__pdf-error" role="alert">{pdfError}</div>
      )}

      <div className="leave-detail__body">

        {/* ── Student Info ──────────────────────────────────────── */}
        <div className="leave-detail__card">
          <h2 className="leave-detail__card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            Student Information
          </h2>
          <div className="leave-detail__grid-2">
            <div className="leave-detail__field">
              <span className="leave-detail__field-label">Name</span>
              <span className="leave-detail__field-value">{leave.studentId?.name || '—'}</span>
            </div>
            <div className="leave-detail__field">
              <span className="leave-detail__field-label">Roll Number</span>
              <span className="leave-detail__field-value">{leave.studentId?.rollNumber || '—'}</span>
            </div>
            <div className="leave-detail__field">
              <span className="leave-detail__field-label">Department</span>
              <span className="leave-detail__field-value">{leave.studentId?.departmentId?.name || '—'}</span>
            </div>
            <div className="leave-detail__field">
              <span className="leave-detail__field-label">Course</span>
              <span className="leave-detail__field-value">{leave.studentId?.courseId?.name || '—'}</span>
            </div>
            <div className="leave-detail__field">
              <span className="leave-detail__field-label">Hostel</span>
              <span className="leave-detail__field-value">{leave.studentId?.hostelId?.name || '—'}</span>
            </div>
            <div className="leave-detail__field">
              <span className="leave-detail__field-label">Room</span>
              <span className="leave-detail__field-value">{leave.studentId?.roomId?.roomNumber || '—'}</span>
            </div>
          </div>
        </div>

        {/* ── Leave Info ────────────────────────────────────────── */}
        <div className="leave-detail__card">
          <h2 className="leave-detail__card-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Leave Information
          </h2>
          <div className="leave-detail__grid-2">
            <div className="leave-detail__field">
              <span className="leave-detail__field-label">Leave Type</span>
              <span className="leave-detail__field-value">{LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType}</span>
            </div>
            <div className="leave-detail__field">
              <span className="leave-detail__field-label">Duration</span>
              <span className="leave-detail__field-value">{calcDays(leave.fromDate, leave.toDate)} day(s)</span>
            </div>
            <div className="leave-detail__field">
              <span className="leave-detail__field-label">From Date</span>
              <span className="leave-detail__field-value">{formatDate(leave.fromDate)}</span>
            </div>
            <div className="leave-detail__field">
              <span className="leave-detail__field-label">To Date</span>
              <span className="leave-detail__field-value">{formatDate(leave.toDate)}</span>
            </div>
            <div className="leave-detail__field leave-detail__field--full">
              <span className="leave-detail__field-label">Destination</span>
              <span className="leave-detail__field-value">{leave.destination}</span>
            </div>
            <div className="leave-detail__field leave-detail__field--full">
              <span className="leave-detail__field-label">Reason</span>
              <span className="leave-detail__field-value leave-detail__reason">{leave.reason}</span>
            </div>
          </div>
          <div className="leave-detail__applied-on">
            Applied on {formatDateTime(leave.createdAt)}
          </div>
        </div>

        {/* ── Supporting Documents ──────────────────────────────── */}
        {leave.documents && leave.documents.length > 0 && (
          <div className="leave-detail__card">
            <h2 className="leave-detail__card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Supporting Documents
            </h2>
            <div className="leave-detail__docs">
              {leave.documents.map((doc, i) => (
                <a key={i} href={doc} target="_blank" rel="noopener noreferrer" className="leave-detail__doc-link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  Document {i + 1}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Approval Timeline ─────────────────────────────────── */}
        {leave.approvals && leave.approvals.length > 0 && (
          <div className="leave-detail__card">
            <h2 className="leave-detail__card-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
              Approval Timeline
            </h2>
            <div className="leave-detail__timeline">
              {leave.approvals.map((approval, i) => {
                // Populated structure: { approverId: { name, email, role }, role, action: 'approved'|'rejected', remarks, actionDate }
                const isApproved = approval.action === 'approved';
                const isRejected = approval.action === 'rejected';

                return (
                  <div
                    key={i}
                    className={`leave-detail__timeline-item ${
                      isApproved ? 'leave-detail__timeline-item--approved' :
                      isRejected ? 'leave-detail__timeline-item--rejected' :
                      'leave-detail__timeline-item--pending'
                    }`}
                  >
                    <div className="leave-detail__timeline-dot">
                      {isApproved ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : isRejected ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="4" />
                        </svg>
                      )}
                    </div>
                    <div className="leave-detail__timeline-content">
                      <div className="leave-detail__timeline-header">
                        <span className="leave-detail__timeline-stage">
                          {ROLE_LABELS[approval.role] || approval.role}
                        </span>
                        <span className={`leave-detail__timeline-action leave-detail__timeline-action--${isApproved ? 'approve' : isRejected ? 'reject' : 'pending'}`}>
                          {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Awaiting'}
                        </span>
                      </div>
                      {approval.approverId?.name && (
                        <p className="leave-detail__timeline-approver">by {approval.approverId.name}</p>
                      )}
                      {approval.remarks && (
                        <p className="leave-detail__timeline-remarks">"{approval.remarks}"</p>
                      )}
                      {approval.actionDate && (
                        <p className="leave-detail__timeline-date">{formatDateTime(approval.actionDate)}</p>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
