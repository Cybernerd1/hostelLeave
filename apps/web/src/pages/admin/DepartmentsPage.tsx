/** Admin: Departments Page */
import { useState, useEffect, useCallback } from 'react';
import { adminApi, type DepartmentRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import '../shared/ApprovalsPage.css';

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDepartments({ page, limit: 15, search: search || undefined });
      setDepartments(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch { setDepartments([]); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div>
          <h1 className="approvals-page__title">Departments</h1>
          <p className="approvals-page__subtitle">{pagination.total} departments</p>
        </div>
      </div>
      <div className="filters-row">
        <input className="filter-input" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchData())} />
        <button className="btn btn--primary btn--sm" onClick={() => { setPage(1); fetchData(); }}>Search</button>
      </div>
      <Card variant="default" padding="none">
        {loading ? <div className="table-empty"><div className="spinner" /></div> : departments.length === 0 ? <div className="table-empty"><p>No departments found.</p></div> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Code</th><th>Description</th><th>Status</th></tr></thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d._id}>
                    <td><div className="cell-primary">{d.name}</div></td>
                    <td><code className="leave-id">{d.code}</code></td>
                    <td>{d.description || '—'}</td>
                    <td><span className={`status-badge status-badge--${d.isActive ? 'approved' : 'rejected'}`}>{d.isActive ? 'Active' : 'Inactive'}</span></td>
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
