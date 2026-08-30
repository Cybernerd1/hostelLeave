/**
 * Shared: All Leaves Page
 * Used by Warden, Chief Warden, HOD, VC, Admin
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaveApi, type LeaveRequest } from '@/services/leave.service';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { getRoleConfig } from '@/utils/roleConfig';
import './ApprovalsPage.css';

const STATUS_COLORS: Record<string, string> = {
  pending: 'pending', approved: 'approved', rejected: 'rejected',
  parent_approved: 'info', warden_approved: 'info', hod_approved: 'info',
  active: 'approved', completed: 'neutral', cancelled: 'neutral', expired: 'neutral',
};

const STATUS_OPTIONS = ['', 'pending', 'parent_approved', 'warden_approved', 'hod_approved', 'approved', 'rejected', 'active', 'completed', 'cancelled'];

export function AllLeavesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const basePath = user ? getRoleConfig(user.role).basePath : '';

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leaveApi.getAll({ page, limit: 15, status: status || undefined, search: search || undefined });
      setLeaves(res.data ?? []);
      const p = res.pagination as { page: number; totalPages: number; total: number };
      setPagination({ page: p?.page ?? 1, totalPages: p?.totalPages ?? 1, total: p?.total ?? 0 });
    } catch {
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  // Reset to page 1 on filter change
  const applySearch = () => { setPage(1); fetchLeaves(); };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div>
          <h1 className="approvals-page__title">All Leaves</h1>
          <p className="approvals-page__subtitle">{pagination.total} total records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Search student name or roll…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
        />
        <select className="filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All Statuses'}</option>
          ))}
        </select>
        <button className="btn btn--primary btn--sm" onClick={applySearch}>Search</button>
      </div>

      <Card variant="default" padding="none">
        {loading ? (
          <div className="table-empty"><div className="spinner" /><p>Loading…</p></div>
        ) : leaves.length === 0 ? (
          <div className="table-empty">
            <p>No leave records found.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Leave ID</th>
                  <th>Student</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave._id}>
                    <td><code className="leave-id">{leave.leaveId}</code></td>
                    <td>
                      <div className="cell-primary">{leave.studentId?.name ?? '—'}</div>
                      <div className="cell-secondary">{leave.studentId?.rollNumber}</div>
                    </td>
                    <td><span className="leave-type-badge">{leave.leaveType}</span></td>
                    <td>{formatDate(leave.fromDate)}</td>
                    <td>{formatDate(leave.toDate)}</td>
                    <td>
                      <span className={`status-badge status-badge--${STATUS_COLORS[leave.status] ?? 'neutral'}`}>
                        {leave.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <button className="btn-action btn-action--view" onClick={() => navigate(`${basePath}/leaves/${leave._id}`)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
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
