/**
 * Admin: Registration Form Responses Page
 * Lists every application/ response submitted through a specific
 * public registration form and lets staff take action on them
 * (view, approve, reject).
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  adminApi,
  type ApplicationRecord,
  type RegistrationFormRecord,
} from '@/services/admin.service';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import '../shared/ApprovalsPage.css';
import './AdminPages.css';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'pending' },
  under_review: { label: 'Under Review', color: 'pending' },
  approved: { label: 'Approved', color: 'approved' },
  rejected: { label: 'Rejected', color: 'rejected' },
  allocated: { label: 'Allocated', color: 'success' },
};

interface DecisionModal {
  id: string;
  name: string;
  action: 'approve' | 'reject';
}

export function FormResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { error: showError, success } = useFeedback();

  const canAct = ['admin', 'chief_warden', 'warden'].includes(user?.role || '');

  const [form, setForm] = useState<RegistrationFormRecord | null>(null);
  const [responses, setResponses] = useState<ApplicationRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState<DecisionModal | null>(null);
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchForm = useCallback(async () => {
    if (!id) return;
    try {
      setForm(await adminApi.getRegistrationFormById(id));
    } catch {
      showError('Failed to load registration form.');
    }
  }, [id]);

  const fetchResponses = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminApi.getApplications({
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
        registrationFormId: id,
      });
      setResponses(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch {
      showError('Failed to load responses.');
    } finally {
      setLoading(false);
    }
  }, [id, page, search, statusFilter]);

  useEffect(() => { fetchForm(); }, [fetchForm]);
  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  const openModal = (response: ApplicationRecord, action: 'approve' | 'reject') => {
    setRemarks('');
    setModal({ id: response._id, name: response.fullName, action });
  };

  const closeModal = () => {
    if (processing) return;
    setModal(null);
    setRemarks('');
  };

  const handleConfirm = async () => {
    if (!modal) return;
    if (modal.action === 'reject' && !remarks.trim()) {
      showError('Rejection reason is required.');
      return;
    }
    setProcessing(true);
    try {
      await adminApi.approveRejectApplication(modal.id, {
        action: modal.action,
        reviewNotes: modal.action === 'approve' ? remarks.trim() || undefined : undefined,
        rejectionReason: modal.action === 'reject' ? remarks.trim() : undefined,
      });
      success(`Application ${modal.action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setModal(null);
      setRemarks('');
      fetchResponses();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showError(e.response?.data?.message || 'Failed to update application.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <button
          className="btn-action btn-action--view"
          onClick={() => navigate(`/admin/registration-forms/${id}`)}
          style={{ marginRight: 8 }}
        >
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="approvals-page__title">
            {form ? `Responses — ${form.title}` : 'Form Responses'}
          </h1>
          <p className="approvals-page__subtitle">
            {pagination.total} response{pagination.total !== 1 ? 's' : ''} received
          </p>
        </div>
        <button className="btn btn--secondary" onClick={fetchResponses}>
          ⟳ Refresh
        </button>
      </div>

      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Search by name, student number, email, or application number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchResponses())}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="allocated">Allocated</option>
        </select>
        <button className="btn btn--primary btn--sm" onClick={() => { setPage(1); fetchResponses(); }}>
          Search
        </button>
      </div>

      <Card variant="default" padding="none">
        {loading ? (
          <div className="table-empty"><div className="spinner" /><p>Loading…</p></div>
        ) : responses.length === 0 ? (
          <div className="table-empty"><p>No responses found for this form.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Student</th>
                  <th>Student No.</th>
                  <th>Email</th>
                  <th>Department / Course</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((a) => {
                  const status = STATUS_CONFIG[a.status] || { label: a.status, color: 'neutral' };
                  const canReview = canAct && (a.status === 'pending' || a.status === 'under_review');
                  return (
                    <tr key={a._id}>
                      <td><code className="leave-id">{a.applicationNumber}</code></td>
                      <td>
                        <div className="cell-primary">{a.fullName}</div>
                        <div className="cell-secondary">{a.email}</div>
                      </td>
                      <td>{a.studentNumber}</td>
                      <td>{a.email}</td>
                      <td>
                        <div className="cell-primary">{a.departmentId?.name ?? '—'}</div>
                        <div className="cell-secondary">{a.courseId?.name ?? '—'}</div>
                      </td>
                      <td>
                        <span className={`status-badge status-badge--${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-action btn-action--view"
                            onClick={() => navigate(`/admin/applications/${a._id}`)}
                          >
                            View
                          </button>
                          {canReview && (
                            <>
                              <button
                                className="btn-action btn-action--approve"
                                onClick={() => openModal(a, 'approve')}
                              >
                                Approve
                              </button>
                              <button
                                className="btn-action btn-action--reject"
                                onClick={() => openModal(a, 'reject')}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <span className="page-info">Page {page} of {pagination.totalPages}</span>
            <button className="page-btn" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </div>
        )}
      </Card>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">
              {modal.action === 'approve' ? '✅ Approve Application' : '❌ Reject Application'}
            </h3>
            <p className="modal__desc">
              {modal.action === 'approve'
                ? `Confirm approval for ${modal.name}. Add optional remarks.`
                : `Provide a reason for rejecting ${modal.name}'s application.`}
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