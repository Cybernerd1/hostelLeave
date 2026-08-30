/**
 * Shared: Reports Page
 * Used by Warden, Chief Warden, HOD, VC, Admin
 */

import { useState, useEffect } from 'react';
import { leaveApi } from '@/services/leave.service';
import { Card } from '@/components/ui/Card';
import '../student/DashboardPage.css';
import './ApprovalsPage.css';

interface Stats { total: number; pending: number; approved: number; rejected: number; active: number; }

export function ReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leaveApi.getStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: 'Total Leaves',  value: stats.total,    color: 'primary', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { label: 'Pending',       value: stats.pending,  color: 'warning', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Approved',      value: stats.approved, color: 'success', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Rejected',      value: stats.rejected, color: 'danger',  icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Active / Out',  value: stats.active,   color: 'info',    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  ] : [];

  return (
    <div className="dashboard-page animate-fade-in-up">
      <div className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__greeting">Reports & Analytics</h1>
          <p className="dashboard-page__subtitle">Leave statistics overview</p>
        </div>
      </div>

      {loading ? (
        <div className="table-empty"><div className="spinner" /><p>Loading stats…</p></div>
      ) : !stats ? (
        <div className="table-empty"><p>Unable to load statistics.</p></div>
      ) : (
        <>
          <div className="dashboard-page__stats-grid">
            {cards.map((c) => (
              <Card key={c.label} variant="default" padding="md" hoverable>
                <div className="stat-card">
                  <div className={`stat-card__icon stat-card__icon--${c.color}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d={c.icon} />
                    </svg>
                  </div>
                  <div className="stat-card__content">
                    <span className="stat-card__value">{c.value}</span>
                    <span className="stat-card__label">{c.label}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Approval rate bar */}
          <Card variant="default" padding="md">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Approval Rate</h3>
            {stats.total > 0 ? (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-neutral-600)' }}>
                    {Math.round((stats.approved / stats.total) * 100)}% approved of {stats.total} total
                  </span>
                </div>
                <div style={{ height: 12, background: 'var(--color-neutral-100)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(stats.approved / stats.total) * 100}%`,
                    background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                    borderRadius: 999,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#15803d' }}>✓ Approved: {stats.approved}</span>
                  <span style={{ fontSize: '0.8125rem', color: '#dc2626' }}>✗ Rejected: {stats.rejected}</span>
                  <span style={{ fontSize: '0.8125rem', color: '#d97706' }}>⏳ Pending: {stats.pending}</span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--color-neutral-400)', fontSize: '0.875rem' }}>No leave data yet.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
