/**
 * Admin: Create Registration Form Page
 * Create a shareable public student registration form.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/services/admin.service';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import './AdminPages.css';

export function CreateRegistrationFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdminOrChief = user?.role === 'admin' || user?.role === 'chief_warden';

  const [form, setForm] = useState({
    title: '', description: '', academicSession: '', expiresAt: '', submissionLimit: '', requiredFields: '',
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const baseUrl = import.meta.env.VITE_WEB_BASE_URL || window.location.origin;

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
    setMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const requiredFields = form.requiredFields ? form.requiredFields.split(',').map(s => s.trim()).filter(Boolean) : undefined;
      await adminApi.createRegistrationForm({
        title: form.title,
        description: form.description,
        academicSession: form.academicSession,
        expiresAt: form.expiresAt,
        submissionLimit: form.submissionLimit,
        requiredFields,
      });
      setMsg('✅ Registration form created successfully!');
      setTimeout(() => navigate('/admin/registration-forms'), 1500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMsg('❌ ' + (e.response?.data?.message || 'Failed to create form.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdminOrChief) {
    return (
      <div className="approvals-page animate-fade-in-up">
        <div className="table-empty"><p>Access denied. Admin or Chief Warden role required.</p></div>
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
          <h1 className="approvals-page__title">Create Registration Form</h1>
          <p className="approvals-page__subtitle">Create a shareable public student registration form</p>
        </div>
      </div>

      {msg && <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 6, background: msg.startsWith('✅') ? '#d1fae5' : '#fee2e2', color: msg.startsWith('✅') ? '#15803d' : '#dc2626', fontSize: '0.875rem' }}>{msg}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <Card variant="default" padding="lg" style={{ gridColumn: 'span 2' }}>
          <p className="detail-section__title">Form Configuration</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Form Title *</label>
              <input className="filter-input" value={form.title} onChange={(e) => handleChange('title', e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Academic Session</label>
              <input className="filter-input" value={form.academicSession} onChange={(e) => handleChange('academicSession', e.target.value)} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Description</label>
              <textarea className="filter-input" value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={3} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Expiry Date</label>
              <input className="filter-input" type="datetime-local" value={form.expiresAt} onChange={(e) => handleChange('expiresAt', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Submission Limit</label>
              <input className="filter-input" type="number" value={form.submissionLimit} onChange={(e) => handleChange('submissionLimit', e.target.value)} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Required Fields (comma-separated)</label>
              <input className="filter-input" value={form.requiredFields} onChange={(e) => handleChange('requiredFields', e.target.value)} />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Example: fullName, studentNumber, email, phoneNumber, gender, departmentId
              </p>
            </div>
          </div>
        </Card>

        <Card variant="default" padding="lg" style={{ gridColumn: 'span 2' }}>
          <p className="detail-section__title">Public Link</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.5rem' }}>
                Share this link with students. They can register without authentication.
              </p>
              <input className="filter-input" style={{ fontFamily: 'monospace' }} readOnly value={`${baseUrl}/register/${form.title ? 'FORM_TOKEN_WILL_BE_GENERATED' : ''}`} />
            </div>
          </div>
        </Card>

        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/admin/registration-forms')}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Form'}
          </button>
        </div>
      </form>
    </div>
  );
}



