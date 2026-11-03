import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import { Card } from '@/components/ui/Card';
import {
  academicHolidayApi,
  type AcademicHoliday,
  type AcademicHolidayType,
} from '@/services/academicHoliday.service';
import './AcademicHolidaysPage.css';

const HOLIDAY_TYPES: Array<{ value: AcademicHolidayType; label: string }> = [
  { value: 'national', label: 'National' },
  { value: 'festival', label: 'Festival' },
  { value: 'institutional', label: 'Institutional' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  name: '',
  startDate: '',
  endDate: '',
  description: '',
  type: 'other' as AcademicHolidayType,
};

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
  const canManage = user?.role === 'admin' || user?.role === 'chief_warden';
  const [holidays, setHolidays] = useState<AcademicHoliday[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setHolidays(await academicHolidayApi.list());
    } catch {
      setLoadError('Unable to load academic holidays. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

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

    setSaving(true);
    try {
      const data = { ...form, confirmOverlap };
      if (editingId) await academicHolidayApi.update(editingId, data);
      else await academicHolidayApi.create(data);
      success(editingId ? 'Academic holiday updated.' : 'Academic holiday created.');
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
        const confirmed = window.confirm(`${details.message}\n\nSave this overlapping holiday?`);
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
    if (
      !window.confirm(`Delete "${holiday.name}"? Existing leave applications will not be changed.`)
    )
      return;
    setDeletingId(holiday._id);
    try {
      await academicHolidayApi.remove(holiday._id);
      success('Academic holiday deleted.');
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
    setForm({
      name: holiday.name,
      startDate: holiday.startDate,
      endDate: holiday.endDate,
      description: holiday.description || '',
      type: holiday.type || 'other',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="academic-holidays animate-fade-in-up">
      <header className="academic-holidays__header">
        <div>
          <h1>Academic Holidays</h1>
          <p>
            {canManage
              ? 'Manage the institution calendar used during leave review.'
              : 'View the complete academic holiday calendar.'}
          </p>
        </div>
      </header>

      {canManage && (
        <Card variant="default" padding="lg">
          <h2 className="academic-holidays__section-title">
            {editingId ? 'Edit Holiday' : 'Add Holiday'}
          </h2>
          <form
            className="academic-holidays__form"
            onSubmit={(event) => {
              event.preventDefault();
              saveHoliday();
            }}
          >
            <label>
              Holiday name *
              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                maxLength={200}
                required
              />
            </label>
            <label>
              Holiday type
              <select
                value={form.type}
                onChange={(event) => updateField('type', event.target.value)}
              >
                {HOLIDAY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
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
            <label className="academic-holidays__form-full">
              Description
              <textarea
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                maxLength={1000}
                rows={3}
              />
            </label>
            <div className="academic-holidays__form-actions">
              {editingId && (
                <button type="button" className="btn btn--secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update Holiday' : 'Add Holiday'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card variant="default" padding="none">
        <div className="academic-holidays__list-header">
          <h2 className="academic-holidays__section-title">Holiday Calendar</h2>
          <span>
            {holidays.length} {holidays.length === 1 ? 'holiday' : 'holidays'}
          </span>
        </div>
        {loading ? (
          <div className="academic-holidays__state">Loading holidays…</div>
        ) : loadError ? (
          <div className="academic-holidays__state academic-holidays__state--error">
            {loadError}
            <button className="btn btn--secondary" onClick={loadHolidays}>
              Retry
            </button>
          </div>
        ) : holidays.length === 0 ? (
          <div className="academic-holidays__state">No academic holidays have been published.</div>
        ) : (
          <div className="academic-holidays__table-wrap">
            <table className="academic-holidays__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Dates</th>
                  <th>Type</th>
                  <th>Description</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {holidays.map((holiday) => (
                  <tr key={holiday._id}>
                    <td>
                      <strong>{holiday.name}</strong>
                    </td>
                    <td>
                      {formatDate(holiday.startDate)}
                      {holiday.startDate !== holiday.endDate && (
                        <> – {formatDate(holiday.endDate)}</>
                      )}
                    </td>
                    <td>
                      {HOLIDAY_TYPES.find((type) => type.value === holiday.type)?.label || 'Other'}
                    </td>
                    <td>{holiday.description || '—'}</td>
                    {canManage && (
                      <td>
                        <div className="academic-holidays__actions">
                          <button
                            className="btn-action btn-action--view"
                            onClick={() => startEdit(holiday)}
                          >
                            Edit
                          </button>
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
