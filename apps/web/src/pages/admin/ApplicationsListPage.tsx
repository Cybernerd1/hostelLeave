/**
 * Admin: Applications List Page
 * Searchable, filterable, paginated table of student applications.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, type ApplicationRecord } from '@/services/admin.service';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import './AdminPages.css';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'pending' },
  under_review: { label: 'Under Review', color: 'pending' },
  approved: { label: 'Approved', color: 'approved' },
  rejected: { label: 'Rejected', color: 'rejected' },
  allocated: { label: 'Allocated', color: 'success' },
};

const SOURCE_CONFIG: Record<string, string> = {
  manual: 'Manual',
  import: 'Import',
  public_form: 'Public Form',
};

export function ApplicationsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdminOrChief = user?.role === 'admin' || user?.role === 'chief_warden';

  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getApplications({
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
      });
      setApplications(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch {
      setError('Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sourceFilter]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div>
          <h1 className="approvals-page__title">Student Applications</h1>
          <p className="approvals-page__subtitle">{pagination.total} total applications</p>
        </div>
        {isAdminOrChief && (
          <button className="btn btn--primary" onClick={() => navigate('/admin/students/register')}>
            + Register Student
          </button>
        )}
      </div>

      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Search by name, student number, email, or application number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchApplications())}
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => { setPage(1); setStatusFilter(e.target.value); fetchApplications(); }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="allocated">Allocated</option>
        </select>
        <select
          className="filter-select"
          value={sourceFilter}
          onChange={(e) => { setPage(1); setSourceFilter(e.target.value); fetchApplications(); }}
        >
          <option value="">All Sources</option>
          <option value="manual">Manual</option>
          <option value="import">Import</option>
          <option value="public_form">Public Form</option>
        </select>
        <button className="btn btn--primary btn--sm" onClick={() => { setPage(1); fetchApplications(); }}>Search</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <Card variant="default" padding="none">
        {loading ? (
          <div className="table-empty"><div className="spinner" /><p>Loading…</p></div>
        ) : applications.length === 0 ? (
          <div className="table-empty"><p>No applications found.</p></div>
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
                  <th>Source</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => {
                  const status = STATUS_CONFIG[a.status] || { label: a.status, color: 'neutral' };
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
                      <td>{SOURCE_CONFIG[a.source] || a.source}</td>
                      <td>
                        <span className={`status-badge status-badge--${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-action btn-action--view" onClick={() => navigate(`/admin/applications/${a._id}`)}>
                            View
                          </button>
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
    </div>
  );
}



