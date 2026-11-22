/**
 * Student Hostel Presence Dashboard
 *
 * Monitors student absence from hostels using gate movement records.
 * Shows real-time and historical absence data with role-based access control.
 *
 * Features:
 * - Dashboard summary cards
 * - Hostel-wise statistics
 * - Five tabs: Currently Outside, Overdue, Returned Today, Daily Absence History, Approved Not Exited
 * - Searchable student table with filters
 * - Date picker for historical data
 * - Role-based hostel filtering (Warden sees only their hostels)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { presenceApi, type AbsenceMetrics, type HostelStatistics, type StudentAbsenceData } from '@/services/presence.service';
import { adminApi, type HostelRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import '../student/DashboardPage.css';
import './PresenceDashboardPage.css';

// ─── Types ──────────────────────────────────────────────────────────────────

type TabType = 'currently-outside' | 'overdue' | 'returned-today' | 'daily-absence' | 'approved-not-exited';

interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
  description: string;
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function renderSvgIcon(iconType: string): JSX.Element {
  const iconMap: Record<string, { path: string; viewBox: string }> = {
    currently_outside: {
      viewBox: '0 0 24 24',
      path: 'M17 10.5V7a1 1 0 00-1-1H5a2 2 0 00-2 2v6a2 2 0 002 2h6m4-6.5h2.5A1.5 1.5 0 0121 9v3m0 6a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    overdue: {
      viewBox: '0 0 24 24',
      path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    returned: {
      viewBox: '0 0 24 24',
      path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    history: {
      viewBox: '0 0 24 24',
      path: 'M12 8v4l3 3M9 20H5a2 2 0 01-2-2V6a2 2 0 012-2h4m6 0h4a2 2 0 012 2v8m-6-12v4',
    },
    approved: {
      viewBox: '0 0 24 24',
      path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    users: {
      viewBox: '0 0 24 24',
      path: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    },
    calendar: {
      viewBox: '0 0 24 24',
      path: 'M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    document: {
      viewBox: '0 0 24 24',
      path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
  };

  const icon = iconMap[iconType] || iconMap.users;

  return (
    <svg width="20" height="20" viewBox={icon.viewBox} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={icon.path} />
    </svg>
  );
}

function formatDate(date: string | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(date: string | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'in_hostel':
      return 'status--success';
    case 'out_of_hostel':
      return 'status--warning';
    case 'overdue':
      return 'status--danger';
    default:
      return 'status--neutral';
  }
}

function getStatusLabel(status: string): string {
  switch (status?.toLowerCase()) {
    case 'in_hostel':
      return 'Inside';
    case 'out_of_hostel':
      return 'Outside';
    default:
      return status || 'Unknown';
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PresenceDashboardPage() {
  const { user } = useAuth();

  // State
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [selectedHostel, setSelectedHostel] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('currently-outside');

  // Data
  const [hostels, setHostels] = useState<HostelRecord[]>([]);
  const [metrics, setMetrics] = useState<AbsenceMetrics | null>(null);
  const [hostelStats, setHostelStats] = useState<HostelStatistics[]>([]);
  const [currentTabData, setCurrentTabData] = useState<StudentAbsenceData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');

  // Loading
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingHostels, setLoadingHostels] = useState(false);
  const [loadingTabData, setLoadingTabData] = useState(false);
  const [error, setError] = useState('');

  const TAB_CONFIG: Record<TabType, TabConfig> = {
    'currently-outside': {
      id: 'currently-outside',
      label: 'Currently Outside',
      icon: 'currently_outside',
      description: 'Students without a recorded return movement',
    },
    overdue: {
      id: 'overdue',
      label: 'Overdue Students',
      icon: 'overdue',
      description: 'Students past their expected return time',
    },
    'returned-today': {
      id: 'returned-today',
      label: 'Returned Today',
      icon: 'returned',
      description: 'Students who exited and returned on this date',
    },
    'daily-absence': {
      id: 'daily-absence',
      label: 'Daily Absence History',
      icon: 'history',
      description: 'All students absent at any point during this date',
    },
    'approved-not-exited': {
      id: 'approved-not-exited',
      label: 'Approved Not Exited',
      icon: 'approved',
      description: 'Students with approved leave but no recorded exit',
    },
  };

  // Load available hostels based on user role
  useEffect(() => {
    const loadHostels = async () => {
      setLoadingHostels(true);
      try {
        const res = await adminApi.getHostels({ limit: 100 });
        setHostels(res.data);
        // Auto-select first hostel if available and user is warden
        if (res.data.length > 0 && user?.role === 'warden' && !selectedHostel) {
          setSelectedHostel(res.data[0]._id);
        }
      } catch (err) {
        setError('Failed to load hostels');
      } finally {
        setLoadingHostels(false);
      }
    };
    loadHostels();
  }, [user?.role, selectedHostel]);

  // Load dashboard metrics
  useEffect(() => {
    const loadMetrics = async () => {
      setLoadingMetrics(true);
      try {
        const data = await presenceApi.getDashboardOverview(
          selectedDate,
          selectedHostel || undefined,
        );
        setMetrics(data);
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load metrics');
        setMetrics(null);
      } finally {
        setLoadingMetrics(false);
      }
    };
    loadMetrics();
  }, [selectedDate, selectedHostel]);

  // Load hostel statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await presenceApi.getHostelStatistics(
          selectedDate,
          selectedHostel || undefined,
        );
        setHostelStats(data);
      } catch (err) {
        // Silent failure for stats
      }
    };
    loadStats();
  }, [selectedDate, selectedHostel]);

  // Load tab data
  const loadTabData = useCallback(
    async (page: number = 1, search: string = '') => {
      setLoadingTabData(true);
      try {
        let result;
        const pageSize = 20;

        switch (activeTab) {
          case 'currently-outside':
            result = await presenceApi.getCurrentlyOutside(
              selectedHostel || undefined,
              page,
              pageSize,
              search || undefined,
            );
            break;
          case 'overdue':
            result = await presenceApi.getOverdueStudents(
              selectedHostel || undefined,
              page,
              pageSize,
              search || undefined,
            );
            break;
          case 'returned-today':
            result = await presenceApi.getReturnedToday(
              selectedDate,
              selectedHostel || undefined,
              page,
              pageSize,
              search || undefined,
            );
            break;
          case 'daily-absence':
            result = await presenceApi.getDailyAbsenceHistory(
              selectedDate,
              selectedHostel || undefined,
              page,
              pageSize,
              search || undefined,
            );
            break;
          case 'approved-not-exited':
            result = await presenceApi.getApprovedNotExited(
              selectedDate,
              selectedHostel || undefined,
              page,
              pageSize,
              search || undefined,
            );
            break;
          default:
            return;
        }

        setCurrentTabData(result.data);
        setCurrentPage(result.meta.page);
        setTotalPages(result.meta.totalPages);
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load data');
        setCurrentTabData([]);
      } finally {
        setLoadingTabData(false);
      }
    },
    [activeTab, selectedDate, selectedHostel],
  );

  useEffect(() => {
    setCurrentPage(1);
    loadTabData(1, searchInput);
  }, [activeTab, selectedDate, selectedHostel, loadTabData]);

  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    loadTabData(1, searchInput);
  }, [searchInput, loadTabData]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      loadTabData(currentPage - 1, searchInput);
    }
  }, [currentPage, searchInput, loadTabData]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      loadTabData(currentPage + 1, searchInput);
    }
  }, [currentPage, totalPages, searchInput, loadTabData]);

  // Rendered content
  const metricCards = useMemo(
    () => [
      {
        label: 'Total Registered',
        value: metrics?.totalRegisteredStudents ?? 0,
        icon: 'users',
        color: 'primary',
      },
      {
        label: 'Currently Outside',
        value: metrics?.currentlyOutside ?? 0,
        icon: 'currently_outside',
        color: 'warning',
      },
      {
        label: 'Returned Today',
        value: metrics?.returnedToday ?? 0,
        icon: 'returned',
        color: 'success',
      },
      {
        label: 'Overdue',
        value: metrics?.overdueStudents ?? 0,
        icon: 'overdue',
        color: 'danger',
      },
      {
        label: 'Absent (Any Time)',
        value: metrics?.absentAtAnyPoint ?? 0,
        icon: 'history',
        color: 'primary',
      },
      {
        label: 'Approved Not Exited',
        value: metrics?.approvedButNotExited ?? 0,
        icon: 'document',
        color: 'neutral',
      },
    ],
    [metrics],
  );

  return (
    <div className="presence-page animate-fade-in-up">
      {/* Header */}
      {/* Header with Controls */}
      <div className="presence-page__header-section">
        <div className="presence-page__header">
          <div>
            <h1 className="presence-page__title">Student Hostel Presence</h1>
            <p className="presence-page__subtitle">
              Monitor student absence and gate movements
            </p>
          </div>
        </div>

        {/* Controls - Inline with Header */}
        <div className="presence-page__controls">
          <div className="presence-page__control-group">
            <label>Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input input--sm"
            />
          </div>

          {hostels.length > 0 && (
            <div className="presence-page__control-group">
              <label>Filter by Hostel:</label>
              <select
                value={selectedHostel}
                onChange={(e) => setSelectedHostel(e.target.value)}
                className="input input--sm"
              >
                <option value="">All Hostels</option>
                {hostels.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="presence-page__error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="presence-page__metrics-grid">
        {metricCards.map((card) => (
          <Card key={card.label} variant="default" padding="md" hoverable>
            <div className="metric-card">
              <div className="metric-card__icon">{renderSvgIcon(card.icon)}</div>
              <div className="metric-card__content">
                <div className="metric-card__value">{loadingMetrics ? '…' : card.value}</div>
                <div className="metric-card__label">{card.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Hostel Statistics */}
      {hostelStats.length > 0 && (
        <div className="presence-page__hostel-stats">
          <h2>Hostel-Wise Statistics</h2>
          <div className="presence-page__hostel-grid">
            {hostelStats.map((stat) => (
              <Card key={stat.hostelId} variant="default" padding="md" hoverable>
                <div className="hostel-stat-card">
                  <h3>{stat.hostelName}</h3>
                  <div className="hostel-stat-card__row">
                    <span>Total Students:</span>
                    <strong>{stat.totalAssignedStudents}</strong>
                  </div>
                  <div className="hostel-stat-card__row">
                    <span>Currently Outside:</span>
                    <strong>{stat.currentlyOutside}</strong>
                  </div>
                  <div className="hostel-stat-card__row">
                    <span>Returned Today:</span>
                    <strong>{stat.returnedToday}</strong>
                  </div>
                  <div className="hostel-stat-card__row">
                    <span>Overdue:</span>
                    <strong>{stat.overdueStudents}</strong>
                  </div>
                  <div className="hostel-stat-card__row">
                    <span>Absence Rate:</span>
                    <strong>{stat.absencePercentage.toFixed(1)}%</strong>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="presence-page__tabs-section">
        <div className="presence-page__tabs">
          {Object.values(TAB_CONFIG).map((tab) => (
            <button
              key={tab.id}
              className={`presence-page__tab ${activeTab === tab.id ? 'presence-page__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="presence-page__tab-icon">{renderSvgIcon(tab.icon)}</span>
              <span className="presence-page__tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="presence-page__tab-content">
          <div className="presence-page__tab-header">
            <div>
              <h2>{TAB_CONFIG[activeTab]?.label}</h2>
              <p>{TAB_CONFIG[activeTab]?.description}</p>
            </div>
            <div className="presence-page__search">
              <input
                type="text"
                placeholder="Search by name or roll number…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="input input--md"
              />
              <button onClick={handleSearch} className="btn btn--secondary btn--sm">
                Search
              </button>
            </div>
          </div>

          {/* Student Table */}
          {currentTabData.length > 0 ? (
            <div className="presence-page__table-container">
              <table className="presence-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Roll Number</th>
                    <th>Hostel / Room</th>
                    <th>Exit Time</th>
                    <th>Return Time</th>
                    <th>Expected Return</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTabData.map((student) => (
                    <tr key={student.studentId}>
                      <td>{student.name}</td>
                      <td>{student.rollNumber}</td>
                      <td>
                        {student.hostelName}
                        {student.roomNumber && ` / ${student.roomNumber}`}
                      </td>
                      <td>{formatDateTime(student.actualExitTime)}</td>
                      <td>{formatDateTime(student.actualReturnTime)}</td>
                      <td>{formatDateTime(student.expectedReturnTime)}</td>
                      <td>
                        <span className={`status ${getStatusColor(student.currentPresenceStatus)}`}>
                          {getStatusLabel(student.currentPresenceStatus)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="presence-page__pagination">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage <= 1}
                  className="btn btn--secondary btn--sm"
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="btn btn--secondary btn--sm"
                >
                  Next
                </button>
              </div>
            </div>
          ) : loadingTabData ? (
            <div className="presence-page__empty">Loading…</div>
          ) : (
            <div className="presence-page__empty">No students found in this category.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PresenceDashboardPage;
