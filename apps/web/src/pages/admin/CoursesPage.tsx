/** Admin: course management */
import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { adminApi, type CourseRecord, type DepartmentRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import '../shared/ApprovalsPage.css';

const emptyForm = { name: '', code: '', departmentId: '', duration: 4, totalSemesters: 8, description: '' };

export function CoursesPage() {
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCourses({ page, limit: 15, search: search || undefined });
      setCourses(res.data); setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch { setCourses([]); } finally { setLoading(false); }
  }, [page, search]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { adminApi.getDepartments({ page: 1, limit: 100 }).then((res) => setDepartments(res.data)).catch(() => setDepartments([])); }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const saved = editingId ? await adminApi.updateCourse(editingId, form) : await adminApi.createCourse(form);
      setMessage(`Course ${saved.name} ${editingId ? 'updated' : 'created'}.`); setForm(emptyForm); setEditingId(null); setFormOpen(false); await fetchData();
    } catch (err: unknown) { const apiError = err as { response?: { data?: { message?: string } } }; setMessage(apiError.response?.data?.message || 'Unable to save course.'); }
  };
  const remove = async (course: CourseRecord) => {
    if (!window.confirm(`Delete ${course.name}?`)) return;
    try { await adminApi.deleteCourse(course._id); setMessage(`${course.name} deleted.`); await fetchData(); }
    catch (err: unknown) { const apiError = err as { response?: { data?: { message?: string } } }; setMessage(apiError.response?.data?.message || 'Unable to delete course.'); }
  };

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header"><div><h1 className="approvals-page__title">Courses</h1><p className="approvals-page__subtitle">{pagination.total} courses</p></div><button className="btn btn--primary" onClick={() => { setForm(emptyForm); setEditingId(null); setFormOpen(true); }}>+ Add Course</button></div>
      {message && <div className="form-message form-message--success" style={{ marginBottom: '1rem' }}>{message}</div>}
      {formOpen && <Card variant="default" padding="lg"><form onSubmit={save}><h2 style={{ marginTop: 0 }}>{editingId ? 'Edit Course' : 'Add Course'}</h2><div className="filters-row"><input className="filter-input" placeholder="Course name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input className="filter-input" placeholder="Code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /><select className="filter-select" required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><option value="">Select department</option>{departments.filter((d) => d.isActive).map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}</select><input className="filter-input" type="number" min="1" max="8" required value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} placeholder="Duration (years)" /><input className="filter-input" type="number" min="1" max="16" required value={form.totalSemesters} onChange={(e) => setForm({ ...form, totalSemesters: Number(e.target.value) })} placeholder="Total semesters" /></div><button className="btn btn--primary" type="submit">{editingId ? 'Save Changes' : 'Create Course'}</button><button className="btn btn--secondary" type="button" style={{ marginLeft: 8 }} onClick={() => setFormOpen(false)}>Cancel</button></form></Card>}
      <div className="filters-row"><input className="filter-input" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchData())} /><button className="btn btn--primary btn--sm" onClick={() => { setPage(1); fetchData(); }}>Search</button></div>
      <Card variant="default" padding="none">{loading ? <div className="table-empty"><div className="spinner" /></div> : courses.length === 0 ? <div className="table-empty"><p>No courses found.</p></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Name</th><th>Code</th><th>Department</th><th>Duration</th><th>Semesters</th><th>Status</th><th>Actions</th></tr></thead><tbody>{courses.map((course) => <tr key={course._id}><td><div className="cell-primary">{course.name}</div></td><td><code className="leave-id">{course.code}</code></td><td>{(course.departmentId as unknown as { name: string })?.name || '—'}</td><td>{course.duration} yr</td><td>{course.totalSemesters} sem</td><td><span className={`status-badge status-badge--${course.isActive ? 'approved' : 'rejected'}`}>{course.isActive ? 'Active' : 'Inactive'}</span></td><td><button className="btn-action btn-action--view" onClick={() => { setEditingId(course._id); setForm({ name: course.name, code: course.code, departmentId: (course.departmentId as unknown as { _id: string })?._id || '', duration: course.duration, totalSemesters: course.totalSemesters, description: '' }); setFormOpen(true); }}>Edit</button><button className="btn-action btn-action--view" style={{ marginLeft: 6 }} onClick={async () => { try { await adminApi.updateCourse(course._id, { isActive: !course.isActive }); await fetchData(); } catch (err: unknown) { const apiError = err as { response?: { data?: { message?: string } } }; setMessage(apiError.response?.data?.message || 'Unable to change course status.'); } }}>{course.isActive ? 'Deactivate' : 'Activate'}</button><button className="btn-action btn-action--view" style={{ marginLeft: 6 }} onClick={() => remove(course)}>Delete</button></td></tr>)}</tbody></table></div>}{pagination.totalPages > 1 && <div className="pagination"><button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button><span className="page-info">Page {page} of {pagination.totalPages}</span><button className="page-btn" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button></div>}</Card>
    </div>
  );
}
