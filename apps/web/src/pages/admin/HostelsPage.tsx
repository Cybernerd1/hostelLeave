/** Hostel management and live room availability. */
import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, type HostelRecord } from '@/services/admin.service';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import '../shared/ApprovalsPage.css';
const emptyForm = { name: '', type: 'co_ed', totalRooms: 1, studentsPerRoom: 1 as 1 | 2 | 3 };

export function HostelsPage() {
  const { confirm, success, error: showError } = useFeedback();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin' || user?.role === 'chief_warden';
  const [hostels, setHostels] = useState<HostelRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getHostels({ page, limit: 15, search: search || undefined });
      setHostels(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch { setHostels([]); showError('Unable to load hostels.'); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveHostel = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const saved = editingId
        ? await adminApi.updateHostel(editingId, form)
        : await adminApi.createHostel(form);
      success(`${saved.name} ${editingId ? 'updated' : 'created'} successfully.`);
      setForm(emptyForm);
      setEditingId(null);
      setFormOpen(false);
      await fetchData();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      showError(apiError.response?.data?.message || 'Unable to save hostel.');
    } finally { setSaving(false); }
  };

  const deleteHostel = async (hostel: HostelRecord) => {
    if (!await confirm({ title: 'Delete hostel?', message: `Delete ${hostel.name}?`, confirmLabel: 'Delete', destructive: true })) return;
    try { await adminApi.deleteHostel(hostel._id); success(`${hostel.name} deleted.`); await fetchData(); }
    catch (err: unknown) { const apiError = err as { response?: { data?: { message?: string } } }; showError(apiError.response?.data?.message || 'Unable to delete hostel.'); }
  };

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div><h1 className="approvals-page__title">Hostels</h1><p className="approvals-page__subtitle">{pagination.total} hostels with live capacity</p></div>
        {canManage && <button className="btn btn--primary" onClick={() => { setForm(emptyForm); setEditingId(null); setFormOpen(true); }}>+ Create Hostel</button>}
      </div>

      {formOpen && canManage && (
        <Card variant="default" padding="lg">
          <form onSubmit={saveHostel}>
            <h2 style={{ marginTop: 0 }}>{editingId ? 'Edit Hostel' : 'Create Hostel'}</h2>
            <div className="filters-row">
              <input className="filter-input" placeholder="Hostel name" value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <select className="filter-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="co_ed">Co-ed</option><option value="boys">Boys</option><option value="girls">Girls</option>
              </select>
              <input className="filter-input" type="number" min="1" placeholder="Number of rooms" value={form.totalRooms} required onChange={(e) => setForm({ ...form, totalRooms: Number(e.target.value) })} />
              <select className="filter-select" value={form.studentsPerRoom} onChange={(e) => setForm({ ...form, studentsPerRoom: Number(e.target.value) as 1 | 2 | 3 })}>
                <option value={1}>1 student per room</option><option value={2}>2 students per room</option><option value={3}>3 students per room</option>
              </select>
            </div>
            <p style={{ color: 'var(--color-neutral-600)' }}>Total bed capacity: <strong>{form.totalRooms * form.studentsPerRoom}</strong></p>
            <button className="btn btn--primary" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Hostel'}</button>
            <button className="btn btn--secondary" type="button" style={{ marginLeft: 8 }} onClick={() => setFormOpen(false)}>Cancel</button>
          </form>
        </Card>
      )}

      <div className="filters-row">
        <input className="filter-input" placeholder="Search hostels…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchData())} />
        <button className="btn btn--primary btn--sm" onClick={() => { setPage(1); fetchData(); }}>Search</button>
      </div>
      <Card variant="default" padding="none">
        {loading ? <div className="table-empty"><div className="spinner" /></div> : hostels.length === 0 ? <div className="table-empty"><p>No hostels found.</p></div> : (
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Hostel</th><th>Rooms</th><th>Bed Capacity</th><th>Occupied</th><th>Available</th><th>Occupancy</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{hostels.map((hostel) => <tr key={hostel._id}>
              <td><div className="cell-primary">{hostel.name}</div><div className="cell-secondary">{hostel.type} · {hostel.studentsPerRoom} per room</div></td>
              <td>{hostel.totalRooms}</td><td>{hostel.capacity}</td><td>{hostel.occupiedSeats}</td><td>{hostel.availableSeats}</td><td>{hostel.occupancyPercentage}%</td>
              <td><span className={`status-badge status-badge--${hostel.isActive ? 'approved' : 'rejected'}`}>{hostel.isActive ? 'Active' : 'Inactive'}</span></td>
              <td><button className="btn-action btn-action--view" onClick={() => navigate(`/admin/hostels/${hostel._id}/rooms`)}>View rooms</button>{canManage && <><button className="btn-action btn-action--view" style={{ marginLeft: 6 }} onClick={() => { setEditingId(hostel._id); setForm({ name: hostel.name, type: hostel.type, totalRooms: hostel.totalRooms, studentsPerRoom: hostel.studentsPerRoom || 1 }); setFormOpen(true); }}>Edit</button><button className="btn-action btn-action--view" style={{ marginLeft: 6 }} onClick={async () => { try { const updated = await adminApi.updateHostel(hostel._id, { isActive: !hostel.isActive }); setHostels((current) => current.map((item) => item._id === hostel._id ? updated : item)); success(`Hostel marked ${updated.isActive ? 'available' : 'unavailable'}.`); } catch { showError('Unable to change hostel status.'); } }}>{hostel.isActive ? 'Mark unavailable' : 'Mark available'}</button><button className="btn-action btn-action--view" style={{ marginLeft: 6 }} onClick={() => deleteHostel(hostel)}>Delete</button></>}</td>
            </tr>)}</tbody>
          </table></div>
        )}
        {pagination.totalPages > 1 && <div className="pagination"><button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button><span className="page-info">Page {page} of {pagination.totalPages}</span><button className="page-btn" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button></div>}
      </Card>

    </div>
  );
}
