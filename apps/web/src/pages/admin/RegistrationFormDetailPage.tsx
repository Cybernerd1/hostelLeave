/**
 * Admin: Registration Form Detail Page
 * View and manage a single registration form's details.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi, type RegistrationFormRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import './AdminPages.css';

export function RegistrationFormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error: showError, success } = useFeedback();

  const [form, setForm] = useState<RegistrationFormRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const baseUrl = import.meta.env.VITE_WEB_BASE_URL || window.location.origin;

  const fetchForm = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminApi.getRegistrationFormById(id);
      setForm(data);
    } catch {
      showError('Failed to load registration form.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchForm(); }, [fetchForm]);

  const toggleForm = async () => {
    if (!form) return;
    try {
      await adminApi.updateRegistrationForm(form._id, { isActive: !form.isActive });
      success(`Form ${!form.isActive ? 'activated' : 'deactivated'} successfully.`);
      fetchForm();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showError(e.response?.data?.message || 'Failed to update form.');
    }
  };

  const copyLink = () => {
    if (!form) return;
    navigator.clipboard.writeText(`${baseUrl}/register/${form.token}`);
    success('Registration link copied to clipboard.');
  };

  if (loading) {
    return (
      <div className="approvals-page animate-fade-in-up">
        <div className="table-empty"><div className="spinner" /><p>Loading…</p></div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="approvals-page animate-fade-in-up">
        <div className="table-empty"><p>Registration form not found.</p></div>
      </div>
    );
  }

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <button className="btn-action btn-action--view" onClick={() => navigate('/admin/registration-forms')} style={{ marginRight: 8 }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="approvals-page__title">{form.title}</h1>
          <p className="approvals-page__subtitle">Registration Form Details</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn--secondary" onClick={() => navigate(`/admin/registration-forms/${form._id}/responses`)}>
            📥 Responses ({form.submissionCount})
          </button>
          <button className="btn btn--secondary" onClick={copyLink}>
            📋 Copy Link
          </button>
          <button className="btn btn--primary" onClick={toggleForm}>
            {form.isActive ? '⏸ Deactivate' : '▶ Activate'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* General Info */}
        <Card variant="default" padding="lg">
          <p className="detail-section__title">General Information</p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Title</span>
              <p style={{ margin: '0.25rem 0 0', fontWeight: 600 }}>{form.title}</p>
            </div>
            {form.description && (
              <div>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Description</span>
                <p style={{ margin: '0.25rem 0 0' }}>{form.description}</p>
              </div>
            )}
            <div>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Status</span>
              <p style={{ margin: '0.25rem 0 0' }}>
                <span className={`status-badge status-badge--${form.isActive ? 'approved' : 'rejected'}`}>
                  {form.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Created By</span>
              <p style={{ margin: '0.25rem 0 0' }}>{form.createdBy?.name || '—'} ({form.createdBy?.email || '—'})</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Created At</span>
              <p style={{ margin: '0.25rem 0 0' }}>{new Date(form.createdAt).toLocaleString('en-IN')}</p>
            </div>
          </div>
        </Card>

        {/* Configuration */}
        <Card variant="default" padding="lg">
          <p className="detail-section__title">Configuration</p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Academic Session</span>
              <p style={{ margin: '0.25rem 0 0' }}>{form.academicSession || '—'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Submissions</span>
              <p style={{ margin: '0.25rem 0 0' }}>
                {form.submissionCount}{form.submissionLimit ? ` / ${form.submissionLimit}` : ' (unlimited)'}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Expires At</span>
              <p style={{ margin: '0.25rem 0 0' }}>
                {form.expiresAt ? new Date(form.expiresAt).toLocaleString('en-IN') : 'No expiry'}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Required Fields</span>
              <p style={{ margin: '0.25rem 0 0' }}>
                {form.requiredFields?.length ? form.requiredFields.join(', ') : 'All fields required by default'}
              </p>
            </div>
          </div>
        </Card>

        {/* Public Link */}
        <Card variant="default" padding="lg" style={{ gridColumn: 'span 2' }}>
          <p className="detail-section__title">Public Registration Link</p>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              className="filter-input"
              style={{ flex: 1, fontFamily: 'monospace' }}
              readOnly
              value={`${baseUrl}/register/${form.token}`}
            />
            <button className="btn btn--primary btn--sm" onClick={copyLink}>Copy</button>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
            Share this link with students. They can register without authentication.
          </p>
        </Card>
      </div>
    </div>
  );
}

