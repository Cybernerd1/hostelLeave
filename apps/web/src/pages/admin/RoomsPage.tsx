/** Admin: Rooms Page */
import { useState, useEffect, useCallback } from 'react';
import { adminApi, type RoomRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import '../shared/ApprovalsPage.css';

export function RoomsPage() {
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getRooms({ page, limit: 20, search: search || undefined });
      setRooms(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch { setRooms([]); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div>
          <h1 className="approvals-page__title">Rooms</h1>
          <p className="approvals-page__subtitle">{pagination.total} rooms</p>
        </div>
      </div>
      <div className="filters-row">
        <input className="filter-input" placeholder="Search room number…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchData())} />
        <button className="btn btn--primary btn--sm" onClick={() => { setPage(1); fetchData(); }}>Search</button>
      </div>
      <Card variant="default" padding="none">
        {loading ? <div className="table-empty"><div className="spinner" /></div> : rooms.length === 0 ? <div className="table-empty"><p>No rooms found.</p></div> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Room</th><th>Hostel</th><th>Floor</th><th>Type</th><th>Occupancy</th><th>Status</th></tr></thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r._id}>
                    <td><div className="cell-primary">{r.roomNumber}</div></td>
                    <td>{(r.hostelId as unknown as { name: string })?.name || '—'}</td>
                    <td>{r.floor}</td>
                    <td><span className="leave-type-badge">{r.type}</span></td>
                    <td>
                      <span className={`status-badge status-badge--${r.occupied >= r.capacity ? 'rejected' : 'approved'}`}>
                        {r.occupied} / {r.capacity}
                      </span>
                    </td>
                    <td><span className={`status-badge status-badge--${r.isActive ? 'approved' : 'rejected'}`}>{r.isActive ? 'Active' : 'Inactive'}</span></td>
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
