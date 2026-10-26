/**
 * Shared: Pending Approvals Page
 * Used by Parent, Warden, Chief Warden, HOD
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaveApi, type LeaveRequest } from '@/services/leave.service';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import { getRoleConfig } from '@/utils/roleConfig';
import './ApprovalsPage.css';

const STATUS_COLORS: Record<string, string> = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  parent_approved: 'info',
  warden_approved: 'info',
  hod_approved: 'info',
  active: 'approved',
  completed: 'neutral',
  cancelled: 'neutral',
};

export function PendingApprovalsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const basePath = user ? getRoleConfig(user.role).basePath : '';
  const { error: showError, success } = useFeedback();

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Approval modal state
  const [modal, setModal] = useState<{ leaveId: string; action: 'approve' | 'reject' } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const data = await leaveApi.getPending();
      setLeaves(data);
    } catch {
      showError('Failed to load pending approvals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const openModal = (leaveId: string, action: 'approve' | 'reject') => {
    setModal({ leaveId, action });
    setRemarks('');
  };

  const closeModal = () => { setModal(null); setRemarks(''); };

  const handleConfirm = async () => {
    if (!modal) return;
    setProcessing(true);
    try {
      await leaveApi.processApproval(modal.leaveId, modal.action, remarks);
      await fetchPending();
      success(`Leave ${modal.action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      closeModal();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showError(e.response?.data?.message || 'Action failed.');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div>
          <h1 className="approvals-page__title">Pending Approvals</h1>
          <p className="approvals-page__subtitle">
            {leaves.length} leave request{leaves.length !== 1 ? 's' : ''} awaiting your decision
          </p>
        </div>
        <button className="icon-btn" onClick={fetchPending} title="Refresh" aria-label="Refresh">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/></svg>
        </button>
      </div>

      <Card variant="default" padding="none">
        {loading ? (
          <div className="table-empty"><div className="spinner" /><p>Loading…</p></div>
        ) : leaves.length === 0 ? (
          <div className="table-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-300)" strokeWidth="1.25"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p>No pending approvals — you're all caught up!</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave._id}>
                    <td>
                      <div className="cell-primary">{leave.studentId?.name ?? '—'}</div>
                      <div className="cell-secondary">{leave.studentId?.rollNumber}</div>
                    </td>
                    <td><span className="leave-type-badge">{leave.leaveType}</span></td>
                    <td>{formatDate(leave.fromDate)}</td>
                    <td>{formatDate(leave.toDate)}</td>
                    <td>
                      <span className={`status-badge status-badge--${STATUS_COLORS[leave.status] ?? 'neutral'}`}>
                        {leave.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-action btn-action--view"
                          onClick={() => navigate(`${basePath}/leaves/${leave._id}`)}
                        >View</button>
                        <button
                          className="btn-action btn-action--approve"
                          onClick={() => openModal(leave._id, 'approve')}
                        >Approve</button>
                        <button
                          className="btn-action btn-action--reject"
                          onClick={() => openModal(leave._id, 'reject')}
                        >Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Approval / Rejection Modal */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">
              {modal.action === 'approve' ? '✅ Approve Leave' : '❌ Reject Leave'}
            </h3>
            <p className="modal__desc">
              {modal.action === 'approve'
                ? 'Confirm approval. Add optional remarks.'
                : 'Please provide a reason for rejection.'}
            </p>
            <textarea
              className="modal__textarea"
              placeholder={modal.action === 'approve' ? 'Remarks (optional)' : 'Reason for rejection (required)'}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
            />
            <div className="modal__actions">
              <button className="btn btn--secondary" onClick={closeModal} disabled={processing}>Cancel</button>
              <button
                className={`btn ${modal.action === 'approve' ? 'btn--success' : 'btn--danger'}`}
                onClick={handleConfirm}
                disabled={processing || (modal.action === 'reject' && !remarks.trim())}
              >
                {processing ? 'Processing…' : modal.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
