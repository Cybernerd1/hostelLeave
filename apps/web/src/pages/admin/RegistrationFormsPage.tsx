/**
 * Admin: Registration Form Management Page
 * Create and manage shareable public student registration forms.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, type RegistrationFormRecord } from '@/services/admin.service';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import './AdminPages.css';

export function RegistrationFormsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdminOrChief = user?.role === 'admin' || user?.role === 'chief_warden';

  const [forms, setForms] = useState<RegistrationFormRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getRegistrationForms({ page, limit: 15, search: search || undefined });
      setForms(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch {
      setError('Failed to load registration forms.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const baseUrl = import.meta.env.VITE_WEB_BASE_URL || window.location.origin;

  const toggleForm = async (id: string, isActive: boolean) => {
    try {
      await adminApi.updateRegistrationForm(id, { isActive: !isActive });
      setMsg(`✅ Form ${!isActive ? 'activated' : 'deactivated'} successfully!`);
      fetchForms();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMsg('❌ ' + (e.response?.data?.message || 'Failed to update form.'));
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
        <button className="btn-action btn-action--view" onClick={() => navigate('/admin/students')} style={{ marginRight: 8 }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="approvals-page__title">Registration Forms</h1>
          <p className="approvals-page__subtitle">{pagination.total} total forms</p>
        </div>
        <button className="btn btn--primary" onClick={() => navigate('/admin/registration-forms/new')}>
          + Create Form
        </button>
      </div>

      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Search by form title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchForms())}
        />
        <button className="btn btn--primary btn--sm" onClick={() => { setPage(1); fetchForms(); }}>Search</button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {msg && <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 6, background: msg.startsWith('✅') ? '#d1fae5' : '#fee2e2', color: msg.startsWith('✅') ? '#15803d' : '#dc2626', fontSize: '0.875rem' }}>{msg}</div>}

      <Card variant="default" padding="none">
        {loading ? (
          <div className="table-empty"><div className="spinner" /><p>Loading…</p></div>
        ) : forms.length === 0 ? (
          <div className="table-empty"><p>No registration forms found.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Token</th>
                  <th>Academic Session</th>
                  <th>Submissions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f) => (
                  <tr key={f._id}>
                    <td>
                      <div className="cell-primary">{f.title}</div>
                      <div className="cell-secondary">{f.description || '—'}</div>
                    </td>
                    <td>
                      <div className="cell-primary" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{f.token}</div>
                      <button className="btn-action btn-action--view" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }} onClick={() => {
                        navigator.clipboard.writeText(`${baseUrl}/register/${f.token}`);
                        setMsg('✅ Link copied to clipboard!');
                      }}>Copy Link</button>
                    </td>
                    <td>{f.academicSession || '—'}</td>
                    <td>{f.submissionCount}{f.submissionLimit ? ` / ${f.submissionLimit}` : ''}</td>
                    <td>
                      <span className={`status-badge status-badge--${f.isActive ? 'approved' : 'rejected'}`}>
                        {f.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-action btn-action--view" onClick={() => navigate(`/admin/registration-forms/${f._id}`)}>View</button>
                        <button className="btn-action btn-action--view" onClick={() => toggleForm(f._id, f.isActive)}>
                          {f.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}



