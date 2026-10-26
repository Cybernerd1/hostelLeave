/**
 * Admin: Application Detail Page
 * View application details and approve/reject.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi, type ApplicationRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import '../shared/ApprovalsPage.css';
import './AdminPages.css';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'pending' },
  under_review: { label: 'Under Review', color: 'pending' },
  approved: { label: 'Approved', color: 'approved' },
  rejected: { label: 'Rejected', color: 'rejected' },
  allocated: { label: 'Allocated', color: 'success' },
};

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminApi.getApplicationById(id)
      .then(setApplication)
      .catch(() => setApplication(null))
      .finally(() => setLoading(false));
  }, [id]);

  const status = application ? (STATUS_CONFIG[application.status] || { label: application.status, color: 'neutral' }) : null;

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!id) return;
    setSubmitting(true);
    setMsg(null);

    let rejectionReason = '';
    let reviewNotes = '';

    if (action === 'reject') {
      rejectionReason = window.prompt('Please enter a reason for rejection:');
      if (rejectionReason === null || rejectionReason.trim() === '') {
        setSubmitting(false);
        setMsg('Rejection reason is required.');
        return;
      }
      rejectionReason = rejectionReason.trim();
    } else {
      reviewNotes = window.prompt('Enter review notes (optional):') || '';
    }

    try {
      await adminApi.approveRejectApplication(id, {
        action,
        reviewNotes,
        rejectionReason: action === 'reject' ? rejectionReason : undefined,
      });
      setMsg(`✅ Application ${action}d successfully!`);
      setTimeout(() => navigate('/admin/applications'), 1500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMsg('❌ ' + (e.response?.data?.message || 'Failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="table-empty"><div className="spinner" /></div>;
  if (!application) return <div className="table-empty"><p>Application not found.</p></div>;

  const canAct = application.status === 'pending' || application.status === 'under_review';

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <button className="btn-action btn-action--view" onClick={() => navigate('/admin/applications')} style={{ marginRight: 8 }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="approvals-page__title">Application Details</h1>
          <p className="approvals-page__subtitle">{application.applicationNumber}</p>
        </div>
      </div>

      {msg && <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 6, background: msg.startsWith('✅') ? '#d1fae5' : '#fee2e2', color: msg.startsWith('✅') ? '#15803d' : '#dc2626', fontSize: '0.875rem' }}>{msg}</div>}

      <div className="detail-grid">
        {/* Application Info */}
        <Card variant="default" padding="lg">
          <div className="detail-section">
            <p className="detail-section__title">Application Information</p>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Application Number</span><span className="detail-value">{application.applicationNumber}</span></div>
              <div className="detail-row"><span className="detail-label">Status</span><span className={`status-badge status-badge--${status?.color}`}>{status?.label}</span></div>
              <div className="detail-row"><span className="detail-label">Source</span><span className="detail-value">{application.source}</span></div>
              <div className="detail-row"><span className="detail-label">Submitted</span><span className="detail-value">{new Date(application.createdAt).toLocaleDateString()}</span></div>
              {application.reviewedAt && <div className="detail-row"><span className="detail-label">Reviewed At</span><span className="detail-value">{new Date(application.reviewedAt).toLocaleDateString()}</span></div>}
              {application.reviewedBy && <div className="detail-row"><span className="detail-label">Reviewed By</span><span className="detail-value">{application.reviewedBy.name}</span></div>}
              {application.reviewNotes && <div className="detail-row"><span className="detail-label">Review Notes</span><span className="detail-value">{application.reviewNotes}</span></div>}
              {application.rejectionReason && <div className="detail-row"><span className="detail-label">Rejection Reason</span><span className="detail-value" style={{ color: '#dc2626' }}>{application.rejectionReason}</span></div>}
            </div>
          </div>
        </Card>

        {/* Student Details */}
        <Card variant="default" padding="lg">
          <div className="detail-section">
            <p className="detail-section__title">Personal Details</p>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Full Name</span><span className="detail-value">{application.fullName}</span></div>
              <div className="detail-row"><span className="detail-label">Student Number</span><span className="detail-value">{application.studentNumber}</span></div>
              <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{application.email}</span></div>
              <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{application.phoneNumber}</span></div>
              <div className="detail-row"><span className="detail-label">Gender</span><span className="detail-value">{application.gender}</span></div>
              <div className="detail-row"><span className="detail-label">Blood Group</span><span className="detail-value">{application.bloodGroup || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">City</span><span className="detail-value">{application.city}</span></div>
              <div className="detail-row"><span className="detail-label">Residential Address</span><span className="detail-value">{application.residentialAddress}</span></div>
            </div>
          </div>

          <div className="detail-section">
            <p className="detail-section__title">Academic Details</p>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Department</span><span className="detail-value">{(application.departmentId as unknown as { name: string })?.name || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Course</span><span className="detail-value">{(application.courseId as unknown as { name: string })?.name || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Year of Study</span><span className="detail-value">{application.yearOfStudy}</span></div>
              <div className="detail-row"><span className="detail-label">Semester</span><span className="detail-value">{application.semester}</span></div>
              <div className="detail-row"><span className="detail-label">Admission Year</span><span className="detail-value">{application.admissionYear}</span></div>
              <div className="detail-row"><span className="detail-label">Academic Session</span><span className="detail-value">{application.academicSession || '—'}</span></div>
            </div>
          </div>

          <div className="detail-section">
            <p className="detail-section__title">Father's Details</p>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Name</span><span className="detail-value">{application.fatherName || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{application.fatherEmail || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{application.fatherPhone || '—'}</span></div>
            </div>
          </div>

          <div className="detail-section">
            <p className="detail-section__title">Mother's Details</p>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Name</span><span className="detail-value">{application.motherName || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{application.motherEmail || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{application.motherPhone || '—'}</span></div>
            </div>
          </div>

          <div className="detail-section">
            <p className="detail-section__title">Guardian Address</p>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Address Line 1</span><span className="detail-value">{application.guardianAddressLine1 || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Address Line 2</span><span className="detail-value">{application.guardianAddressLine2 || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">City</span><span className="detail-value">{application.guardianCity || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">State</span><span className="detail-value">{application.guardianState || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">PIN Code</span><span className="detail-value">{application.guardianPincode || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Country</span><span className="detail-value">{application.guardianCountry || '—'}</span></div>
            </div>
          </div>
        </Card>

        {/* Allocation */}
        {application.hostelId || application.roomId ? (
          <Card variant="default" padding="lg">
            <div className="detail-section">
              <p className="detail-section__title">Hostel & Room Allocation</p>
              <div className="detail-rows">
                <div className="detail-row"><span className="detail-label">Hostel</span><span className="detail-value">{(application.hostelId as unknown as { name: string })?.name || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Room</span><span className="detail-value">{(application.roomId as unknown as { roomNumber: string })?.roomNumber || '—'}</span></div>
                {application.allocatedAt && <div className="detail-row"><span className="detail-label">Allocated At</span><span className="detail-value">{new Date(application.allocatedAt).toLocaleDateString()}</span></div>}
                {application.allocatedBy && <div className="detail-row"><span className="detail-label">Allocated By</span><span className="detail-value">{application.allocatedBy.name}</span></div>}
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Action Buttons */}
      {canAct && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button className="btn btn--primary" onClick={() => handleAction('approve')} disabled={submitting}>
            {submitting ? 'Approving…' : 'Approve Application'}
          </button>
          <button className="btn btn--secondary" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }} onClick={() => handleAction('reject')} disabled={submitting}>
            {submitting ? 'Rejecting…' : 'Reject Application'}
          </button>
        </div>
      )}
    </div>
  );
}



