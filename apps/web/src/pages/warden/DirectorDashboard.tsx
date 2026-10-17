/**
 * Director Dashboard
 *
 * Premium overview for the Director/VC role.
 * Features:
 *  - Live stats (total, pending, approved, completed, rejected)
 *  - Full leave table with search, status filter, leave-type filter, date range
 *  - Pagination
 *  - Click-through to leave detail
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { leaveApi, type LeaveRequest } from '@/services/leave.service';
import { UserRole } from '@/utils/roleConfig';
import './DirectorDashboard.css';

/* ─── Constants ─────────────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: '',                   label: 'All Statuses' },
  { value: 'pending_parent',     label: 'Pending Parent' },
  { value: 'pending_warden',     label: 'Pending Warden' },
  { value: 'pending_chief_warden', label: 'Pending Chief Warden' },
  { value: 'pending_hod',        label: 'Pending HOD' },
  { value: 'approved',           label: 'Approved' },
  { value: 'rejected',           label: 'Rejected' },
  { value: 'completed',          label: 'Completed' },
  { value: 'cancelled',          label: 'Cancelled' },
  { value: 'expired',            label: 'Expired' },
];

const LEAVE_TYPE_OPTIONS = [
  { value: '',           label: 'All Types' },
  { value: 'home_visit', label: 'Home Visit' },
  { value: 'medical',    label: 'Medical' },
  { value: 'emergency',  label: 'Emergency' },
  { value: 'function',   label: 'Function' },
  { value: 'academic',   label: 'Academic' },
  { value: 'personal',   label: 'Personal' },
  { value: 'other',      label: 'Other' },
];

const STATUS_COLORS: Record<string, string> = {
  pending_parent:       '#f59e0b',
  pending_warden:       '#f97316',
  pending_chief_warden: '#f97316',
  pending_hod:          '#f59e0b',
  approved:             '#10b981',
  rejected:             '#ef4444',
  completed:            '#3b82f6',
  cancelled:            '#9ca3af',
  expired:              '#6b7280',
};

const STATUS_BG: Record<string, string> = {
  pending_parent:       '#fef3c7',
  pending_warden:       '#ffedd5',
  pending_chief_warden: '#ffedd5',
  pending_hod:          '#fef3c7',
  approved:             '#d1fae5',
  rejected:             '#fee2e2',
  completed:            '#dbeafe',
  cancelled:            '#f3f4f6',
  expired:              '#f9fafb',
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  home_visit: 'Home Visit',
  medical:    'Medical',
  emergency:  'Emergency',
  function:   'Function',
  academic:   'Academic',
  personal:   'Personal',
  other:      'Other',
};

function fmt(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── Stat Card ─────────────────────────────────────────────────── */
interface StatCardProps {
  value: number | string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  loading?: boolean;
  onClick?: () => void;
}

function StatCard({ value, label, icon, color, bg, loading, onClick }: StatCardProps) {
  return (
    <div className={`dir-stat ${onClick ? 'dir-stat--clickable' : ''}`} onClick={onClick}
      style={{ '--stat-color': color, '--stat-bg': bg } as React.CSSProperties}>
      <div className="dir-stat__icon">{icon}</div>
      <div className="dir-stat__body">
        <span className="dir-stat__value">{loading ? '—' : value}</span>
        <span className="dir-stat__label">{label}</span>
      </div>
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────────── */
export function DirectorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* Stats */
  const [stats, setStats] = useState<Record<string, number>>({});
  const [statsLoading, setStatsLoading] = useState(true);

  /* Leaves table */
  const [leaves, setLeaves]     = useState<LeaveRequest[]>([]);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tableLoading, setTableLoading] = useState(true);

  /* Base path based on user role */
  const basePath = user?.role === UserRole.DIRECTOR ? '/director' : '/vc';

  /* Filters */
  const [search, setSearch]         = useState('');
  const [status, setStatus]         = useState('');
  const [leaveType, setLeaveType]   = useState('');
  const [fromDate, setFromDate]     = useState('');
  const [toDate, setToDate]         = useState('');
  const [page, setPage]             = useState(1);
  const LIMIT = 15;

  /* Load stats */
  useEffect(() => {
    leaveApi.getStats()
      .then(s => setStats(s as unknown as Record<string, number>))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  /* Load leaves */
  const fetchLeaves = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await leaveApi.getAll({
        page,
        limit: LIMIT,
        status: status || undefined,
        search: search || undefined,
        leaveType: leaveType || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setLeaves(res.data ?? []);
      const p = res.pagination as { total?: number; totalPages?: number };
      setTotal(p?.total ?? 0);
      setTotalPages(p?.totalPages ?? 1);
    } catch {
      setLeaves([]);
    } finally {
      setTableLoading(false);
    }
  }, [page, status, search, leaveType, fromDate, toDate]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const applyFilters = () => { setPage(1); fetchLeaves(); };

  const clearFilters = () => {
    setSearch(''); setStatus(''); setLeaveType(''); setFromDate(''); setToDate('');
    setPage(1);
  };

  const hasActiveFilters = !!(search || status || leaveType || fromDate || toDate);

  return (
    <div className="director-dash animate-fade-in-up">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="director-dash__header">
        <div>
          <h1 className="director-dash__title">
            Welcome, {user?.name?.split(' ')[0] || 'Director'} 👋
          </h1>
          <p className="director-dash__subtitle">
            Director's overview — all hostel leave activity across departments
          </p>
        </div>
        <div className="director-dash__header-actions">
          <button className="dir-btn dir-btn--outline" onClick={() => navigate(`${basePath}/reports`)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            Reports
          </button>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="director-dash__stats">
        <StatCard loading={statsLoading} value={stats.total ?? 0}     label="Total Leaves"
          color="#6366f1" bg="#ede9fe"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
          onClick={() => { setStatus(''); setPage(1); }}
        />
        <StatCard loading={statsLoading} value={stats.pending ?? 0}   label="Pending"
          color="#d97706" bg="#fef3c7"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          onClick={() => { setStatus('pending_hod'); setPage(1); }}
        />
        <StatCard loading={statsLoading} value={stats.approved ?? 0}  label="Approved"
          color="#059669" bg="#d1fae5"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          onClick={() => { setStatus('approved'); setPage(1); }}
        />
        <StatCard loading={statsLoading} value={stats.rejected ?? 0}  label="Rejected"
          color="#dc2626" bg="#fee2e2"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
          onClick={() => { setStatus('rejected'); setPage(1); }}
        />
        <StatCard loading={statsLoading} value={stats.active ?? 0}   label="Completed"
          color="#2563eb" bg="#dbeafe"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}
          onClick={() => { setStatus('completed'); setPage(1); }}
        />
      </div>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="director-dash__filters">
        <div className="director-dash__filter-row">
          {/* Search */}
          <div className="dir-search">
            <svg className="dir-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              id="director-search"
              className="dir-search__input"
              type="text"
              placeholder="Search student, roll no…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
            />
          </div>

          {/* Status */}
          <select
            id="director-status-filter"
            className="dir-select"
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Leave Type */}
          <select
            id="director-type-filter"
            className="dir-select"
            value={leaveType}
            onChange={e => { setLeaveType(e.target.value); setPage(1); }}
          >
            {LEAVE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Date range */}
          <div className="dir-date-range">
            <input
              id="director-from-date"
              className="dir-date"
              type="date"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); setPage(1); }}
              placeholder="From"
            />
            <span className="dir-date-sep">→</span>
            <input
              id="director-to-date"
              className="dir-date"
              type="date"
              value={toDate}
              onChange={e => { setToDate(e.target.value); setPage(1); }}
              placeholder="To"
            />
          </div>

          <div className="dir-filter-btns">
            <button id="director-search-btn" className="dir-btn dir-btn--primary" onClick={applyFilters}>
              Search
            </button>
            {hasActiveFilters && (
              <button id="director-clear-btn" className="dir-btn dir-btn--ghost" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="director-dash__active-filters">
            <span className="dir-filter-label">Active filters:</span>
            {search    && <span className="dir-chip">Search: "{search}"</span>}
            {status    && <span className="dir-chip">Status: {STATUS_OPTIONS.find(o => o.value === status)?.label}</span>}
            {leaveType && <span className="dir-chip">Type: {LEAVE_TYPE_OPTIONS.find(o => o.value === leaveType)?.label}</span>}
            {fromDate  && <span className="dir-chip">From: {fmt(fromDate)}</span>}
            {toDate    && <span className="dir-chip">To: {fmt(toDate)}</span>}
          </div>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      <div className="director-dash__table-card">
        <div className="director-dash__table-header">
          <div>
            <h2 className="director-dash__table-title">All Leave Requests</h2>
            <p className="director-dash__table-count">
              {tableLoading ? 'Loading…' : `${total} record${total !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {tableLoading ? (
          <div className="director-dash__table-loading">
            <div className="dir-spinner" />
            <p>Loading leave records…</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="director-dash__empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <h3>No leaves found</h3>
            <p>{hasActiveFilters ? 'Try clearing some filters.' : 'No leave applications have been submitted yet.'}</p>
          </div>
        ) : (
          <div className="director-dash__table-scroll">
            <table className="director-dash__table">
              <thead>
                <tr>
                  <th>Leave ID</th>
                  <th>Student</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(leave => {
                  const sColor = STATUS_COLORS[leave.status] || '#9ca3af';
                  const sBg    = STATUS_BG[leave.status]    || '#f9fafb';
                  return (
                    <tr
                      key={leave._id}
                      className="director-dash__row"
                      onClick={() => navigate(`${basePath}/leaves/${leave._id}`)}
                    >
                      <td>
                        <code className="dir-leave-id">{leave.leaveId}</code>
                      </td>
                      <td>
                        <div className="dir-student-name">{leave.studentId?.name || '—'}</div>
                        <div className="dir-student-roll">{leave.studentId?.rollNumber}</div>
                      </td>
                      <td>
                        <span className="dir-type-badge">
                          {LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType}
                        </span>
                      </td>
                      <td className="dir-date-cell">{fmt(leave.fromDate)}</td>
                      <td className="dir-date-cell">{fmt(leave.toDate)}</td>
                      <td className="dir-dest-cell">{leave.destination}</td>
                      <td>
                        <span
                          className="dir-status-badge"
                          style={{ color: sColor, background: sBg, borderColor: sColor + '44' }}
                        >
                          {leave.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>
                      <td>
                        <button
                          className="dir-view-btn"
                          onClick={e => { e.stopPropagation(); navigate(`${basePath}/leaves/${leave._id}`); }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="director-dash__pagination">
            <button
              className="dir-page-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >← Previous</button>
            <span className="dir-page-info">Page {page} of {totalPages}</span>
            <button
              className="dir-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >Next →</button>
          </div>
        )}
      </div>

    </div>
  );
}
