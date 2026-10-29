/**
 * Admin Dashboard — with live stats
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi, type DashboardStats } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import '../student/DashboardPage.css';

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboardStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const v = (key: keyof DashboardStats) => loading ? '…' : stats ? String(stats[key]) : '—';

  const cards = [
    { label: 'Total Students', value: v('totalStudents'), color: 'primary', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', link: '/admin/students' },
    { label: 'Total Parents',  value: v('totalParents'),  color: 'info',    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', link: '/admin/parents' },
    { label: 'Total Departments',   value: v('totalDepartments'),   color: 'neutral', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', link: '/admin/departments' },
    { label: 'Total Hostels', value: v('totalHostels'), color: 
'warning', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', link: '/admin/hostels' },
    { label: 'Total Rooms', value: v('totalRooms'), color: 'success', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4', link: '/admin/rooms' },
    { label: 'Bed Capacity', value: v('totalBedCapacity'), color: 'info', icon: 'M4 12h16M5 12V7a2 2 0 012-2h10a2 2 0 012 2v5M4 19v-7h16v7', link: '/admin/hostels' },
    { label: 'Occupied Seats', value: v('occupiedSeats'), color: 'warning', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0', link: '/admin/hostels' },
    { label: 'Available Seats', value: v('availableSeats'), color: 'success', icon: 'M5 13l4 4L19 7', link: '/admin/hostels' },
    { label: 'Full Rooms', value: v('fullyOccupiedRooms'), color: 'neutral', icon: 'M6 6h12v12H6z', link: '/admin/rooms' },
    { label: 'Awaiting Allocation', value: v('studentsAwaitingAllocation'), color: 'warning', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0', link: '/admin/applications' },
    { label: 'Pending Applications', value: v('pendingApplications'), color: 'warning', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', link: '/admin/applications' },
    { label: 'Total Applications', value: v('totalApplications'), color: 'info', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', link: '/admin/applications' },
  ];
  const quickLinks = [
    { label: 'Students', path: '/admin/students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1' },
    { label: 'Parents',  path: '/admin/parents',  icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2' },
    { label: 'Hostels',  path: '/admin/hostels',  icon: 'M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z' },
    { label: 'Audit Log',path: '/admin/audit-logs',icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  ];

  return (
    <div className="dashboard-page animate-fade-in-up">
      <div className="dashboard-page__header">
        <div>
          <h1 className="dashboard-page__greeting">
            Welcome, {user?.name?.split(' ')[0] || 'Admin'}! 👋
          </h1>
          <p className="dashboard-page__subtitle">System overview and management controls</p>
        </div>
      </div>

      <div className="dashboard-page__stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {cards.map((c) => (
          <Card key={c.label} variant="default" padding="md" hoverable onClick={() => navigate(c.link)}>
            <div className="stat-card" style={{ cursor: 'pointer' }}>
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

      {/* Quick links */}
      <Card variant="default" padding="md">
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-neutral-700)' }}>
          Quick Access
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {quickLinks.map((q) => (
            <button
              key={q.label}
              onClick={() => navigate(q.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem 1rem', borderRadius: 10,
                border: '1.5px solid var(--color-neutral-200)',
                background: 'white', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 600,
                color: 'var(--color-neutral-700)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary-400)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-600)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-neutral-200)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-neutral-700)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={q.icon} />
              </svg>
              {q.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}



