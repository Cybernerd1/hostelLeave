import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import { Card } from '@/components/ui/Card';
import {
  academicHolidayApi,
  type AcademicHoliday,
  type AcademicHolidayType,
  type CalendarScope,
} from '@/services/academicHoliday.service';
import { adminApi } from '@/services/admin.service';
import './AcademicHolidaysPage.css';

const HOLIDAY_TYPES: Array<{ value: AcademicHolidayType; label: string }> = [
  { value: 'public_holiday', label: 'Public Holiday' },
  { value: 'institutional', label: 'Institutional Holiday' },
  { value: 'festival', label: 'Festival Holiday' },
  { value: 'semester_break', label: 'Semester Break' },
  { value: 'summer_vacation', label: 'Summer Vacation' },
  { value: 'winter_vacation', label: 'Winter Vacation' },
  { value: 'examination', label: 'Examination Period' },
  { value: 'working_day', label: 'Working Day' },
  { value: 'special_holiday', label: 'Special Holiday' },
  { value: 'national', label: 'National Holiday' },
  { value: 'other', label: 'Other' },
];

const TYPE_LABELS: Record<string, string> = HOLIDAY_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<string, string>,
);

const EMPTY_FORM = {
  name: '',
  startDate: '',
  endDate: '',
  description: '',
  type: 'other' as AcademicHolidayType,
  scope: 'institution' as CalendarScope,
  hostelId: '',
  academicYear: '',
};

interface HostelOption {
  _id: string;
  name: string;
}

function formatDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getError(error: unknown) {
  const response = (error as { response?: { status?: number; data?: { message?: string } } })
    ?.response;
  return { status: response?.status, message: response?.data?.message || 'Something went wrong.' };
}

export function AcademicHolidaysPage() {
  const { user } = useAuth();
  const { error: showError, success } = useFeedback();
  const role = user?.role || '';
  // Admins & chief wardens manage institution-wide; wardens manage their own hostel.
  const canManage = role === 'admin' || role === 'chief_warden' || role === 'warden';
  const canCreateInstitution = role === 'admin' || role === 'chief_warden';

  const [holidays, setHolidays] = useState<AcademicHoliday[]>([]);
  const [hostels, setHostels] = useState<HostelOption[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  // Monthly calendar view state.
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  });

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const list = await academicHolidayApi.list();
      setHolidays(list);
    } catch {
      setLoadError('Unable to load academic holidays. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Wardens need the hostel list to pick a hostel for hostel-specific entries.
  useEffect(() => {
    if (role !== 'warden') return;
    // The warden's own hostels are returned by the hostels list scoped server-side.
    let cancelled = false;
    adminApi.getHostels({ limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const rows = res.data ?? [];
        setHostels(rows.map((h) => ({ _id: h._id, name: h.name })));
      })
      .catch(() => { if (!cancelled) setHostels([]); });
    return () => { cancelled = true; };
  }, [role]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  const updateField = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const saveHoliday = async (confirmOverlap = false): Promise<boolean> => {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      showError('Holiday name, start date, and end date are required.');
      return false;
    }
    if (form.endDate < form.startDate) {
      showError('End date cannot be earlier than start date.');
      return false;
    }
    if (form.scope === 'hostel' && !form.hostelId) {
      showError('Please select a hostel for a hostel-specific entry.');
      return false;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description || undefined,
        type: form.type,
        scope: form.scope,
        hostelId: form.scope === 'hostel' ? form.hostelId : undefined,
        academicYear: form.academicYear || undefined,
        confirmOverlap,
      };
      if (editingId) await academicHolidayApi.update(editingId, payload);
      else await academicHolidayApi.create(payload);
      success(editingId ? 'Calendar entry updated.' : 'Calendar entry created.');
      resetForm();
      await loadHolidays();
      return true;
    } catch (error) {
      const details = getError(error);
      if (
        details.status === 409 &&
        details.message.toLowerCase().includes('overlap') &&
        !confirmOverlap
      ) {
        const confirmed = window.confirm(`${details.message}\n\nSave this overlapping entry?`);
        if (confirmed) return saveHoliday(true);
      } else {
        showError(details.message);
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (holiday: AcademicHoliday) => {
    if (!window.confirm(`Delete "${holiday.name}"? Existing leave applications will not be changed.`))
      return;
    setDeletingId(holiday._id);
    try {
      await academicHolidayApi.remove(holiday._id);
      success('Calendar entry deleted.');
      if (editingId === holiday._id) resetForm();
      await loadHolidays();
    } catch (error) {
      showError(getError(error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (holiday: AcademicHoliday) => {
    setEditingId(holiday._id);
    const hostelId =
      typeof holiday.hostelId === 'object' && holiday.hostelId
        ? holiday.hostelId._id
        : (holiday.hostelId as string) || '';
    setForm({
      name: holiday.name,
      startDate: holiday.startDate,
      endDate: holiday.endDate,
      description: holiday.description || '',
      type: holiday.type || 'other',
      scope: holiday.scope || 'institution',
      hostelId,
      academicYear: holiday.academicYear || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Monthly calendar grid ─────────────────────────────────────────
  const monthCells = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const leadingBlanks = (firstDay.getUTCDay() + 6) % 7; // Monday-first
    const cells: Array<{ key: string; day: number } | null> = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ key, day: d });
    }
    return cells;
  }, [viewMonth]);

  const holidayByDay = useMemo(() => {
    const map = new Map<string, AcademicHoliday>();
    for (const h of holidays) {
      const start = h.startDate;
      const end = h.endDate;
      let cursor = new Date(`${start}T00:00:00Z`);
      const endDate = new Date(`${end}T00:00:00Z`);
      let guard = 0;
      while (cursor <= endDate && guard < 400) {
        const key = cursor.toISOString().slice(0, 10);
        if (!map.has(key)) map.set(key, h);
        cursor = new Date(cursor.getTime() + 86400000);
        guard += 1;
      }
    }
    return map;
  }, [holidays]);

  const changeMonth = (delta: number) => {
    setViewMonth((current) => {
      const d = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  };

  const monthLabel = new Date(Date.UTC(viewMonth.year, viewMonth.month, 1)).toLocaleDateString(
    'en-IN',
    { month: 'long', year: 'numeric', timeZone: 'UTC' },
  );

  return (
    <div className="academic-holidays animate-fade-in-up">
      <header className="academic-holidays__header">
        <div>
          <h1>Academic Calendar</h1>
          <p>
            {canManage
              ? 'Manage holidays and special days used during leave review.'
              : 'View the academic calendar to see holidays and working days.'}
          </p>
        </div>
      </header>

      {/* ── Monthly calendar view ─────────────────────────────────── */}
      <Card variant="default" padding="lg">
        <div className="academic-holidays__calendar-header">
          <h2 className="academic-holidays__section-title">{monthLabel}</h2>
          <div className="academic-holidays__calendar-controls">
            <button className="btn btn--secondary btn--sm" onClick={() => changeMonth(-1)}>‹ Prev</button>
            <button className="btn btn--secondary btn--sm" onClick={() => changeMonth(1)}>Next ›</button>
            <button 
              className="btn btn--secondary btn--sm" 
              onClick={() => {
                const now = new Date();
                setViewMonth({ year: now.getUTCFullYear(), month: now.getUTCMonth() });
              }}
            >
              Today
            </button>
          </div>
        </div>
        <div className="academic-holidays__calendar-grid">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="academic-holidays__calendar-weekday">{d}</div>
          ))}
          {monthCells.map((cell, idx) =>
            cell ? (
              <div
                key={cell.key}
                className={`academic-holidays__calendar-day ${holidayByDay.has(cell.key) ? 'academic-holidays__calendar-day--holiday' : ''}`}
                title={holidayByDay.get(cell.key)?.name}
              >
                <div className="academic-holidays__calendar-day-number">{cell.day}</div>
                {holidayByDay.has(cell.key) && (
                  <div className="academic-holidays__calendar-event">
                    {holidayByDay.get(cell.key)?.name}
                  </div>
                )}
              </div>
            ) : (
              <div key={`blank-${idx}`} className="academic-holidays__calendar-day academic-holidays__calendar-day--blank" />
            ),
          )}
        </div>
      </Card>

      {/* ── Create / edit form ────────────────────────────────────── */}
      {canManage && (
        <Card variant="default" padding="lg">
          <h2 className="academic-holidays__section-title">
            {editingId ? 'Edit Calendar Entry' : 'Add Calendar Entry'}
          </h2>
          <form
            className="academic-holidays__form"
            onSubmit={(event) => {
              event.preventDefault();
              saveHoliday();
            }}
          >
            <label>
              Title / Occasion *
              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                maxLength={200}
                required
              />
            </label>
            <label>
              Category
              <select
                value={form.type}
                onChange={(event) => updateField('type', event.target.value)}
              >
                {HOLIDAY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </label>
            <label>
              Scope
              <select
                value={form.scope}
                onChange={(event) => updateField('scope', event.target.value)}
                disabled={!canCreateInstitution && !editingId}
              >
                {canCreateInstitution && <option value="institution">Institution-wide</option>}
                <option value="hostel">Hostel-specific</option>
              </select>
            </label>
            {form.scope === 'hostel' && (
              <label>
                Hostel *
                <select
                  value={form.hostelId}
                  onChange={(event) => updateField('hostelId', event.target.value)}
                  required
                >
                  <option value="">Select a hostel…</option>
                  {hostels.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Start date *
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => updateField('startDate', event.target.value)}
                required
              />
            </label>
            <label>
              End date *
              <input
                type="date"
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(event) => updateField('endDate', event.target.value)}
                required
              />
            </label>
            <label>
              Academic year
              <input
                value={form.academicYear}
                onChange={(event) => updateField('academicYear', event.target.value)}
                placeholder="e.g. 2026-2027"
                maxLength={20}
              />
            </label>
            <label className="academic-holidays__form-full">
              Description / Reason
              <textarea
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                maxLength={1000}
                rows={3}
              />
            </label>
            <div className="academic-holidays__form-actions">
              {editingId && (
                <button type="button" className="btn btn--secondary" onClick={resetForm}>Cancel</button>
              )}
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update Entry' : 'Add Entry'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* ── List ──────────────────────────────────────────────────── */}
      <Card variant="default" padding="none">
        <div className="academic-holidays__list-header">
          <h2 className="academic-holidays__section-title">All Calendar Entries</h2>
          <span>{holidays.length} {holidays.length === 1 ? 'entry' : 'entries'}</span>
        </div>
        {loading ? (
          <div className="academic-holidays__state">Loading calendar…</div>
        ) : loadError ? (
          <div className="academic-holidays__state academic-holidays__state--error">
            {loadError}
            <button className="btn btn--secondary" onClick={loadHolidays}>Retry</button>
          </div>
        ) : holidays.length === 0 ? (
          <div className="academic-holidays__state">No calendar entries have been published.</div>
        ) : (
          <div className="academic-holidays__table-wrap">
            <table className="academic-holidays__table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Dates</th>
                  <th>Category</th>
                  <th>Scope</th>
                  <th>Description</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {holidays.map((holiday) => (
                  <tr key={holiday._id}>
                    <td><strong>{holiday.name}</strong></td>
                    <td>
                      {formatDate(holiday.startDate)}
                      {holiday.startDate !== holiday.endDate && <> – {formatDate(holiday.endDate)}</>}
                    </td>
                    <td>{TYPE_LABELS[holiday.type || 'other'] || 'Other'}</td>
                    <td>{holiday.scope === 'hostel' ? 'Hostel' : 'Institution'}</td>
                    <td>{holiday.description || '—'}</td>
                    {canManage && (
                      <td>
                        <div className="academic-holidays__actions">
                          <button className="btn-action btn-action--view" onClick={() => startEdit(holiday)}>Edit</button>
                          <button
                            className="btn-action btn-action--delete"
                            disabled={deletingId === holiday._id}
                            onClick={() => handleDelete(holiday)}
                          >
                            {deletingId === holiday._id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}