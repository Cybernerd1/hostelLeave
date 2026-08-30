/** Admin: Staff Page */
import { useState, useEffect } from 'react';
import { adminApi, type StaffRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import { getRoleLabel } from '@/utils/roleConfig';
import '../shared/ApprovalsPage.css';

const ROLE_COLORS: Record<string, string> = {
  warden: 'info', chief_warden: 'info', hod: 'pending', guard: 'neutral',
  admin: 'rejected', vice_chancellor: 'approved',
};

export function StaffPage() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    adminApi.getStaff(roleFilter || undefined)
      .then(setStaff)
      .catch(() => setStaff([]))
      .finally(() => setLoading(false));
  }, [roleFilter]);

  const ROLE_OPTIONS = ['', 'warden', 'chief_warden', 'hod', 'guard', 'vice_chancellor', 'admin'];

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div>
          <h1 className="approvals-page__title">Staff</h1>
          <p className="approvals-page__subtitle">{staff.length} staff members</p>
        </div>
      </div>
      <div className="filters-row">
        <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r ? getRoleLabel(r) : 'All Roles'}</option>)}
        </select>
      </div>
      <Card variant="default" padding="none">
        {loading ? <div className="table-empty"><div className="spinner" /></div> : staff.length === 0 ? <div className="table-empty"><p>No staff found.</p></div> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Status</th><th>Last Login</th></tr></thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s._id}>
                    <td><div className="cell-primary">{s.name}</div></td>
                    <td>{s.email}</td>
                    <td>
                      <span className={`status-badge status-badge--${ROLE_COLORS[s.role] ?? 'neutral'}`}>
                        {getRoleLabel(s.role)}
                      </span>
                    </td>
                    <td>{s.phone || '—'}</td>
                    <td><span className={`status-badge status-badge--${s.isActive ? 'approved' : 'rejected'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="cell-secondary">
                      {s.lastLogin ? new Date(s.lastLogin).toLocaleDateString('en-IN') : 'Never'}
                    </td>
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
