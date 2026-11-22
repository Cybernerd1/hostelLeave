import { useEffect, useState } from 'react';
import { adminApi, type StudentRecord } from '@/services/admin.service';
import { leaveApi, type LeaveRequest } from '@/services/leave.service';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import './StudentProfileDrawer.css';

export interface StudentProfileDrawerProps {
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
}

type LeaveHistoryFilter = 'all' | 'approved' | 'pending' | 'rejected' | 'cancelled';

export function StudentProfileDrawer({ studentId, isOpen, onClose }: StudentProfileDrawerProps) {
  const { error: showError } = useFeedback();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<LeaveHistoryFilter>('all');
  const [expandedLeaveId, setExpandedLeaveId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !studentId) return;

    const loadStudentData = async () => {
      setLoading(true);
      try {
        const studentData = await adminApi.getStudentById(studentId);
        setStudent(studentData);

        // Load leave history
        const historyResponse = await fetch(
          `/api/v1/leaves/history/student/${studentId}?page=${currentPage}&limit=10&status=${filter === 'all' ? '' : filter}`,
          { headers: { 'Content-Type': 'application/json' } },
        ).then((r) => r.json());

        if (historyResponse.success) {
          setLeaveHistory(historyResponse.data);
          setTotalPages(historyResponse.pagination?.pages || 1);
        }
      } catch (err) {
        showError('Failed to load student profile');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [isOpen, studentId, currentPage, filter, showError]);

  if (!isOpen) return null;

  const calculateStats = () => {
    const stats = {
      total: leaveHistory.length,
      approved: leaveHistory.filter((l) => l.status === 'approved').length,
      pending: leaveHistory.filter((l) => l.status.startsWith('pending')).length,
      rejected: leaveHistory.filter((l) => l.status === 'rejected').length,
      workingDays: 0,
      calendarDays: 0,
    };

    // Calculate working and calendar days for approved leaves
    leaveHistory.forEach((leave) => {
      if (leave.status === 'approved') {
        const start = new Date(leave.fromDate);
        const end = new Date(leave.toDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        stats.calendarDays += days;
        // Simple weekday counting (doesn't account for holidays)
        let dayCount = 0;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (d.getDay() !== 0 && d.getDay() !== 6) dayCount += 1;
        }
        stats.workingDays += dayCount;
      }
    });

    return stats;
  };

  const stats = calculateStats();
  const statusColor = (status: string) => {
    if (status === 'approved') return '#10b981';
    if (status.startsWith('pending')) return '#f59e0b';
    if (status === 'rejected') return '#ef4444';
    return '#6b7280';
  };

  return (
    <>
      <div className="student-profile-overlay" onClick={onClose} />
      <div className="student-profile-drawer">
        <div className="student-profile-header">
          <h2>Student Profile</h2>
          <button className="student-profile-close" onClick={onClose} aria-label="Close drawer">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="student-profile-loading">Loading student profile...</div>
        ) : student ? (
          <div className="student-profile-content">
            {/* Student Information Section */}
            <section className="student-profile-section">
              <h3>Student Information</h3>
              <div className="student-profile-info">
                <div className="student-profile-row">
                  <span className="student-profile-label">Name</span>
                  <span className="student-profile-value">{student.name}</span>
                </div>
                <div className="student-profile-row">
                  <span className="student-profile-label">Student ID</span>
                  <span className="student-profile-value">{student.rollNumber}</span>
                </div>
                {student.email && (
                  <div className="student-profile-row">
                    <span className="student-profile-label">Email</span>
                    <span className="student-profile-value">{student.email}</span>
                  </div>
                )}
                {student.phone && (
                  <div className="student-profile-row">
                    <span className="student-profile-label">Phone</span>
                    <span className="student-profile-value">{student.phone}</span>
                  </div>
                )}
                {student.departmentId && (
                  <div className="student-profile-row">
                    <span className="student-profile-label">Department</span>
                    <span className="student-profile-value">{student.departmentId.name}</span>
                  </div>
                )}
                {student.courseId && (
                  <div className="student-profile-row">
                    <span className="student-profile-label">Course</span>
                    <span className="student-profile-value">{student.courseId.name}</span>
                  </div>
                )}
                {student.year && (
                  <div className="student-profile-row">
                    <span className="student-profile-label">Year</span>
                    <span className="student-profile-value">Year {student.year}</span>
                  </div>
                )}
                {student.hostelId && (
                  <div className="student-profile-row">
                    <span className="student-profile-label">Hostel</span>
                    <span className="student-profile-value">{student.hostelId.name}</span>
                  </div>
                )}
                {student.roomId && (
                  <div className="student-profile-row">
                    <span className="student-profile-label">Room</span>
                    <span className="student-profile-value">{student.roomId.roomNumber}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Statistics Section */}
            <section className="student-profile-section">
              <h3>Leave Statistics</h3>
              <div className="student-profile-stats">
                <div className="student-profile-stat">
                  <div className="student-profile-stat-label">Total Applications</div>
                  <div className="student-profile-stat-value">{stats.total}</div>
                </div>
                <div className="student-profile-stat">
                  <div className="student-profile-stat-label">Approved</div>
                  <div className="student-profile-stat-value" style={{ color: '#10b981' }}>
                    {stats.approved}
                  </div>
                </div>
                <div className="student-profile-stat">
                  <div className="student-profile-stat-label">Pending</div>
                  <div className="student-profile-stat-value" style={{ color: '#f59e0b' }}>
                    {stats.pending}
                  </div>
                </div>
                <div className="student-profile-stat">
                  <div className="student-profile-stat-label">Rejected</div>
                  <div className="student-profile-stat-value" style={{ color: '#ef4444' }}>
                    {stats.rejected}
                  </div>
                </div>
                <div className="student-profile-stat">
                  <div className="student-profile-stat-label">Working Days Used</div>
                  <div className="student-profile-stat-value">{stats.workingDays}</div>
                </div>
              </div>
            </section>

            {/* Leave History Section */}
            <section className="student-profile-section">
              <div className="student-profile-history-header">
                <h3>Previous Leave Applications</h3>
                <div className="student-profile-filters">
                  {(['all', 'approved', 'pending', 'rejected', 'cancelled'] as LeaveHistoryFilter[]).map(
                    (f) => (
                      <button
                        key={f}
                        className={`student-profile-filter ${filter === f ? 'active' : ''}`}
                        onClick={() => {
                          setFilter(f);
                          setCurrentPage(1);
                        }}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {leaveHistory.length === 0 ? (
                <div className="student-profile-empty">No leave applications found.</div>
              ) : (
                <>
                  <div className="student-profile-leave-list">
                    {leaveHistory.map((leave) => (
                      <div
                        key={leave._id}
                        className="student-profile-leave-item"
                        onClick={() => setExpandedLeaveId(expandedLeaveId === leave._id ? null : leave._id)}
                      >
                        <div className="student-profile-leave-row">
                          <div className="student-profile-leave-info">
                            <div className="student-profile-leave-type">{leave.leaveType}</div>
                            <div className="student-profile-leave-dates">
                              {new Date(leave.fromDate).toLocaleDateString('en-IN')} –{' '}
                              {new Date(leave.toDate).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                          <div
                            className="student-profile-leave-status"
                            style={{ backgroundColor: statusColor(leave.status) }}
                          >
                            {leave.status.replace(/_/g, ' ')}
                          </div>
                        </div>

                        {expandedLeaveId === leave._id && (
                          <div className="student-profile-leave-details">
                            <div className="student-profile-leave-detail">
                              <span>Application ID:</span>
                              <span>{leave.leaveId}</span>
                            </div>
                            <div className="student-profile-leave-detail">
                              <span>Destination:</span>
                              <span>{leave.destination || '—'}</span>
                            </div>
                            <div className="student-profile-leave-detail">
                              <span>Reason:</span>
                              <span>{leave.reason}</span>
                            </div>
                            <div className="student-profile-leave-detail">
                              <span>Submitted:</span>
                              <span>
                                {new Date(leave.createdAt).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            {leave.exitTime && (
                              <div className="student-profile-leave-detail">
                                <span>Exit Time:</span>
                                <span>{new Date(leave.exitTime).toLocaleTimeString('en-IN')}</span>
                              </div>
                            )}
                            {leave.entryTime && (
                              <div className="student-profile-leave-detail">
                                <span>Entry Time:</span>
                                <span>{new Date(leave.entryTime).toLocaleTimeString('en-IN')}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="student-profile-pagination">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        ← Prev
                      </button>
                      <span>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        ) : (
          <div className="student-profile-error">Failed to load student profile</div>
        )}
      </div>
    </>
  );
}
