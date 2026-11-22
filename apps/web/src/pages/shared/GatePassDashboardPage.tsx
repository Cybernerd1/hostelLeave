/**
 * Gate Pass Dashboard / History
 *
 * Shared by Warden, Chief Warden, Admin and Guard. Shows live summary counts
 * and a filterable, paginated history of gate passes. All scoping (hostel,
 * student, parent) is enforced by the API.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import { Card } from '@/components/ui/Card';
import { gatePassApi, type GatePass, type GatePassDashboard } from '@/services/gatePass.service';
import { getRoleConfig } from '@/utils/roleConfig';
import './ApprovalsPage.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'approved', label: 'Approved · not exited' },
  { value: 'out_of_hostel', label: 'Out of hostel' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'returned', label: 'Returned' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_META: Record<string, { label: string; badge: string }> = {
  approved: { label: 'Approved', badge: 'info' },
  out_of_hostel: { label: 'Out of Hostel', badge: 'pending' },
  overdue: { label: 'Overdue', badge: 'rejected' },
  returned: { label: 'Returned', badge: 'approved' },
  cancelled: { label: 'Cancelled', badge: 'neutral' },
};

function effective(pass: GatePass) {
  return pass.effectiveStatus ?? pass.status;
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function studentOf(pass: GatePass) {
  return typeof pass.studentId === 'object' ? pass.studentId : null;
}

function leaveOf(pass: GatePass) {
  return typeof pass.leaveRequestId === 'object' ? pass.leaveRequestId : null;
}

export function GatePassDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { error: showError } = useFeedback();

  const role = user?.role || '';
  const basePath = user ? getRoleConfig(user.role).basePath : '';
  const canOpenLeave = ['admin', 'chief_warden', 'warden', 'student', 'parent'].includes(role);

  const [dashboard, setDashboard] = useState<GatePassDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await gatePassApi.getHistory({
        page,
        limit: 15,
        status: status || undefined,
        search: search.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setDashboard(result);
    } catch {
      showError('Failed to load gate passes.');
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [page, status, search, fromDate, toDate, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = () => {
    setPage(1);
    load();
  };

  const summary = dashboard?.summary;
  const passes = dashboard?.data ?? [];
  const pagination = dashboard?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div>
          <h1 className="approvals-page__title">Gate Pass Dashboard</h1>
          <p className="approvals-page__subtitle">
            Live student movements and gate pass history
          </p>
        </div>
        <button className="btn btn--secondary btn--sm" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        {[
          { label: 'Total Passes', value: summary?.total, tone: '#4f46e5' },
          { label: 'Not Yet Exited', value: summary?.approved, tone: '#1d4ed8' },
          { label: 'Out of Hostel', value: summary?.out_of_hostel, tone: '#b45309' },
          { label: 'Overdue', value: summary?.overdue, tone: '#b91c1c' },
          { label: 'Returned', value: summary?.returned, tone: '#047857' },
          { label: 'Exits Today', value: summary?.expected_exits_today, tone: '#7c3aed' },
          { label: 'Returns Due Today', value: summary?.expected_returns_today, tone: '#0891b2' },
        ].map((card) => (
          <Card key={card.label} variant="default" padding="md">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: card.tone }}>
                {loading && card.value === undefined ? '…' : card.value ?? 0}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-neutral-500)' }}>
                {card.label}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="filters-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <input
          className="filter-input"
          placeholder="Search pass no., student, roll or leave ID…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && applyFilters()}
        />
        <select
          className="filter-select"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          className="filter-input"
          type="date"
          value={fromDate}
          onChange={(event) => {
            setFromDate(event.target.value);
            setPage(1);
          }}
          title="Departure from"
        />
        <input
          className="filter-input"
          type="date"
          value={toDate}
          onChange={(event) => {
            setToDate(event.target.value);
            setPage(1);
          }}
          title="Departure to"
        />
        <button className="btn btn--primary btn--sm" onClick={applyFilters}>
          Apply
        </button>
      </div>

      <Card variant="default" padding="none">
        {loading ? (
          <div className="table-empty">
            <div className="spinner" />
            <p>Loading gate passes…</p>
          </div>
        ) : passes.length === 0 ? (
          <div className="table-empty">
            <p>No gate passes match these filters.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Gate Pass</th>
                  <th>Student</th>
                  <th>Hostel</th>
                  <th>Leave</th>
                  <th>Departure</th>
                  <th>Expected Return</th>
                  <th>Status</th>
                  <th>Exit / Return</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {passes.map((pass) => {
                  const state = effective(pass);
                  const meta = STATUS_META[state] ?? STATUS_META.approved;
                  const student = studentOf(pass);
                  const leave = leaveOf(pass);
                  const hostel = typeof pass.hostelId === 'object' ? pass.hostelId : null;
                  const isOverdue = state === 'overdue';

                  return (
                    <tr key={pass._id}>
                      <td><code className="leave-id">{pass.gatePassNumber}</code></td>
                      <td>
                        <div className="cell-primary">{student?.name ?? '—'}</div>
                        <div className="cell-secondary">{student?.rollNumber ?? ''}</div>
                      </td>
                      <td>{hostel?.name ?? '—'}</td>
                      <td>
                        <code className="leave-id">{leave?.leaveId ?? '—'}</code>
                        {leave?.status && (
                          <div className="cell-secondary">{leave.status.replace(/_/g, ' ')}</div>
                        )}
                      </td>
                      <td>{formatDate(pass.approvedDeparture)}</td>
                      <td style={isOverdue ? { color: '#b91c1c', fontWeight: 600 } : undefined}>
                        {formatDate(pass.expectedReturn)}
                      </td>
                      <td>
                        <span className={`status-badge status-badge--${meta.badge}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="cell-secondary">
                        <div>↑ {formatDateTime(pass.actualExitTime)}</div>
                        <div>↓ {formatDateTime(pass.actualReturnTime)}</div>
                      </td>
                      <td>
                        {canOpenLeave && leave?._id && (
                          <button
                            className="btn-action btn-action--view"
                            onClick={() => navigate(`${basePath}/leaves/${leave._id}`)}
                          >
                            View
                          </button>
                        )}
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
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              ← Prev
            </button>
            <span className="page-info">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              className="page-btn"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
