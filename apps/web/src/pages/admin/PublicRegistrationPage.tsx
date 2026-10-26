/**
 * Public Student Registration Page
 * Accessible WITHOUT authentication via a shareable link.
 * Anyone with the link can submit — admin approves/rejects afterwards.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { adminApi } from '@/services/admin.service';

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const inp: React.CSSProperties = {
  width: '100%', padding: '0.625rem 0.875rem',
  border: `1.5px solid var(--border-primary)`, borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-md)',
  outline: 'none', background: 'var(--color-neutral-0)', color: 'var(--text-primary)',
  transition: 'border-color 0.15s', boxSizing: 'border-box',
};

function Field({ label, required, span2 = false, children }: {
  label: string; required?: boolean; span2?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ gridColumn: span2 ? 'span 2' : 'span 1' }}>
      <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
        {label}{required && <span style={{ color: 'var(--color-error-500)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-neutral-0)', borderRadius: 'var(--radius-xl)', padding: '1.75rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow-md)', border: `1.5px solid var(--border-secondary)` }}>
      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)', borderBottom: `2px solid var(--border-secondary)`, paddingBottom: '0.625rem', marginBottom: '1.25rem', marginTop: 0 }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        {children}
      </div>
    </div>
  );
}

export function PublicRegistrationPage() {
  const { token } = useParams<{ token: string }>();

  const [config, setConfig] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [form, setForm] = useState({
    fullName: '', studentNumber: '', admissionNumber: '', dateOfBirth: '',
    gender: 'male', bloodGroup: '', phoneNumber: '', email: '',
    city: '', residentialAddress: '',
    departmentId: '', courseId: '',
    yearOfStudy: 1, semester: '', admissionYear: new Date().getFullYear(),
    academicSession: '',
    fatherName: '', fatherEmail: '', fatherPhone: '',
    motherName: '', motherEmail: '', motherPhone: '',
    guardianAddressLine1: '', guardianAddressLine2: '',
    guardianCity: '', guardianState: '', guardianPincode: '', guardianCountry: '',
  });

  const set = (key: string, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const isRequired = (field: string) => {
    if (!config?.requiredFields?.length) return true;
    return config.requiredFields.includes(field);
  };

  // Fetch config + departments + courses in parallel — no auth required
  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      const [cfg, depts, crss] = await Promise.all([
        adminApi.getPublicFormConfig(token),
        adminApi.getDepartments({ page: 1, limit: 100 }),
        adminApi.getCourses({ page: 1, limit: 100 }),
      ]);
      setConfig(cfg);
      setDepartments(depts.data);
      setCourses(crss.data);
      setForm(prev => ({ ...prev, academicSession: cfg.academicSession || '' }));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'This form is not available or has expired.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await adminApi.submitPublicRegistration(token!, form);
      setApplicationNumber(result.applicationNumber || result.application?.applicationNumber || '');
      setSubmitted(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Submission failed. Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-neutral-50)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: `4px solid var(--border-primary)`, borderTopColor: 'var(--color-primary-600)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-md)', margin: 0 }}>Loading registration form…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── Not found ────────────────────────────────────────────────────────────
  if (!config) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-neutral-50)', padding: '2rem' }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center', background: 'var(--color-neutral-0)', borderRadius: 'var(--radius-2xl)', padding: '3rem 2rem', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ fontSize: 52, marginBottom: '1.25rem' }}>🔒</div>
        <h2 style={{ margin: '0 0 0.75rem', color: 'var(--text-primary)', fontSize: 'var(--font-size-2xl)' }}>Form Unavailable</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-md)', margin: 0, lineHeight: 1.6 }}>
          {error || 'This registration link is invalid, has expired, or is no longer accepting submissions.'}
        </p>
      </div>
    </div>
  );

  // ── Success ──────────────────────────────────────────────────────────────
  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--color-success-50) 0%, var(--color-success-100) 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: 520, width: '100%', background: 'var(--color-neutral-0)', borderRadius: 'var(--radius-2xl)', padding: '3rem 2.5rem', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-success-500), var(--color-success-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', color: '#fff', fontWeight: 800 }}>✓</div>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: 'var(--font-size-2xl)', color: 'var(--text-primary)', fontWeight: 'var(--font-weight-extrabold)' }}>Application Submitted!</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: 'var(--font-size-md)', lineHeight: 1.6 }}>
          Your hostel registration application has been submitted and is now pending review.
        </p>
        <div style={{ background: 'var(--color-success-50)', border: `1.5px solid var(--color-success-100)`, borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem', marginBottom: '1.75rem' }}>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-success-700)', fontWeight: 'var(--font-weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Application Reference</p>
          <p style={{ margin: '0.375rem 0 0', fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-extrabold)', color: 'var(--color-success-600)', letterSpacing: '1px' }}>{applicationNumber}</p>
        </div>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', margin: 0, lineHeight: 1.6 }}>
          Save this reference number. The hostel administration will review your application and inform you of the decision.
        </p>
      </div>
    </div>
  );

  // ── Main Form ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-neutral-50)', fontFamily: 'var(--font-family)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: var(--border-focus) !important; box-shadow: var(--shadow-focus); outline: none; }
        @media (max-width: 580px) {
          .pub-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Hero Header ── */}
      <div style={{ background: 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-700) 100%)', padding: '2.5rem 1.5rem 3.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-full)', padding: '0.4rem 1.125rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: 18 }}>🏠</span>
            <span style={{ color: 'var(--text-inverse)', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', letterSpacing: '1px', textTransform: 'uppercase' }}>Hostel Registration Portal</span>
          </div>
          <h1 style={{ margin: '0 0 0.875rem', color: 'var(--text-inverse)', fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 'var(--font-weight-extrabold)', lineHeight: 1.2 }}>
            {config.title}
          </h1>
          {config.description && (
            <p style={{ color: 'rgba(255,255,255,0.82)', margin: '0 0 1.25rem', fontSize: 'var(--font-size-md)', lineHeight: 1.6, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
              {config.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {config.academicSession && (
              <span style={{ background: 'rgba(255,255,255,0.18)', color: 'var(--text-inverse)', borderRadius: 'var(--radius-full)', padding: '0.3rem 0.875rem', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                📅 Session: {config.academicSession}
              </span>
            )}
            {config.expiresAt && (
              <span style={{ background: 'rgba(255,255,255,0.18)', color: 'var(--text-inverse)', borderRadius: 'var(--radius-full)', padding: '0.3rem 0.875rem', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                ⏳ Closes: {new Date(config.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
            {config.submissionLimit && (
              <span style={{ background: 'rgba(255,255,255,0.18)', color: 'var(--text-inverse)', borderRadius: 'var(--radius-full)', padding: '0.3rem 0.875rem', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                👥 Limit: {config.submissionLimit} seats
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} style={{ maxWidth: 780, margin: '-1.5rem auto 0', padding: '0 1rem 4rem' }}>

        {/* Personal Info */}
        <Section title="👤 Personal Information">
          <Field label="Full Name" required={isRequired('fullName')}>
            <input style={inp} value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. Rahul Sharma" required={isRequired('fullName')} />
          </Field>
          <Field label="Student / Roll Number" required={isRequired('studentNumber')}>
            <input style={inp} value={form.studentNumber} onChange={e => set('studentNumber', e.target.value)} placeholder="e.g. STU2024001" required={isRequired('studentNumber')} />
          </Field>
          <Field label="Email Address" required={isRequired('email')}>
            <input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" required={isRequired('email')} />
          </Field>
          <Field label="Phone Number" required={isRequired('phoneNumber')}>
            <input style={inp} value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)} placeholder="10-digit mobile number" maxLength={10} required={isRequired('phoneNumber')} />
          </Field>
          <Field label="Gender" required={isRequired('gender')}>
            <select style={inp} value={form.gender} onChange={e => set('gender', e.target.value)} required={isRequired('gender')}>
              {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
          <Field label="Date of Birth">
            <input style={inp} type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
          </Field>
          <Field label="Blood Group">
            <select style={inp} value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
              <option value="">Select blood group</option>
              {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Admission Number">
            <input style={inp} value={form.admissionNumber} onChange={e => set('admissionNumber', e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Residential Address" required={isRequired('residentialAddress')} span2>
            <input style={inp} value={form.residentialAddress} onChange={e => set('residentialAddress', e.target.value)} placeholder="Full home address" required={isRequired('residentialAddress')} />
          </Field>
          <Field label="City" required={isRequired('city')}>
            <input style={inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Your city" required={isRequired('city')} />
          </Field>
        </Section>

        {/* Academic */}
        <Section title="🎓 Academic Details">
          <Field label="Department" required={isRequired('departmentId')}>
            <select style={inp} value={form.departmentId} onChange={e => set('departmentId', e.target.value)} required={isRequired('departmentId')}>
              <option value="">Select department</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Course / Programme" required={isRequired('courseId')}>
            <select style={inp} value={form.courseId} onChange={e => set('courseId', e.target.value)} required={isRequired('courseId')}>
              <option value="">Select course</option>
              {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Year of Study" required={isRequired('yearOfStudy')}>
            <select style={inp} value={form.yearOfStudy} onChange={e => set('yearOfStudy', Number(e.target.value))} required={isRequired('yearOfStudy')}>
              {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </Field>
          <Field label="Semester" required={isRequired('semester')}>
            <select style={inp} value={form.semester} onChange={e => set('semester', e.target.value)} required={isRequired('semester')}>
              <option value="">Select semester</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
            </select>
          </Field>
          <Field label="Admission Year" required={isRequired('admissionYear')}>
            <input style={inp} type="number" value={form.admissionYear} onChange={e => set('admissionYear', Number(e.target.value))} min={2000} max={2100} required={isRequired('admissionYear')} />
          </Field>
          <Field label="Academic Session">
            <input style={inp} value={form.academicSession} onChange={e => set('academicSession', e.target.value)} placeholder="e.g. 2024-25" />
          </Field>
        </Section>

        {/* Parent/Guardian */}
        <Section title="👨‍👩‍👧 Parent / Guardian Details">
          <Field label="Father's Name">
            <input style={inp} value={form.fatherName} onChange={e => set('fatherName', e.target.value)} placeholder="Father's full name" />
          </Field>
          <Field label="Father's Phone">
            <input style={inp} value={form.fatherPhone} onChange={e => set('fatherPhone', e.target.value)} placeholder="10-digit number" maxLength={10} />
          </Field>
          <Field label="Father's Email">
            <input style={inp} type="email" value={form.fatherEmail} onChange={e => set('fatherEmail', e.target.value)} placeholder="father@email.com" />
          </Field>
          <div />
          <Field label="Mother's Name">
            <input style={inp} value={form.motherName} onChange={e => set('motherName', e.target.value)} placeholder="Mother's full name" />
          </Field>
          <Field label="Mother's Phone">
            <input style={inp} value={form.motherPhone} onChange={e => set('motherPhone', e.target.value)} placeholder="10-digit number" maxLength={10} />
          </Field>
          <Field label="Mother's Email">
            <input style={inp} type="email" value={form.motherEmail} onChange={e => set('motherEmail', e.target.value)} placeholder="mother@email.com" />
          </Field>
        </Section>

        {/* Guardian Address */}
        <Section title="🏡 Guardian Address (Optional)">
          <Field label="Address Line 1" span2>
            <input style={inp} value={form.guardianAddressLine1} onChange={e => set('guardianAddressLine1', e.target.value)} placeholder="Street / locality" />
          </Field>
          <Field label="Address Line 2" span2>
            <input style={inp} value={form.guardianAddressLine2} onChange={e => set('guardianAddressLine2', e.target.value)} placeholder="Area / landmark" />
          </Field>
          <Field label="City">
            <input style={inp} value={form.guardianCity} onChange={e => set('guardianCity', e.target.value)} />
          </Field>
          <Field label="State">
            <input style={inp} value={form.guardianState} onChange={e => set('guardianState', e.target.value)} />
          </Field>
          <Field label="PIN Code">
            <input style={inp} value={form.guardianPincode} onChange={e => set('guardianPincode', e.target.value)} maxLength={6} />
          </Field>
          <Field label="Country">
            <input style={inp} value={form.guardianCountry} onChange={e => set('guardianCountry', e.target.value)} placeholder="India" />
          </Field>
        </Section>

        {/* Error */}
        {error && (
          <div style={{ background: 'var(--color-error-50)', border: `1.5px solid var(--color-error-100)`, borderRadius: 'var(--radius-lg)', padding: '0.875rem 1rem', marginBottom: '1.25rem', color: 'var(--color-error-600)', fontSize: 'var(--font-size-sm)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0 }}>⚠️</span> {error}
          </div>
        )}

        {/* Submit */}
        <div style={{ background: 'var(--color-neutral-0)', borderRadius: 'var(--radius-xl)', padding: '1.75rem', boxShadow: 'var(--shadow-md)', border: `1.5px solid var(--border-primary)`, textAlign: 'center' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            By submitting this form, you confirm that all information provided is accurate.
            Your application will be reviewed by the hostel administration.
          </p>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? 'var(--color-primary-300)' : 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-700) 100%)',
              color: '#fff', border: 'none', borderRadius: 'var(--radius-lg)',
              padding: '0.9rem 2.75rem', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: submitting ? 'none' : '0 4px 16px rgba(38,39,43,0.3)',
              letterSpacing: '0.25px',
            }}
          >
            {submitting ? '⏳  Submitting…' : '📤  Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
}
