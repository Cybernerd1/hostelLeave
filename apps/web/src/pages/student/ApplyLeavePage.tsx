/**
 * Apply Leave Page
 *
 * Leave application form modelled after the official AKGEC
 * Hostel Leave Application Form template.
 *
 * Fields (per template):
 *  1. Student name + roll number (auto-filled from profile)
 *  2. Course/Branch + Year     (auto-filled)
 *  3. Hostel name + Room No.   (auto-filled)
 *  4. Period of leave (days), From Date, To Date, Time Out
 *  5. Reason for leave
 *  6. Name of person being visited + Relation
 *  7. Address & contact of person being visited
 *  8. Applicant mobile (auto-filled) + Parent mobile
 *  9. Leave type
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import './ApplyLeavePage.css';

/* ─── Types ─────────────────────────────────────────────────────── */
interface StudentProfile {
  name: string;
  rollNumber?: string;
  phone?: string;
  year?: number;
  semester?: string;
  departmentId?: { name: string };
  courseId?: { name: string; code?: string };
  hostelId?: { name: string };
  roomId?: { roomNumber: string };
  parentId?: { phone?: string; name?: string };
}

const LEAVE_TYPES = [
  { value: 'home_visit', label: 'Home Visit' },
  { value: 'medical',    label: 'Medical Leave' },
  { value: 'emergency',  label: 'Emergency Leave' },
  { value: 'function',   label: 'Function / Event' },
  { value: 'academic',   label: 'Academic Purpose' },
  { value: 'personal',   label: 'Personal Leave' },
  { value: 'other',      label: 'Other' },
];

const RELATIONS = ['Father', 'Mother', 'Guardian', 'Relative', 'Friend'];

function calcDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const d1 = new Date(from);
  const d2 = new Date(to);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 < d1) return 0;
  return Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
}

/* ─── Component ─────────────────────────────────────────────────── */
export function ApplyLeavePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Profile state
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Form state
  const [leaveType, setLeaveType]                     = useState('home_visit');
  const [fromDate, setFromDate]                       = useState('');
  const [toDate, setToDate]                           = useState('');
  const [timeOut, setTimeOut]                         = useState('');
  const [reason, setReason]                           = useState('');
  const [destination, setDestination]                 = useState('');
  const [visitPersonName, setVisitPersonName]         = useState('');
  const [visitPersonRelation, setVisitPersonRelation] = useState('Father');
  const [visitAddress, setVisitAddress]               = useState('');
  const [visitContact, setVisitContact]               = useState('');
  const [parentMobile, setParentMobile]               = useState('');
  const [documents, setDocuments]                     = useState<File[]>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [submitError, setSubmitError]   = useState('');
  const [success, setSuccess]           = useState(false);
  const [leaveId, setLeaveId]           = useState('');

  const days = calcDays(fromDate, toDate);

  // Load student profile
  useEffect(() => {
    // Load student profile via /auth/me which includes student sub-profile
    const load = async () => {
      try {
        const res = await api.get<{
          success: boolean;
          data: {
            name: string;
            phone?: string;
            profile: StudentProfile | null;
          };
        }>('/auth/me');
        const data = res.data.data;
        const p = data.profile;
        if (p) {
          setProfile({ ...p, phone: p.phone ?? data.phone ?? '', name: p.name ?? data.name });
          if (p.parentId?.phone) setParentMobile(p.parentId.phone);
        } else {
          setProfile({ name: data.name, phone: data.phone ?? '' } as StudentProfile);
        }
      } catch {
        // non-fatal
      } finally {
        setProfileLoading(false);
      }
    };
    load();

  }, []);

  // Validation
  const validate = () => {
    const e: Record<string, string> = {};
    if (!leaveType)      e.leaveType  = 'Select a leave type';
    if (!fromDate)       e.fromDate   = 'From date is required';
    if (!toDate)         e.toDate     = 'To date is required';
    if (days < 1)        e.toDate     = 'To date must be on or after from date';
    if (!reason.trim() || reason.trim().length < 10)
                         e.reason     = 'Reason must be at least 10 characters';
    if (!destination.trim() || destination.trim().length < 3)
                         e.destination = 'Destination is required (min 3 chars)';
    if (!visitPersonName.trim()) e.visitPersonName = 'Name of person being visited is required';
    if (!visitAddress.trim())    e.visitAddress    = 'Address is required';
    if (!visitContact.trim())    e.visitContact    = 'Contact number is required';

    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (fromDate && new Date(fromDate) < today)
                         e.fromDate   = 'From date cannot be in the past';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('leaveType',   leaveType);
      formData.append('fromDate',    fromDate);
      formData.append('toDate',      toDate);
      formData.append('reason',      reason.trim());
      // destination includes extra template info
      const fullDestination = `${destination.trim()}${visitPersonName ? ` (${visitPersonName}, ${visitPersonRelation})` : ''}`;
      formData.append('destination', fullDestination);

      documents.forEach((file) => formData.append('documents', file));

      const res = await api.post<{ success: boolean; data: { leaveId: string } }>(
        '/leaves',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      setLeaveId(res.data.data.leaveId);
      setSuccess(true);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setSubmitError(axiosErr.response?.data?.message || 'Failed to submit leave request');
      } else {
        setSubmitError('Network error. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  /* ─── Success Screen ──────────────────────────────────────────── */
  if (success) {
    return (
      <div className="apply-leave__success">
        <div className="apply-leave__success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2>Leave Application Submitted!</h2>
        <p>Your application <strong>{leaveId}</strong> has been submitted and is pending parent approval.</p>
        <div className="apply-leave__success-actions">
          <button className="apply-leave__btn apply-leave__btn--primary" onClick={() => navigate('/student/leaves')}>
            View My Leaves
          </button>
          <button className="apply-leave__btn apply-leave__btn--secondary" onClick={() => { setSuccess(false); setLeaveId(''); }}>
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  /* ─── Form ────────────────────────────────────────────────────── */
  return (
    <div className="apply-leave">
      {/* Official Form Header */}
      <div className="apply-leave__form-header">
        <div className="apply-leave__college-logo">
          <svg viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
            <path d="M24 10 L38 20 L38 34 L24 42 L10 34 L10 20 Z" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M24 22 L30 26 L30 34 L24 38 L18 34 L18 26 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
        <div className="apply-leave__college-info">
          <h1 className="apply-leave__college-name">HOSTEL LEAVE APPLICATION FORM</h1>
          <p className="apply-leave__college-subtitle">Hostel Leave Management System</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="apply-leave__form" noValidate>

        {submitError && (
          <div className="apply-leave__alert apply-leave__alert--error" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {submitError}
          </div>
        )}

        {/* ── Section 1–3: Student Info (auto-filled) ────────────── */}
        <div className="apply-leave__section">
          <h2 className="apply-leave__section-title">Student Information</h2>
          {profileLoading ? (
            <div className="apply-leave__profile-loading">
              <div className="apply-leave__spinner" /> Loading your profile…
            </div>
          ) : (
            <div className="apply-leave__info-grid">
              <div className="apply-leave__info-row">
                <div className="apply-leave__info-field">
                  <span className="apply-leave__info-label">1. Name of Student</span>
                  <span className="apply-leave__info-value">{profile?.name || user?.name || '—'}</span>
                </div>
                <div className="apply-leave__info-field">
                  <span className="apply-leave__info-label">Student No.</span>
                  <span className="apply-leave__info-value">{profile?.rollNumber || '—'}</span>
                </div>
              </div>
              <div className="apply-leave__info-row">
                <div className="apply-leave__info-field">
                  <span className="apply-leave__info-label">2. Course / Branch</span>
                  <span className="apply-leave__info-value">{profile?.courseId?.name || '—'} — {profile?.departmentId?.name || '—'}</span>
                </div>
                <div className="apply-leave__info-field">
                  <span className="apply-leave__info-label">Year</span>
                  <span className="apply-leave__info-value">{profile?.year ? `${profile.year} (${profile.semester} Sem)` : '—'}</span>
                </div>
              </div>
              <div className="apply-leave__info-row">
                <div className="apply-leave__info-field">
                  <span className="apply-leave__info-label">3. Hostel Name</span>
                  <span className="apply-leave__info-value">{profile?.hostelId?.name || '—'}</span>
                </div>
                <div className="apply-leave__info-field">
                  <span className="apply-leave__info-label">Room No.</span>
                  <span className="apply-leave__info-value">{profile?.roomId?.roomNumber || '—'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 4: Period of Leave ─────────────────────────── */}
        <div className="apply-leave__section">
          <h2 className="apply-leave__section-title">4. Period of Leave</h2>
          <div className="apply-leave__period-row">
            <div className="apply-leave__field-group">
              <label className="apply-leave__label" htmlFor="from-date">From Date <span className="apply-leave__required">*</span></label>
              <input
                id="from-date" type="date" className={`apply-leave__input ${errors.fromDate ? 'apply-leave__input--error' : ''}`}
                value={fromDate} min={today}
                onChange={(e) => setFromDate(e.target.value)}
              />
              {errors.fromDate && <span className="apply-leave__error-msg">{errors.fromDate}</span>}
            </div>
            <div className="apply-leave__field-group">
              <label className="apply-leave__label" htmlFor="to-date">To Date <span className="apply-leave__required">*</span></label>
              <input
                id="to-date" type="date" className={`apply-leave__input ${errors.toDate ? 'apply-leave__input--error' : ''}`}
                value={toDate} min={fromDate || today}
                onChange={(e) => setToDate(e.target.value)}
              />
              {errors.toDate && <span className="apply-leave__error-msg">{errors.toDate}</span>}
            </div>
            <div className="apply-leave__field-group">
              <label className="apply-leave__label" htmlFor="time-out">Time Out</label>
              <input
                id="time-out" type="time" className="apply-leave__input"
                value={timeOut} onChange={(e) => setTimeOut(e.target.value)}
              />
            </div>
            <div className="apply-leave__field-group apply-leave__field-group--days">
              <label className="apply-leave__label">Period (Days)</label>
              <div className="apply-leave__days-badge">{days > 0 ? days : '—'}</div>
            </div>
          </div>
        </div>

        {/* ── Section 5: Leave Type ──────────────────────────────── */}
        <div className="apply-leave__section">
          <h2 className="apply-leave__section-title">5. Leave Type <span className="apply-leave__required">*</span></h2>
          <div className="apply-leave__leave-type-grid">
            {LEAVE_TYPES.map((lt) => (
              <label key={lt.value} className={`apply-leave__type-card ${leaveType === lt.value ? 'apply-leave__type-card--active' : ''}`}>
                <input type="radio" name="leaveType" value={lt.value} checked={leaveType === lt.value} onChange={() => setLeaveType(lt.value)} />
                {lt.label}
              </label>
            ))}
          </div>
          {errors.leaveType && <span className="apply-leave__error-msg">{errors.leaveType}</span>}
        </div>

        {/* ── Section 6: Reason for Leave ────────────────────────── */}
        <div className="apply-leave__section">
          <h2 className="apply-leave__section-title">6. Reason for Leave <span className="apply-leave__required">*</span> <small>(State Clearly)</small></h2>
          <textarea
            id="reason"
            className={`apply-leave__textarea ${errors.reason ? 'apply-leave__input--error' : ''}`}
            rows={3}
            placeholder="Please state your reason clearly…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
          />
          <div className="apply-leave__char-count">{reason.length}/1000</div>
          {errors.reason && <span className="apply-leave__error-msg">{errors.reason}</span>}
        </div>

        {/* ── Section 7–8: Person Being Visited ─────────────────── */}
        <div className="apply-leave__section">
          <h2 className="apply-leave__section-title">Person Being Visited</h2>
          <div className="apply-leave__two-col">
            <div className="apply-leave__field-group apply-leave__field-group--grow">
              <label className="apply-leave__label" htmlFor="visit-name">
                7. Name of person being visited <span className="apply-leave__required">*</span>
              </label>
              <input
                id="visit-name" type="text"
                className={`apply-leave__input ${errors.visitPersonName ? 'apply-leave__input--error' : ''}`}
                placeholder="e.g. Rajesh Sharma"
                value={visitPersonName}
                onChange={(e) => setVisitPersonName(e.target.value)}
              />
              {errors.visitPersonName && <span className="apply-leave__error-msg">{errors.visitPersonName}</span>}
            </div>
            <div className="apply-leave__field-group">
              <label className="apply-leave__label" htmlFor="visit-relation">Relation</label>
              <select
                id="visit-relation" className="apply-leave__input apply-leave__select"
                value={visitPersonRelation}
                onChange={(e) => setVisitPersonRelation(e.target.value)}
              >
                {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="apply-leave__field-group" style={{ marginTop: '12px' }}>
            <label className="apply-leave__label" htmlFor="destination">
              Destination / Place to visit <span className="apply-leave__required">*</span>
            </label>
            <input
              id="destination" type="text"
              className={`apply-leave__input ${errors.destination ? 'apply-leave__input--error' : ''}`}
              placeholder="e.g. Mumbai, Maharashtra"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
            {errors.destination && <span className="apply-leave__error-msg">{errors.destination}</span>}
          </div>
          <div className="apply-leave__field-group" style={{ marginTop: '12px' }}>
            <label className="apply-leave__label" htmlFor="visit-address">
              8. Address & Contact No. of person being visited <span className="apply-leave__required">*</span>
            </label>
            <div className="apply-leave__two-col" style={{ gap: '12px' }}>
              <input
                id="visit-address" type="text"
                className={`apply-leave__input ${errors.visitAddress ? 'apply-leave__input--error' : ''}`}
                placeholder="Full address"
                value={visitAddress}
                onChange={(e) => setVisitAddress(e.target.value)}
              />
              <input
                type="tel"
                className={`apply-leave__input ${errors.visitContact ? 'apply-leave__input--error' : ''}`}
                placeholder="Contact number"
                value={visitContact}
                onChange={(e) => setVisitContact(e.target.value)}
              />
            </div>
            {(errors.visitAddress || errors.visitContact) && (
              <span className="apply-leave__error-msg">{errors.visitAddress || errors.visitContact}</span>
            )}
          </div>
        </div>

        {/* ── Section 9–10: Mobile Numbers ───────────────────────── */}
        <div className="apply-leave__section">
          <h2 className="apply-leave__section-title">Contact Information</h2>
          <div className="apply-leave__two-col">
            <div className="apply-leave__field-group apply-leave__field-group--grow">
              <label className="apply-leave__label">9. Applicant's Mobile No.</label>
              <input
                type="tel" className="apply-leave__input apply-leave__input--readonly"
                value={profile?.phone || '—'} readOnly
              />
            </div>
            <div className="apply-leave__field-group apply-leave__field-group--grow">
              <label className="apply-leave__label" htmlFor="parent-mobile">10. Parent's Mobile No.</label>
              <input
                id="parent-mobile" type="tel" className="apply-leave__input"
                placeholder="Parent's contact number"
                value={parentMobile}
                onChange={(e) => setParentMobile(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Supporting Documents ────────────────────────────────── */}
        <div className="apply-leave__section">
          <h2 className="apply-leave__section-title">Supporting Documents <small>(optional)</small></h2>
          <label className="apply-leave__upload-area" htmlFor="documents">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {documents.length === 0
              ? <span>Click to upload PDF, JPG, PNG (max 5 MB each)</span>
              : <span>{documents.map(f => f.name).join(', ')}</span>
            }
            <input
              id="documents" type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
              className="apply-leave__upload-input"
              onChange={(e) => setDocuments(Array.from(e.target.files || []))}
            />
          </label>
        </div>

        {/* ── Preview Summary ─────────────────────────────────────── */}
        {days > 0 && (
          <div className="apply-leave__preview">
            <h3>Application Summary</h3>
            <div className="apply-leave__preview-grid">
              <div><span>Leave Type</span><strong>{LEAVE_TYPES.find(l => l.value === leaveType)?.label}</strong></div>
              <div><span>Duration</span><strong>{days} day(s)</strong></div>
              <div><span>From</span><strong>{fromDate}</strong></div>
              <div><span>To</span><strong>{toDate}</strong></div>
              <div><span>Visiting</span><strong>{visitPersonName || '—'} ({visitPersonRelation})</strong></div>
              <div><span>Destination</span><strong>{destination || '—'}</strong></div>
            </div>
          </div>
        )}

        {/* ── Submit ─────────────────────────────────────────────── */}
        <div className="apply-leave__form-footer">
          <p className="apply-leave__disclaimer">
            * By submitting this form, I confirm that the information provided is accurate and I
            agree to abide by the hostel leave regulations.
          </p>
          <div className="apply-leave__form-actions">
            <button type="button" className="apply-leave__btn apply-leave__btn--secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button
              type="submit"
              className="apply-leave__btn apply-leave__btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><div className="apply-leave__btn-spinner" /> Submitting…</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Submit Leave Application
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
