import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi, type StudentRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import '../shared/ApprovalsPage.css';
import './AdminPages.css';

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Assign parent
  const [selectedParentId, setSelectedParentId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    adminApi.getStudentById(id)
      .then(s => {
        setStudent(s);
        if (s.parentId) setSelectedParentId((s.parentId as unknown as { _id: string })._id);
      })
      .catch(() => setStudent(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAssign = async () => {
    if (!id || !selectedParentId) return;
    setAssigning(true);
    setAssignMsg(null);
    try {
      await adminApi.assignParentToStudent(id, selectedParentId);
      setAssignMsg('✅ Parent assigned successfully!');
      const updated = await adminApi.getStudentById(id);
      setStudent(updated);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setAssignMsg('❌ ' + (e.response?.data?.message || 'Failed.'));
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <div className="table-empty"><div className="spinner" /></div>;
  if (!student) return <div className="table-empty"><p>Student not found.</p></div>;

  const initials = student.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'pending' },
    approved: { label: 'Approved', color: 'approved' },
    rejected: { label: 'Rejected', color: 'rejected' },
    allocated: { label: 'Allocated', color: 'success' },
  };
  const appStatus = student.applicationStatus ? statusConfig[student.applicationStatus] : { label: '—', color: 'neutral' };

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <button className="btn-action btn-action--view" onClick={() => navigate('/admin/students')} style={{ marginRight: 8 }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="approvals-page__title">Student Profile</h1>
        </div>
      </div>

      <div className="detail-grid">
        {/* Personal Info */}
        <Card variant="default" padding="lg">
          <div className="card-header">
            <div className="avatar-lg">{initials}</div>
            <div className="card-header__info">
              <h2>{student.name}</h2>
              <p>{student.rollNumber}</p>
            </div>
          </div>
          <div className="detail-section">
            <p className="detail-section__title">Personal Details</p>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Student Number</span><span className="detail-value">{student.studentNumber || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Gender</span><span className="detail-value">{student.gender}</span></div>
              <div className="detail-row"><span className="detail-label">Blood Group</span><span className="detail-value">{student.bloodGroup || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Date of Birth</span><span className="detail-value">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{student.phone}</span></div>
              <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{student.userId?.email || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">City</span><span className="detail-value">{student.city}</span></div>
              <div className="detail-row"><span className="detail-label">Residential Address</span><span className="detail-value">{student.address}</span></div>
              <div className="detail-row"><span className="detail-label">Application Status</span>
                <span className={`status-badge status-badge--${appStatus.color}`}>{appStatus.label}</span>
              </div>
              <div className="detail-row"><span className="detail-label">Status</span>
                <span className={`status-badge status-badge--${student.isActive ? 'approved' : 'rejected'}`}>
                  {student.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Academic Info */}
        <Card variant="default" padding="lg">
          <div className="detail-section">
            <p className="detail-section__title">Academic Details</p>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Department</span><span className="detail-value">{(student.departmentId as unknown as { name: string })?.name || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Course</span><span className="detail-value">{(student.courseId as unknown as { name: string })?.name || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Year of Study</span><span className="detail-value">{student.year}</span></div>
              <div className="detail-row"><span className="detail-label">Semester</span><span className="detail-value">{student.semester}</span></div>
              <div className="detail-row"><span className="detail-label">Admission Year</span><span className="detail-value">{student.admissionYear}</span></div>
              <div className="detail-row"><span className="detail-label">Academic Session</span><span className="detail-value">{student.academicSession || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Admission Number</span><span className="detail-value">{student.admissionNumber || '—'}</span></div>
            </div>
          </div>
          <div className="detail-section">
            <p className="detail-section__title">Hostel Details</p>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Hostel</span><span className="detail-value">{(student.hostelId as unknown as { name: string })?.name || 'Not Assigned'}</span></div>
              <div className="detail-row"><span className="detail-label">Room</span><span className="detail-value">{(student.roomId as unknown as { roomNumber: string })?.roomNumber || 'Not Assigned'}</span></div>
            </div>
          </div>
        </Card>

        {/* Father's Details */}
        <Card variant="default" padding="lg">
          <div className="detail-section">
            <p className="detail-section__title">Father's Details</p>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Full Name</span><span className="detail-value">{student.fatherName || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{student.fatherEmail || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{student.fatherPhone || '—'}</span></div>
            </div>
          </div>
        </Card>

        {/* Mother's Details */}
        <Card variant="default" padding="lg">
          <div className="detail-section">
            <p className="detail-section__title">Mother's Details</p>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Full Name</span><span className="detail-value">{student.motherName || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{student.motherEmail || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{student.motherPhone || '—'}</span></div>
            </div>
          </div>
        </Card>

        {/* Guardian Address */}
        <Card variant="default" padding="lg">
          <div className="detail-section">
            <p className="detail-section__title">Parent / Guardian Address</p>
            <div className="detail-rows">
              <div className="detail-row"><span className="detail-label">Address Line 1</span><span className="detail-value">{student.guardianAddressLine1 || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Address Line 2</span><span className="detail-value">{student.guardianAddressLine2 || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">City</span><span className="detail-value">{student.guardianCity || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">State</span><span className="detail-value">{student.guardianState || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">PIN Code</span><span className="detail-value">{student.guardianPincode || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Country</span><span className="detail-value">{student.guardianCountry || '—'}</span></div>
            </div>
          </div>
        </Card>

        {/* Parent Assignment */}
        <Card variant="default" padding="lg">
          <div className="detail-section">
            <p className="detail-section__title">Parent / Guardian</p>
            {student.parentId ? (
              <div className="detail-rows">
                <div className="detail-row"><span className="detail-label">Name</span><span className="detail-value">{(student.parentId as unknown as { name: string }).name}</span></div>
                <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{(student.parentId as unknown as { email: string }).email}</span></div>
                <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{(student.parentId as unknown as { phone: string }).phone}</span></div>
              </div>
            ) : (
              <p style={{ color: '#d97706', fontSize: '0.875rem' }}>⚠ No parent assigned</p>
            )}
          </div>
          <div className="detail-section">
            <p className="detail-section__title">Change Parent</p>
            <select
              className="filter-select"
              style={{ width: '100%', marginBottom: '0.75rem' }}
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
            >
              <option value="">— Select parent —</option>
              {parents.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.email})</option>)}
            </select>
            {assignMsg && (
              <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: assignMsg.startsWith('✅') ? '#15803d' : '#dc2626' }}>
                {assignMsg}
              </p>
            )}
            <button className="btn btn--primary" onClick={handleAssign} disabled={!selectedParentId || assigning}>
              {assigning ? 'Saving…' : 'Save Parent'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}




