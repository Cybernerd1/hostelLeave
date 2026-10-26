/**
 * Admin: Manual Student Registration Page
 * Allows authorized staff to register students manually.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/services/admin.service';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import './AdminPages.css';

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export function RegisterStudentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdminOrChief = user?.role === 'admin' || user?.role === 'chief_warden';

  const [form, setForm] = useState({
    email: '', password: '', rollNumber: '', studentNumber: '', name: '', phone: '',
    gender: 'male', dateOfBirth: '', address: '', city: '', state: '', pincode: '',
    departmentId: '', courseId: '', year: 1, semester: '', admissionYear: new Date().getFullYear(),
    bloodGroup: '', admissionNumber: '', academicSession: '',
    fatherName: '', fatherEmail: '', fatherPhone: '',
    motherName: '', motherEmail: '', motherPhone: '',
    guardianAddressLine1: '', guardianAddressLine2: '', guardianCity: '', guardianState: '',
    guardianPincode: '', guardianCountry: '',
  });
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await adminApi.getDepartments({ page: 1, limit: 100 });
      setDepartments(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await adminApi.getCourses({ page: 1, limit: 100 });
      setCourses(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchDepartments(); fetchCourses(); }, [fetchDepartments, fetchCourses]);

  const handleChange = (key: string, value: string | number) => {
    setForm({ ...form, [key]: value });
    setMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      await adminApi.registerStudent(form);
      setMsg('✅ Student application created successfully!');
      setTimeout(() => navigate('/admin/applications'), 1500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMsg('❌ ' + (e.response?.data?.message || 'Failed to register student.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdminOrChief) {
    return (
      <div className="approvals-page animate-fade-in-up">
        <div className="table-empty"><p>Access denied. Admin or Chief Warden role required.</p></div>
      </div>
    );
  }

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <button className="btn-action btn-action--view" onClick={() => navigate('/admin/students')} style={{ marginRight: 8 }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="approvals-page__title">Register Student</h1>
          <p className="approvals-page__subtitle">Manual student registration (creates pending application)</p>
        </div>
      </div>

      {msg && <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 6, background: msg.startsWith('✅') ? '#d1fae5' : '#fee2e2', color: msg.startsWith('✅') ? '#15803d' : '#dc2626', fontSize: '0.875rem' }}>{msg}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <Card variant="default" padding="lg" style={{ gridColumn: 'span 2' }}>
          <p className="detail-section__title">Personal Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Full Name *</label><input className="filter-input" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Roll Number *</label><input className="filter-input" value={form.rollNumber} onChange={(e) => handleChange('rollNumber', e.target.value)} required /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Student Number</label><input className="filter-input" value={form.studentNumber} onChange={(e) => handleChange('studentNumber', e.target.value)} /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Email *</label><input className="filter-input" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} required /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Password *</label><input className="filter-input" type="password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} required /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Phone *</label><input className="filter-input" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} required /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Gender *</label><select className="filter-select" value={form.gender} onChange={(e) => handleChange('gender', e.target.value)} required>{GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</select></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Date of Birth</label><input className="filter-input" type="date" value={form.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Blood Group</label><input className="filter-input" value={form.bloodGroup} onChange={(e) => handleChange('bloodGroup', e.target.value)} /></div>
            <div style={{ gridColumn: 'span 2'}}><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Residential Address *</label><input className="filter-input" value={form.address} onChange={(e) => handleChange('address', e.target.value)} required /></div>
          </div>
        </Card>

        <Card variant="default" padding="lg" style={{ gridColumn: 'span 2' }}>
          <p className="detail-section__title">Academic Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Department *</label><select className="filter-select" value={form.departmentId} onChange={(e) => handleChange('departmentId', e.target.value)} required><option value="">Select department</option>{departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}</select></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Course *</label><select className="filter-select" value={form.courseId} onChange={(e) => handleChange('courseId', e.target.value)} required><option value="">Select course</option>{courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Year of Study *</label><select className="filter-select" value={form.year} onChange={(e) => handleChange('year', Number(e.target.value))} required>{[1,2,3,4,5,6].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Semester *</label><input className="filter-input" value={form.semester} onChange={(e) => handleChange('semester', e.target.value)} required /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Admission Year *</label><input className="filter-input" type="number" value={form.admissionYear} onChange={(e) => handleChange('admissionYear', Number(e.target.value))} required /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Academic Session</label><input className="filter-input" value={form.academicSession} onChange={(e) => handleChange('academicSession', e.target.value)} /></div>
            <div style={{ gridColumn: 'span 2'}}><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Admission Number</label><input className="filter-input" value={form.admissionNumber} onChange={(e) => handleChange('admissionNumber', e.target.value)} /></div>
          </div>
        </Card>

        <Card variant="default" padding="lg">
          <p className="detail-section__title">Father's Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Name</label><input className="filter-input" value={form.fatherName} onChange={(e) => handleChange('fatherName', e.target.value)} /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Email</label><input className="filter-input" type="email" value={form.fatherEmail} onChange={(e) => handleChange('fatherEmail', e.target.value)} /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Phone</label><input className="filter-input" value={form.fatherPhone} onChange={(e) => handleChange('fatherPhone', e.target.value)} /></div>
          </div>
        </Card>

        <Card variant="default" padding="lg">
          <p className="detail-section__title">Mother's Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Name</label><input className="filter-input" value={form.motherName} onChange={(e) => handleChange('motherName', e.target.value)} /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Email</label><input className="filter-input" type="email" value={form.motherEmail} onChange={(e) => handleChange('motherEmail', e.target.value)} /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Phone</label><input className="filter-input" value={form.motherPhone} onChange={(e) => handleChange('motherPhone', e.target.value)} /></div>
          </div>
        </Card>

        <Card variant="default" padding="lg" style={{ gridColumn: 'span 2' }}>
          <p className="detail-section__title">Parent / Guardian Address</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Address Line 1</label><input className="filter-input" value={form.guardianAddressLine1} onChange={(e) => handleChange('guardianAddressLine1', e.target.value)} /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Address Line 2</label><input className="filter-input" value={form.guardianAddressLine2} onChange={(e) => handleChange('guardianAddressLine2', e.target.value)} /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>City</label><input className="filter-input" value={form.guardianCity} onChange={(e) => handleChange('guardianCity', e.target.value)} /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>State</label><input className="filter-input" value={form.guardianState} onChange={(e) => handleChange('guardianState', e.target.value)} /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>PIN Code</label><input className="filter-input" value={form.guardianPincode} onChange={(e) => handleChange('guardianPincode', e.target.value)} /></div>
            <div><label style={{ display: 'block', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.25rem' }}>Country</label><input className="filter-input" value={form.guardianCountry} onChange={(e) => handleChange('guardianCountry', e.target.value)} /></div>
          </div>
        </Card>

        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/admin/students')}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Creating…' : 'Register Student'}</button>
        </div>
      </form>
    </div>
  );
}



