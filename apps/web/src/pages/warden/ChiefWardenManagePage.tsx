/**
 * Chief Warden Management Page
 *
 * Four-tab page:
 *  1. Students – all students, search/filter, assign hostels
 *  2. Wardens & Hostels – all wardens, assign wardens to hostels
 *  3. Create Warden – onboard a new warden account
 *  4. Reports & Analytics – scoped leave stats
 */

import { useState, useEffect, useCallback } from 'react';
import { adminApi, type HostelRecord, type StaffRecord, type StudentRecord } from '@/services/admin.service';
import { leaveApi, type LeaveRequest } from '@/services/leave.service';
import { Card } from '@/components/ui/Card';
import '../shared/ApprovalsPage.css';
import './ChiefWardenManagePage.css';

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'students' | 'wardens' | 'create-warden' | 'reports';

interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed?: number;
  cancelled?: number;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Can a student of this gender live in this hostel type? */
function genderMatches(hostelType: string, gender: string): boolean {
  if (hostelType === 'co_ed') return true;
  if (hostelType === 'boys') return gender === 'male';
  if (hostelType === 'girls') return gender === 'female';
  return false;
}

// ─── Tab 1 – Students ────────────────────────────────────────────────────────

function StudentsTab() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [hostels, setHostels] = useState<HostelRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedHostel, setSelectedHostel] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getStudents({
        page,
        limit: 12,
        search: search || undefined,
        hostelId: hostelFilter || undefined,
      });
      setStudents(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
      // Pre-fill hostel selections with the student's current hostel
      const initial: Record<string, string> = {};
      res.data.forEach(s => { initial[s._id] = s.hostelId?._id || ''; });
      setSelectedHostel(initial);
    } catch {
      setError('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [page, search, hostelFilter]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  useEffect(() => {
    adminApi.getHostelsWithWardens()
      .then(setHostels)
      .catch(() => { /* list still usable without hostels */ });
  }, []);

  const handleAssign = async (student: StudentRecord) => {
    const hostelId = selectedHostel[student._id];
    if (!hostelId) return;
    setAssigning(student._id);
    setError('');
    setSuccess('');
    try {
      const updated = await adminApi.assignHostelToStudent(student._id, hostelId);
      setStudents(prev => prev.map(s => s._id === student._id ? { ...s, hostelId: updated.hostelId, roomId: updated.roomId } : s));
      setSuccess(`Hostel updated for ${student.name}.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to assign hostel.');
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="cwm-tab-content">
      <div className="cwm-tab-header">
        <div>
          <h2 className="cwm-section-title">Students</h2>
          <p className="cwm-section-subtitle">View all students and assign them to hostels. Room allocation resets on hostel change.</p>
        </div>
        <span className="cwm-badge-count">{pagination.total} students</span>
      </div>

      <div className="filters-row">
        <input
          className="filter-input"
          placeholder="Search by name or roll number…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(1), setSearch(searchInput.trim()))}
        />
        <select
          className="filter-select"
          value={hostelFilter}
          onChange={(e) => { setHostelFilter(e.target.value); setPage(1); }}
        >
          <option value="">All hostels</option>
          {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
        </select>
        <button className="btn btn--primary btn--sm" onClick={() => { setPage(1); setSearch(searchInput.trim()); }}>Search</button>
      </div>

      {success && <div className="cwm-alert cwm-alert--success">{success}</div>}
      {error && <div className="cwm-alert cwm-alert--error">{error}</div>}

      <Card variant="default" padding="none">
        {loading ? (
          <div className="table-empty"><div className="spinner" /><p>Loading students…</p></div>
        ) : students.length === 0 ? (
          <div className="table-empty"><p>No students found.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No.</th>
                  <th>Course / Dept.</th>
                  <th>Gender</th>
                  <th>Current Hostel</th>
                  <th>Assign Hostel</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const current = selectedHostel[s._id] || '';
                  return (
                    <tr key={s._id}>
                      <td>
                        <div className="cell-primary">{s.name}</div>
                        <div className="cell-secondary">Year {s.year} · {s.semester} Sem</div>
                      </td>
                      <td><code className="leave-id">{s.rollNumber}</code></td>
                      <td>
                        <div className="cell-primary">{s.courseId?.name || '—'}</div>
                        <div className="cell-secondary">{s.departmentId?.code || ''}</div>
                      </td>
                      <td><span className="cell-secondary" style={{ textTransform: 'capitalize' }}>{s.gender}</span></td>
                      <td>
                        {s.hostelId ? (
                          <>
                            <div className="cell-primary">{s.hostelId.name}</div>
                            <div className="cell-secondary">{s.roomId ? `Room ${s.roomId.roomNumber}` : 'No room'}</div>
                          </>
                        ) : (
                          <span className="cwm-no-warden">⚠ Not assigned</span>
                        )}
                      </td>
                      <td>
                        <div className="cwm-assign-row">
                          <select
                            className="filter-select cwm-warden-select"
                            value={current}
                            onChange={e => setSelectedHostel(prev => ({ ...prev, [s._id]: e.target.value }))}
                            disabled={assigning === s._id}
                          >
                            <option value="">— Select hostel —</option>
                            {hostels.map(h => {
                              const ok = genderMatches(h.type, s.gender);
                              return (
                                <option key={h._id} value={h._id} disabled={!ok}>
                                  {h.name}{!ok ? ` (${h.type === 'boys' ? 'boys only' : 'girls only'})` : ''}
                                </option>
                              );
                            })}
                          </select>
                          <button
                            className="btn btn--primary btn--sm"
                            onClick={() => handleAssign(s)}
                            disabled={assigning === s._id || !current || current === s.hostelId?._id}
                          >
                            {assigning === s._id ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span className="page-info">Page {pagination.page} of {pagination.totalPages}</span>
            <button className="page-btn" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Tab 2 – Wardens & Hostels ───────────────────────────────────────────────

function WardensTab() {
  const [hostels, setHostels] = useState<HostelRecord[]>([]);
  const [wardens, setWardens] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null); // hostel id being assigned
  const [selectedWardenId, setSelectedWardenId] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [h, w] = await Promise.all([
        adminApi.getHostelsWithWardens(),
        adminApi.getStaff('warden'),
      ]);
      setHostels(h);
      setWardens(w);
      // Pre-fill current warden selections
      const initial: Record<string, string> = {};
      h.forEach(hostel => {
        initial[hostel._id] = hostel.wardenId?._id || '';
      });
      setSelectedWardenId(initial);
    } catch {
      setError('Failed to load hostel data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Map warden → currently managed hostel
  const hostelByWarden = new Map<string, HostelRecord>();
  hostels.forEach(h => {
    if (h.wardenId?._id) { hostelByWarden.set(h.wardenId._id, h); }
  });

  const handleAssign = async (hostelId: string) => {
    const wardenId = selectedWardenId[hostelId] || null;
    setAssigning(hostelId);
    setError('');
    setSuccess('');
    try {
      const updated = await adminApi.assignWardenToHostel(hostelId, wardenId);
      setHostels(prev => prev.map(h => h._id === hostelId ? { ...h, wardenId: updated.wardenId } : h));
      setSuccess(`Warden assignment updated for ${updated.name}.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to assign warden.');
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="cwm-tab-content">
      <div className="cwm-tab-header">
        <div>
          <h2 className="cwm-section-title">Wardens & Hostels</h2>
          <p className="cwm-section-subtitle">Assign or reassign wardens to hostels under your supervision.</p>
        </div>
      </div>

      {success && <div className="cwm-alert cwm-alert--success">{success}</div>}
      {error && <div className="cwm-alert cwm-alert--error">{error}</div>}

      {loading ? (
        <div className="table-empty"><div className="spinner" /><p>Loading hostels…</p></div>
      ) : (
        <>
          <div className="cwm-hostel-grid">
            {hostels.map(hostel => (
              <Card key={hostel._id} variant="default" padding="lg" className="cwm-hostel-card">
                {/* Header */}
                <div className="cwm-hostel-header">
                  <div className="cwm-hostel-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
                      <path d="M9 21V12h6v9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="cwm-hostel-name">{hostel.name}</h3>
                    <span className="cwm-hostel-type">{hostel.type}</span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="cwm-hostel-stats">
                  <div className="cwm-hostel-stat">
                    <span className="cwm-hostel-stat-val">{hostel.capacity}</span>
                    <span className="cwm-hostel-stat-lbl">Capacity</span>
                  </div>
                  <div className="cwm-hostel-stat">
                    <span className="cwm-hostel-stat-val">{hostel.occupancy}</span>
                    <span className="cwm-hostel-stat-lbl">Occupied</span>
                  </div>
                  <div className="cwm-hostel-stat">
                    <span className="cwm-hostel-stat-val">{hostel.totalRooms}</span>
                    <span className="cwm-hostel-stat-lbl">Rooms</span>
                  </div>
                </div>

                {/* Current warden */}
                <div className="cwm-current-warden">
                  <span className="cwm-label">Current Warden</span>
                  {hostel.wardenId ? (
                    <span className="cwm-warden-name">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {hostel.wardenId.name}
                      <span className="cwm-warden-email">{hostel.wardenId.email}</span>
                    </span>
                  ) : (
                    <span className="cwm-no-warden">⚠ No warden assigned</span>
                  )}
                </div>

                {/* Assignment control */}
                <div className="cwm-assign-row">
                  <select
                    className="filter-select cwm-warden-select"
                    value={selectedWardenId[hostel._id] || ''}
                    onChange={e => setSelectedWardenId(prev => ({ ...prev, [hostel._id]: e.target.value }))}
                    disabled={assigning === hostel._id}
                  >
                    <option value="">— Unassign warden —</option>
                    {wardens.map(w => (
                      <option key={w._id} value={w._id}>{w.name} ({w.email})</option>
                    ))}
                  </select>
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => handleAssign(hostel._id)}
                    disabled={assigning === hostel._id}
                  >
                    {assigning === hostel._id ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* All wardens roster */}
          <Card variant="default" padding="none">
            <div className="cwm-table-header">
              <h3 className="cwm-form-title" style={{ margin: 0 }}>All Wardens</h3>
              <span className="cwm-badge-count">{wardens.length}</span>
            </div>
            {wardens.length === 0 ? (
              <div className="table-empty"><p>No wardens yet. Create one from the Create Warden tab.</p></div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Warden</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Assigned Hostel</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wardens.map(w => {
                      const hostel = hostelByWarden.get(w._id);
                      return (
                        <tr key={w._id}>
                          <td>
                            <div className="cwm-warden-cell">
                              <div className="cwm-warden-avatar cwm-warden-avatar--sm">{w.name.charAt(0).toUpperCase()}</div>
                              <span className="cell-primary">{w.name}</span>
                            </div>
                          </td>
                          <td className="cell-secondary">{w.email}</td>
                          <td className="cell-secondary">{w.phone || '—'}</td>
                          <td>
                            {hostel ? (
                              <span className="cwm-hostel-chip">{hostel.name}</span>
                            ) : (
                              <span className="cwm-no-warden">⚠ Not assigned</span>
                            )}
                          </td>
                          <td>
                            <span className={`status-badge status-badge--${w.isActive ? 'approved' : 'rejected'}`}>
                              {w.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Tab 3 – Create Warden ───────────────────────────────────────────────────

function CreateWardenTab() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [createdWardens, setCreatedWardens] = useState<StaffRecord[]>([]);
  const [existingWardens, setExistingWardens] = useState<StaffRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadWardens = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await adminApi.getStaff('warden');
      setExistingWardens(list);
    } catch {
      // silent
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadWardens(); }, [loadWardens]);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Name, email and password are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const newWarden = await adminApi.createWarden(form);
      setCreatedWardens(prev => [newWarden, ...prev]);
      setExistingWardens(prev => [newWarden, ...prev]);
      setForm({ name: '', email: '', phone: '', password: '' });
      setSuccess(`Warden account created for ${newWarden.name}. Share credentials securely.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to create warden.');
    } finally {
      setLoading(false);
    }
  };

  const allWardens = [
    ...createdWardens.filter(w => !existingWardens.some(e => e._id === w._id)),
    ...existingWardens,
  ];

  return (
    <div className="cwm-tab-content">
      <div className="cwm-tab-header">
        <div>
          <h2 className="cwm-section-title">Create Warden Account</h2>
          <p className="cwm-section-subtitle">Onboard a new warden and assign them to a hostel from the Wardens tab.</p>
        </div>
      </div>

      <div className="cwm-create-layout">
        {/* Form card */}
        <Card variant="default" padding="lg" className="cwm-form-card">
          <h3 className="cwm-form-title">New Warden Details</h3>
          <form className="cwm-form" onSubmit={handleSubmit}>
            {success && <div className="cwm-alert cwm-alert--success">{success}</div>}
            {error && <div className="cwm-alert cwm-alert--error">{error}</div>}

            <div className="cwm-form-row">
              <div className="cwm-form-group">
                <label className="cwm-form-label" htmlFor="warden-name">Full Name *</label>
                <input
                  id="warden-name"
                  className="cwm-form-input"
                  type="text"
                  value={form.name}
                  onChange={handleChange('name')}
                  placeholder="Dr. Anita Sharma"
                  required
                />
              </div>
              <div className="cwm-form-group">
                <label className="cwm-form-label" htmlFor="warden-phone">Phone</label>
                <input
                  id="warden-phone"
                  className="cwm-form-input"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div className="cwm-form-group">
              <label className="cwm-form-label" htmlFor="warden-email">Email Address *</label>
              <input
                id="warden-email"
                className="cwm-form-input"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="warden@college.edu"
                required
              />
            </div>

            <div className="cwm-form-group">
              <label className="cwm-form-label" htmlFor="warden-password">
                Password * <span className="cwm-label-hint">(min 6 characters)</span>
              </label>
              <input
                id="warden-password"
                className="cwm-form-input"
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                placeholder="Temporary password"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary cwm-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <><div className="cwm-btn-spinner" /> Creating…</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Create Warden Account
                </>
              )}
            </button>
          </form>
        </Card>

        {/* Existing wardens list */}
        <Card variant="default" padding="none" className="cwm-wardens-list-card">
          <div className="cwm-wardens-list-header">
            <h3 className="cwm-form-title">All Wardens</h3>
            <span className="cwm-badge-count">{allWardens.length}</span>
          </div>
          {loadingList ? (
            <div className="table-empty"><div className="spinner" /></div>
          ) : allWardens.length === 0 ? (
            <div className="table-empty"><p>No wardens yet.</p></div>
          ) : (
            <div className="cwm-warden-list">
              {allWardens.map(w => (
                <div key={w._id} className="cwm-warden-item">
                  <div className="cwm-warden-avatar">
                    {w.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="cwm-warden-info">
                    <span className="cwm-warden-item-name">{w.name}</span>
                    <span className="cwm-warden-item-email">{w.email}</span>
                    {w.phone && <span className="cwm-warden-item-phone">{w.phone}</span>}
                  </div>
                  <span className={`status-badge status-badge--${w.isActive ? 'approved' : 'rejected'}`}>
                    {w.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Tab 4 – Reports ─────────────────────────────────────────────────────────

function ReportsTab() {
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [recentLeaves, setRecentLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      leaveApi.getStats().catch(() => null),
      leaveApi.getAll({ limit: 20 }).catch(() => ({ data: [] })),
    ]).then(([s, leavesRes]) => {
      setStats(s as LeaveStats | null);
      setRecentLeaves((leavesRes?.data as LeaveRequest[]) || []);
    }).finally(() => setLoading(false));
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    pending_parent: 'warning', pending_warden: 'warning',
    pending_chief_warden: 'warning', pending_hod: 'warning',
    approved: 'approved', rejected: 'rejected',
    completed: 'info', cancelled: 'neutral', expired: 'neutral',
  };

  const statCards = stats ? [
    { label: 'Total Applications', value: stats.total,    color: 'info',    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { label: 'Pending',           value: stats.pending,  color: 'warning', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Approved',          value: stats.approved, color: 'success', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Rejected',          value: stats.rejected, color: 'error',   icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ] : [];

  return (
    <div className="cwm-tab-content">
      <div className="cwm-tab-header">
        <div>
          <h2 className="cwm-section-title">Reports & Analytics</h2>
          <p className="cwm-section-subtitle">Leave statistics scoped to your hostel.</p>
        </div>
      </div>

      {loading ? (
        <div className="table-empty"><div className="spinner" /><p>Loading reports…</p></div>
      ) : (
        <>
          {/* Stat cards */}
          {stats && (
            <div className="dashboard-page__stats-grid" style={{ marginBottom: '1.5rem' }}>
              {statCards.map(c => (
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
          )}

          {/* Approval rate bar */}
          {stats && stats.total > 0 && (
            <Card variant="default" padding="md" className="cwm-rate-card">
              <h3 className="cwm-rate-title">Approval Rate</h3>
              <div className="cwm-rate-meta">
                {Math.round((stats.approved / stats.total) * 100)}% approved of {stats.total} total applications
              </div>
              <div className="cwm-rate-bar-track">
                <div
                  className="cwm-rate-bar-fill cwm-rate-bar-fill--green"
                  style={{ width: `${(stats.approved / stats.total) * 100}%` }}
                />
                <div
                  className="cwm-rate-bar-fill cwm-rate-bar-fill--red"
                  style={{ width: `${(stats.rejected / stats.total) * 100}%`, left: `${(stats.approved / stats.total) * 100}%` }}
                />
              </div>
              <div className="cwm-rate-legend">
                <span className="cwm-legend-item cwm-legend-item--green">✓ Approved: {stats.approved}</span>
                <span className="cwm-legend-item cwm-legend-item--red">✗ Rejected: {stats.rejected}</span>
                <span className="cwm-legend-item cwm-legend-item--yellow">⏳ Pending: {stats.pending}</span>
                {stats.completed !== undefined && <span className="cwm-legend-item cwm-legend-item--blue">↩ Completed: {stats.completed}</span>}
              </div>
            </Card>
          )}

          {/* Recent applications table */}
          <Card variant="default" padding="none" style={{ marginTop: '1.5rem' }}>
            <div className="cwm-table-header">
              <h3 className="cwm-form-title">Recent Applications</h3>
            </div>
            {recentLeaves.length === 0 ? (
              <div className="table-empty"><p>No leave applications found.</p></div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Leave ID</th>
                      <th>Student</th>
                      <th>Type</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Status</th>
                      <th>Applied</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeaves.map(l => (
                      <tr key={l._id}>
                        <td><code className="leave-id">{l.leaveId}</code></td>
                        <td>
                          <div className="cell-primary">{l.studentId?.name || '—'}</div>
                          <div className="cell-secondary">{l.studentId?.rollNumber}</div>
                        </td>
                        <td><span className="leave-type-badge">{l.leaveType.replace('_', ' ')}</span></td>
                        <td>{fmtDate(l.fromDate)}</td>
                        <td>{fmtDate(l.toDate)}</td>
                        <td>
                          <span className={`status-badge status-badge--${STATUS_COLORS[l.status] ?? 'neutral'}`}>
                            {l.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="cell-secondary">{fmtDate(l.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function ChiefWardenManagePage() {
  const [activeTab, setActiveTab] = useState<Tab>('students');

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'students',      label: 'Students',          icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'wardens',       label: 'Wardens & Hostels', icon: 'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z' },
    { id: 'create-warden', label: 'Create Warden',     icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
    { id: 'reports',       label: 'Reports',           icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ];

  return (
    <div className="cwm-page animate-fade-in-up">
      {/* Page title */}
      <div className="cwm-page-header">
        <div>
          <h1 className="cwm-page-title">Hostel Administration</h1>
          <p className="cwm-page-subtitle">View students and wardens, assign hostels, and review leave reports</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="cwm-tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`cwm-tab-${tab.id}`}
            className={`cwm-tab-btn ${activeTab === tab.id ? 'cwm-tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="cwm-content" role="tabpanel">
        {activeTab === 'students'      && <StudentsTab />}
        {activeTab === 'wardens'       && <WardensTab />}
        {activeTab === 'create-warden' && <CreateWardenTab />}
        {activeTab === 'reports'       && <ReportsTab />}
      </div>
    </div>
  );
}
