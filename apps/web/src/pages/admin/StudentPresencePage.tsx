/**
 * Student Hostel Presence & Absence Monitoring Dashboard
 *
 * Displays real-time and historical absence monitoring with:
 * - Date picker for historical analysis
 * - Summary metrics (total, outside, returned, overdue, etc.)
 * - Hostel-wise statistics
 * - Tabbed student records (Currently Outside, Overdue, Returned Today, etc.)
 * - Searchable and filterable student table
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { absenceService, type AbsenceDashboardData, type HostelAbsenceStatistics } from '@/services/absence.service';
import { absenceExportService } from '@/services/absenceExport.service';
import './StudentPresencePage.css';

type TabType = 'currently_outside' | 'overdue' | 'returned_today' | 'daily_absent' | 'approved_not_exited';

export function StudentPresencePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showToast } = useFeedback();

  // State
  const [selectedDate, setSelectedDate] = useState(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return dateParam;
    }
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [selectedHostel, setSelectedHostel] = useState(searchParams.get('hostel') || '');
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'currently_outside');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [limit, setLimit] = useState(20);
  const [searchText, setSearchText] = useState('');

  const [dashboardData, setDashboardData] = useState<AbsenceDashboardData | null>(null);
  const [hostels, setHostels] = useState<HostelAbsenceStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await absenceService.getDashboard({
          date: selectedDate,
          page,
          limit,
          hostelId: selectedHostel || undefined,
          tab: activeTab,
          search: searchText || undefined,
        });
        setDashboardData(data);
        setHostels(data.hostelStats);
      } catch (err: any) {
        const message = err.response?.data?.message || 'Failed to load absence monitoring data';
        showError(message);
        console.error('Error fetching dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, selectedHostel, activeTab, page, limit, searchText, showError]);

  // Update URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('date', selectedDate);
    if (selectedHostel) params.set('hostel', selectedHostel);
    params.set('tab', activeTab);
    params.set('page', page.toString());
    setSearchParams(params);
  }, [selectedDate, selectedHostel, activeTab, page, setSearchParams]);

  // Export handlers
  const handleExportStudents = async () => {
    if (!dashboardData?.studentRecords[activeTab]?.length) {
      showError('No students to export');
      return;
    }

    try {
      setIsExporting(true);
      await absenceExportService.exportStudentRecords(
        dashboardData.studentRecords[activeTab],
        {
          date: selectedDate,
          hostelName: hostels.find(h => h.hostelId === selectedHostel)?.hostelName,
          tabName: activeTab,
        },
      );
      showToast('Report exported successfully!');
    } catch (err) {
      console.error('Export failed:', err);
      showError('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportComplete = async () => {
    if (!dashboardData) {
      showError('No data to export');
      return;
    }

    try {
      setIsExporting(true);
      await absenceExportService.exportCompleteReport(
        dashboardData.studentRecords[activeTab] || [],
        dashboardData.metrics,
        dashboardData.hostelStats,
        {
          date: selectedDate,
          hostelName: hostels.find(h => h.hostelId === selectedHostel)?.hostelName,
          tabName: activeTab,
          includeMetrics: true,
          includeHostelStats: true,
        },
      );
      showToast('Complete report exported successfully!');
    } catch (err) {
      console.error('Export failed:', err);
      showError('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!dashboardData?.studentRecords[activeTab]?.length) {
      showError('No students to copy');
      return;
    }

    try {
      await absenceExportService.copyToClipboard(dashboardData.studentRecords[activeTab]);
      showToast('Data copied to clipboard! Paste in Excel or similar app.');
    } catch (err) {
      console.error('Copy failed:', err);
      showError('Failed to copy to clipboard');
    }
  };

  if (isLoading && !dashboardData) {
    return (
      <div className="sp-loading">
        <LoadingSpinner />
        <p>Loading absence monitoring data...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="sp-error">
        <p>Failed to load dashboard</p>
      </div>
    );
  }

  // Get current tab data
  const currentTabData = dashboardData.studentRecords[activeTab] || [];
  const paginationInfo = dashboardData.pagination;

  return (
    <div className="sp-container">
      {/* Header */}
      <div className="sp-header">
        <div className="sp-header__content">
          <h1 className="sp-header__title">
            <svg className="sp-header__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 110 8 4 4 0 010-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            Student Hostel Presence
          </h1>
          <p className="sp-header__subtitle">Check who is outside the hostel on any date</p>
        </div>
      </div>

      {/* Controls */}
      <div className="sp-controls">
        <div className="sp-controls__group">
          <label htmlFor="date-picker" className="sp-label">Select Date</label>
          <input
            id="date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPage(1);
            }}
            className="sp-date-picker"
          />
        </div>

        {hostels.length > 0 && (
          <div className="sp-controls__group">
            <label htmlFor="hostel-filter" className="sp-label">Filter by Hostel</label>
            <select
              id="hostel-filter"
              value={selectedHostel}
              onChange={(e) => {
                setSelectedHostel(e.target.value);
                setPage(1);
              }}
              className="sp-select"
            >
              <option value="">All Hostels</option>
              {hostels.map((hostel) => (
                <option key={hostel.hostelId} value={hostel.hostelId}>
                  {hostel.hostelName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="sp-cards">
        <div className="sp-card sp-card--blue">
          <div className="sp-card__icon">👥</div>
          <div className="sp-card__content">
            <div className="sp-card__label">Total Students</div>
            <div className="sp-card__value">{dashboardData.metrics.totalRegisteredStudents}</div>
          </div>
        </div>

        <div className="sp-card sp-card--amber">
          <div className="sp-card__icon">🚶</div>
          <div className="sp-card__content">
            <div className="sp-card__label">Currently Outside</div>
            <div className="sp-card__value">{dashboardData.metrics.currentlyOutside}</div>
          </div>
        </div>

        <div className="sp-card sp-card--green">
          <div className="sp-card__icon">✓</div>
          <div className="sp-card__content">
            <div className="sp-card__label">Returned Today</div>
            <div className="sp-card__value">{dashboardData.metrics.returnedToday}</div>
          </div>
        </div>

        <div className="sp-card sp-card--red">
          <div className="sp-card__icon">⚠️</div>
          <div className="sp-card__content">
            <div className="sp-card__label">Overdue Returns</div>
            <div className="sp-card__value">{dashboardData.metrics.overdueReturns}</div>
          </div>
        </div>

        <div className="sp-card sp-card--orange">
          <div className="sp-card__icon">📊</div>
          <div className="sp-card__content">
            <div className="sp-card__label">Daily Absent</div>
            <div className="sp-card__value">{dashboardData.metrics.dailyAbsentAtAnyPoint}</div>
          </div>
        </div>

        <div className="sp-card sp-card--gray">
          <div className="sp-card__icon">📋</div>
          <div className="sp-card__content">
            <div className="sp-card__label">Approved, Not Exited</div>
            <div className="sp-card__value">{dashboardData.metrics.approvedLeaveNotExited}</div>
          </div>
        </div>
      </div>

      {/* Hostel Statistics */}
      {hostels.length > 0 && (
        <div className="sp-section">
          <h2 className="sp-section__title">Absence by Hostel</h2>
          <div className="sp-hostel-stats">
            {hostels.map((hostel) => (
              <div
                key={hostel.hostelId}
                className={`sp-hostel-card ${selectedHostel === hostel.hostelId ? 'sp-hostel-card--active' : ''}`}
                onClick={() => {
                  setSelectedHostel(hostel.hostelId);
                  setPage(1);
                }}
              >
                <div className="sp-hostel-card__header">
                  <h3 className="sp-hostel-card__name">{hostel.hostelName}</h3>
                  <span className="sp-hostel-card__percentage">{hostel.absencePercentage}%</span>
                </div>
                <div className="sp-hostel-card__stats">
                  <div className="sp-hostel-card__stat">
                    <span className="sp-hostel-card__stat-label">Assigned</span>
                    <span className="sp-hostel-card__stat-value">{hostel.totalAssignedStudents}</span>
                  </div>
                  <div className="sp-hostel-card__stat">
                    <span className="sp-hostel-card__stat-label">Outside</span>
                    <span className="sp-hostel-card__stat-value">{hostel.currentlyOutside}</span>
                  </div>
                  <div className="sp-hostel-card__stat">
                    <span className="sp-hostel-card__stat-label">Returned</span>
                    <span className="sp-hostel-card__stat-value">{hostel.returnedToday}</span>
                  </div>
                  <div className="sp-hostel-card__stat">
                    <span className="sp-hostel-card__stat-label">Overdue</span>
                    <span className="sp-hostel-card__stat-value">{hostel.overdueStudents}</span>
                  </div>
                </div>
                <div className="sp-hostel-card__bar">
                  <div
                    className="sp-hostel-card__bar-fill"
                    style={{ width: `${hostel.absencePercentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Records Tabs */}
      <div className="sp-section">
        <h2 className="sp-section__title">Student Records</h2>

        {/* Tab Navigation */}
        <div className="sp-tabs">
          <button
            className={`sp-tab ${activeTab === 'currently_outside' ? 'sp-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('currently_outside');
              setPage(1);
            }}
          >
            Currently Outside ({dashboardData.metrics.currentlyOutside})
          </button>
          <button
            className={`sp-tab ${activeTab === 'overdue' ? 'sp-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('overdue');
              setPage(1);
            }}
          >
            Overdue ({dashboardData.metrics.overdueReturns})
          </button>
          <button
            className={`sp-tab ${activeTab === 'returned_today' ? 'sp-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('returned_today');
              setPage(1);
            }}
          >
            Returned Today ({dashboardData.metrics.returnedToday})
          </button>
          <button
            className={`sp-tab ${activeTab === 'daily_absent' ? 'sp-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('daily_absent');
              setPage(1);
            }}
          >
            Daily Absent ({dashboardData.metrics.dailyAbsentAtAnyPoint})
          </button>
          <button
            className={`sp-tab ${activeTab === 'approved_not_exited' ? 'sp-tab--active' : ''}`}
            onClick={() => {
              setActiveTab('approved_not_exited');
              setPage(1);
            }}
          >
            Approved, Not Exited ({dashboardData.metrics.approvedLeaveNotExited})
          </button>
        </div>

        {/* Search */}
        <div className="sp-search">
          <Input
            type="text"
            placeholder="Search by name or roll number..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Export Buttons */}
        {!isLoading && currentTabData.length > 0 && (
          <div className="sp-export-controls">
            <div className="sp-export-controls__group">
              <span className="sp-export-label">Export Data:</span>
              <Button
                variant="primary"
                size="sm"
                disabled={isExporting}
                onClick={handleExportStudents}
                className="sp-export-button"
              >
                {isExporting ? 'Exporting...' : '📥 Export Current View'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isExporting}
                onClick={handleExportComplete}
                className="sp-export-button"
              >
                {isExporting ? 'Exporting...' : '📊 Export Full Report'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isExporting}
                onClick={handleCopyToClipboard}
                className="sp-export-button"
              >
                {isExporting ? 'Copying...' : '📋 Copy to Clipboard'}
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="sp-loading-mini">
            <LoadingSpinner />
          </div>
        ) : currentTabData.length === 0 ? (
          <div className="sp-empty">
            <p>No students found for this category on {selectedDate}</p>
          </div>
        ) : (
          <>
            <div className="sp-table-wrapper">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Roll No.</th>
                    <th>Hostel</th>
                    <th>Room</th>
                    <th>Exit Time</th>
                    <th>Expected Return</th>
                    <th>Return Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTabData.map((student) => (
                    <tr key={student._id}>
                      <td className="sp-table__name">{student.name}</td>
                      <td>{student.rollNumber}</td>
                      <td>{student.hostelName || '-'}</td>
                      <td>{student.roomNumber || '-'}</td>
                      <td>{student.exitTimestamp ? new Date(student.exitTimestamp).toLocaleString() : '-'}</td>
                      <td>{student.expectedReturnTimestamp ? new Date(student.expectedReturnTimestamp).toLocaleString() : '-'}</td>
                      <td>{student.returnTimestamp ? new Date(student.returnTimestamp).toLocaleString() : '-'}</td>
                      <td>
                        <span className={`sp-status sp-status--${student.presenceStatus}`}>
                          {student.presenceStatus === 'in_hostel' && 'In Hostel'}
                          {student.presenceStatus === 'out_of_hostel' && 'Outside'}
                          {student.presenceStatus === 'overdue' && `Overdue (${student.overdueDuration})`}
                          {student.presenceStatus === 'approved_not_exited' && 'Approved, Not Exited'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {paginationInfo.totalPages > 1 && (
              <div className="sp-pagination">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="sp-pagination__button"
                >
                  Previous
                </button>
                <span className="sp-pagination__info">
                  Page {page} of {paginationInfo.totalPages} ({paginationInfo.total} total)
                </span>
                <button
                  onClick={() => setPage(Math.min(paginationInfo.totalPages, page + 1))}
                  disabled={page === paginationInfo.totalPages}
                  className="sp-pagination__button"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
