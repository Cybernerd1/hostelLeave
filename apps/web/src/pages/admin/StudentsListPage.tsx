/**
 * Admin: Students List Page
 * Also accessible to HOD and Chief Warden (assign-parent only)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, type StudentRecord, type ParentRecord } from '@/services/admin.service';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import '../shared/ApprovalsPage.css';
import './AdminPages.css';

export function StudentsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const { error: showError, success } = useFeedback();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Assign parent modal
  const [assignModal, setAssignModal] = useState<{ studentId: string; studentName: string } | null>(null);
  const [parents, setParents] = useState<ParentRecord[]>([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getStudents({ page, limit: 15, search: search || undefined });
      setStudents(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch {
      showError('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const openAssign = async (studentId: string, studentName: string) => {
    setAssignModal({ studentId, studentName });
    setSelectedParentId('');
    const res = await adminApi.getParents({ limit: 100 });
    setParents(res.data);
  };

  const handleAssign = async () => {
    if (!assignModal || !selectedParentId) return;
    setAssigning(true);
    try {
      await adminApi.assignParentToStudent(assignModal.studentId, selectedParentId);
      success('Parent assigned successfully.');
      await fetchStudents();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showError(e.response?.data?.message || 'Failed to assign parent.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div>
          <h1 className="approvals-page__title">Students</h1>
          <p className="approvals-page__subtitle">{pagination.total} total students</p>
        </div>
      </div>

      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Search by name or roll number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchStudents())}
        />
        <button className="btn btn--primary btn--sm" onClick={() => { setPage(1); fetchStudents(); }}>Search</button>
      </div>


      <Card variant="default" padding="none">
        {loading ? (
          <div className="table-empty"><div className="spinner" /><p>Loading…</p></div>
        ) : students.length === 0 ? (
          <div className="table-empty"><p>No students found.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No.</th>
                  <th>Department</th>
                  <th>Hostel / Room</th>
                  <th>Parent</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div className="cell-primary">{s.name}</div>
                      <div className="cell-secondary">Year {s.year} · {s.semester} Sem</div>
                    </td>
                    <td><code className="leave-id">{s.rollNumber}</code></td>
                    <td>{s.departmentId?.name ?? '—'}</td>
                    <td>
                      <div className="cell-primary">{s.hostelId?.name ?? '—'}</div>
                      <div className="cell-secondary">{s.roomId?.roomNumber ? `Room ${s.roomId.roomNumber}` : ''}</div>
                    </td>
                    <td>
                      {s.parentId ? (
                        <span className="status-badge status-badge--approved">{s.parentId.name}</span>
                      ) : (
                        <span className="status-badge status-badge--pending">Not Assigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-badge--${s.isActive ? 'approved' : 'rejected'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {isAdmin && (
                          <button className="btn-action btn-action--view" onClick={() => navigate(`/admin/students/${s._id}`)}>
                            View
                          </button>
                        )}
                        <button className="btn-action btn-action--approve" onClick={() => openAssign(s._id, s.name)}>
                          Assign Parent
                        </button>
                      </div>
                    </td>
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

      {/* Assign Parent Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Assign Parent</h3>
            <p className="modal__desc">Select a parent for <strong>{assignModal.studentName}</strong></p>
            <select
              className="filter-select"
              style={{ width: '100%', marginBottom: '1rem' }}
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
            >
              <option value="">— Select a parent —</option>
              {parents.map((p) => (
                <option key={p._id} value={p._id}>{p.name} ({p.email})</option>
              ))}
            </select>
            <div className="modal__actions">
              <button className="btn btn--secondary" onClick={() => setAssignModal(null)}>Close</button>
              <button className="btn btn--primary" onClick={handleAssign} disabled={!selectedParentId || assigning}>
                {assigning ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



