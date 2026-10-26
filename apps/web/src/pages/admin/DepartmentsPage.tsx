/** Admin: department management */
import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { adminApi, type DepartmentRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import '../shared/ApprovalsPage.css';

const emptyForm = { name: '', code: '', description: '' };

export function DepartmentsPage() {
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
      const res = await adminApi.getDepartments({ page, limit: 15, search: search || undefined });
      setDepartments(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch { setDepartments([]); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const saved = editingId ? await adminApi.updateDepartment(editingId, form) : await adminApi.createDepartment(form);
      setMessage(`Department ${saved.name} ${editingId ? 'updated' : 'created'}.`);
      setForm(emptyForm); setEditingId(null); setFormOpen(false); await fetchData();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setMessage(apiError.response?.data?.message || 'Unable to save department.');
    }
  };

  const remove = async (department: DepartmentRecord) => {
    if (!window.confirm(`Delete ${department.name}?`)) return;
    try { await adminApi.deleteDepartment(department._id); setMessage(`${department.name} deleted.`); await fetchData(); }
    catch (err: unknown) { const apiError = err as { response?: { data?: { message?: string } } }; setMessage(apiError.response?.data?.message || 'Unable to delete department.'); }
  };

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header"><div><h1 className="approvals-page__title">Departments</h1><p className="approvals-page__subtitle">{pagination.total} departments</p></div><button className="btn btn--primary" onClick={() => { setForm(emptyForm); setEditingId(null); setFormOpen(true); }}>+ Add Department</button></div>
      {message && <div className="form-message form-message--success" style={{ marginBottom: '1rem' }}>{message}</div>}
      {formOpen && <Card variant="default" padding="lg"><form onSubmit={save}><h2 style={{ marginTop: 0 }}>{editingId ? 'Edit Department' : 'Add Department'}</h2><div className="filters-row"><input className="filter-input" placeholder="Department name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input className="filter-input" placeholder="Code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /><input className="filter-input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><button className="btn btn--primary" type="submit">{editingId ? 'Save Changes' : 'Create Department'}</button><button className="btn btn--secondary" type="button" style={{ marginLeft: 8 }} onClick={() => setFormOpen(false)}>Cancel</button></form></Card>}
      <div className="filters-row"><input className="filter-input" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchData())} /><button className="btn btn--primary btn--sm" onClick={() => { setPage(1); fetchData(); }}>Search</button></div>
      <Card variant="default" padding="none">{loading ? <div className="table-empty"><div className="spinner" /></div> : departments.length === 0 ? <div className="table-empty"><p>No departments found.</p></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Name</th><th>Code</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead><tbody>{departments.map((department) => <tr key={department._id}><td><div className="cell-primary">{department.name}</div></td><td><code className="leave-id">{department.code}</code></td><td>{department.description || '—'}</td><td><span className={`status-badge status-badge--${department.isActive ? 'approved' : 'rejected'}`}>{department.isActive ? 'Active' : 'Inactive'}</span></td><td><button className="btn-action btn-action--view" onClick={() => { setEditingId(department._id); setForm({ name: department.name, code: department.code, description: department.description || '' }); setFormOpen(true); }}>Edit</button><button className="btn-action btn-action--view" style={{ marginLeft: 6 }} onClick={async () => { try { await adminApi.updateDepartment(department._id, { isActive: !department.isActive }); await fetchData(); } catch (err: unknown) { const apiError = err as { response?: { data?: { message?: string } } }; setMessage(apiError.response?.data?.message || 'Unable to change department status.'); } }}>{department.isActive ? 'Deactivate' : 'Activate'}</button><button className="btn-action btn-action--view" style={{ marginLeft: 6 }} onClick={() => remove(department)}>Delete</button></td></tr>)}</tbody></table></div>}{pagination.totalPages > 1 && <div className="pagination"><button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button><span className="page-info">Page {page} of {pagination.totalPages}</span><button className="page-btn" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button></div>}</Card>
    </div>
  );
}
