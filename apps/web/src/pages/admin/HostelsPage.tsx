/** Admin: Hostels Page */
import { useState, useEffect, useCallback } from 'react';
import { adminApi, type HostelRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import '../shared/ApprovalsPage.css';

export function HostelsPage() {
  const [hostels, setHostels] = useState<HostelRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getHostels({ page, limit: 15, search: search || undefined });
      setHostels(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch { setHostels([]); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div>
          <h1 className="approvals-page__title">Hostels</h1>
          <p className="approvals-page__subtitle">{pagination.total} hostels</p>
        </div>
      </div>
      <div className="filters-row">
        <input className="filter-input" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchData())} />
        <button className="btn btn--primary btn--sm" onClick={() => { setPage(1); fetchData(); }}>Search</button>
      </div>
      <Card variant="default" padding="none">
        {loading ? <div className="table-empty"><div className="spinner" /></div> : hostels.length === 0 ? <div className="table-empty"><p>No hostels found.</p></div> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Type</th><th>Total Rooms</th><th>Capacity</th><th>Occupied</th><th>Status</th></tr></thead>
              <tbody>
                {hostels.map((h) => (
                  <tr key={h._id}>
                    <td><div className="cell-primary">{h.name}</div></td>
                    <td><span className="leave-type-badge">{h.type}</span></td>
                    <td>{h.totalRooms}</td>
                    <td>{h.capacity}</td>
                    <td>
                      <span className={`status-badge status-badge--${h.occupancy >= h.capacity ? 'rejected' : 'approved'}`}>
                        {h.occupancy} / {h.capacity}
                      </span>
                    </td>
                    <td><span className={`status-badge status-badge--${h.isActive ? 'approved' : 'rejected'}`}>{h.isActive ? 'Active' : 'Inactive'}</span></td>
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
