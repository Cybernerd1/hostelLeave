/** Admin: Audit Logs Page */
import { useState, useEffect, useCallback } from 'react';
import { adminApi, type AuditLogRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import '../shared/ApprovalsPage.css';

const ACTION_COLORS: Record<string, string> = {
  create: 'approved', update: 'info', delete: 'rejected', login: 'neutral', logout: 'neutral',
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs({
        page, limit: 20,
        action: actionFilter || undefined,
        entity: entityFilter || undefined,
      });
      setLogs(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch { setLogs([]); } finally { setLoading(false); }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d: string) => new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div>
          <h1 className="approvals-page__title">Audit Logs</h1>
          <p className="approvals-page__subtitle">{pagination.total} log entries</p>
        </div>
      </div>
      <div className="filters-row">
        <select className="filter-select" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
          {['', 'create', 'update', 'delete', 'login', 'logout'].map((a) => <option key={a} value={a}>{a || 'All Actions'}</option>)}
        </select>
        <input className="filter-input" placeholder="Filter by entity (e.g. Student)…" value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }} style={{ maxWidth: 220 }} />
      </div>
      <Card variant="default" padding="none">
        {loading ? <div className="table-empty"><div className="spinner" /></div> : logs.length === 0 ? <div className="table-empty"><p>No logs found.</p></div> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Description</th></tr></thead>
              <tbody>
                {logs.map((l) => {
                  const actor = typeof l.userId === 'string' ? l.userId : l.userId?.name ?? '—';
                  return (
                    <tr key={l._id}>
                      <td className="cell-secondary" style={{ whiteSpace: 'nowrap' }}>{formatDate(l.createdAt)}</td>
                      <td><div className="cell-primary">{actor}</div>
                        {typeof l.userId !== 'string' && <div className="cell-secondary">{l.userId?.role}</div>}
                      </td>
                      <td><span className={`status-badge status-badge--${ACTION_COLORS[l.action] ?? 'neutral'}`}>{l.action}</span></td>
                      <td><span className="leave-type-badge">{l.entity}</span></td>
                      <td style={{ maxWidth: 280 }}>{l.description}</td>
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
