/** Admin: Courses Page */
import { useState, useEffect, useCallback } from 'react';
import { adminApi, type CourseRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import '../shared/ApprovalsPage.css';

export function CoursesPage() {
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCourses({ page, limit: 15, search: search || undefined });
      setCourses(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch { setCourses([]); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div>
          <h1 className="approvals-page__title">Courses</h1>
          <p className="approvals-page__subtitle">{pagination.total} courses</p>
        </div>
      </div>
      <div className="filters-row">
        <input className="filter-input" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchData())} />
        <button className="btn btn--primary btn--sm" onClick={() => { setPage(1); fetchData(); }}>Search</button>
      </div>
      <Card variant="default" padding="none">
        {loading ? <div className="table-empty"><div className="spinner" /></div> : courses.length === 0 ? <div className="table-empty"><p>No courses found.</p></div> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Code</th><th>Department</th><th>Duration</th><th>Semesters</th><th>Status</th></tr></thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c._id}>
                    <td><div className="cell-primary">{c.name}</div></td>
                    <td><code className="leave-id">{c.code}</code></td>
                    <td>{(c.departmentId as unknown as { name: string })?.name || '—'}</td>
                    <td>{c.duration} yr</td>
                    <td>{c.totalSemesters} sem</td>
                    <td><span className={`status-badge status-badge--${c.isActive ? 'approved' : 'rejected'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
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
