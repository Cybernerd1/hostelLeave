/**
 * Admin: Parents List Page
 * Also shows assign-student capability
 */

import { useState, useEffect, useCallback } from 'react';
import { adminApi, type ParentRecord, type StudentRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import '../shared/ApprovalsPage.css';

export function ParentsListPage() {
  const [parents, setParents] = useState<ParentRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Assign student modal
  const [assignModal, setAssignModal] = useState<{ parentId: string; parentName: string } | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  const fetchParents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getParents({ page, limit: 15, search: search || undefined });
      setParents(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch {
      setParents([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchParents(); }, [fetchParents]);

  const openAssign = async (parentId: string, parentName: string) => {
    setAssignModal({ parentId, parentName });
    setSelectedStudentId('');
    setAssignMsg(null);
    const res = await adminApi.getStudents({ limit: 100 });
    setStudents(res.data.filter((s) => !s.parentId));
  };

  const handleAssign = async () => {
    if (!assignModal || !selectedStudentId) return;
    setAssigning(true);
    setAssignMsg(null);
    try {
      await adminApi.assignParentToStudent(selectedStudentId, assignModal.parentId);
      setAssignMsg('✅ Parent assigned to student successfully!');
      await fetchParents();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setAssignMsg('❌ ' + (e.response?.data?.message || 'Failed.'));
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div>
          <h1 className="approvals-page__title">Parents</h1>
          <p className="approvals-page__subtitle">{pagination.total} total parents</p>
        </div>
      </div>

      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchParents())}
        />
        <button className="btn btn--primary btn--sm" onClick={() => { setPage(1); fetchParents(); }}>Search</button>
      </div>

      <Card variant="default" padding="none">
        {loading ? (
          <div className="table-empty"><div className="spinner" /><p>Loading…</p></div>
        ) : parents.length === 0 ? (
          <div className="table-empty"><p>No parents found.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Relation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parents.map((p) => (
                  <tr key={p._id}>
                    <td><div className="cell-primary">{p.name}</div></td>
                    <td>{p.email}</td>
                    <td>{p.phone}</td>
                    <td>{p.relation}</td>
                    <td>
                      <span className={`status-badge status-badge--${p.isActive ? 'approved' : 'rejected'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-action btn-action--approve" onClick={() => openAssign(p._id, p.name)}>
                        Assign Student
                      </button>
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

      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Assign Student to Parent</h3>
            <p className="modal__desc">
              Select a student (without parent) to link to <strong>{assignModal.parentName}</strong>
            </p>
            <select
              className="filter-select"
              style={{ width: '100%', marginBottom: '1rem' }}
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">— Select a student —</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({s.rollNumber})</option>
              ))}
            </select>
            {students.length === 0 && !assignMsg && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-neutral-500)', marginBottom: '0.75rem' }}>
                All students already have parents assigned.
              </p>
            )}
            {assignMsg && (
              <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: assignMsg.startsWith('✅') ? '#15803d' : '#dc2626' }}>
                {assignMsg}
              </p>
            )}
            <div className="modal__actions">
              <button className="btn btn--secondary" onClick={() => setAssignModal(null)}>Close</button>
              <button className="btn btn--primary" onClick={handleAssign} disabled={!selectedStudentId || assigning}>
                {assigning ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
