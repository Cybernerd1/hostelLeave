/**
 * Guard: QR Scan Page
 * Allows guard to scan a leave pass QR code or enter leave ID manually.
 */

import { useState, useCallback } from 'react';
import api from '@/services/api';
import { Card } from '@/components/ui/Card';
import { useFeedback } from '@/components/ui/FeedbackProvider';
import './GuardPages.css';

interface LeavePassInfo {
  _id: string;
  leaveId: string;
  status: string;
  studentName: string;
  rollNumber: string;
  fromDate: string;
  toDate: string;
  destination: string;
  leaveType: string;
  hostel: string;
  room: string;
}

export function QRScanPage() {
  const { error: showError, success } = useFeedback();
  const [manualId, setManualId] = useState('');
  const [leaveInfo, setLeaveInfo] = useState<LeavePassInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const lookupLeave = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setLeaveInfo(null);
    try {
      // The human-readable leave ID (LV-...) only works on the public lookup route.
      // GET /leaves/:id expects a MongoDB _id and fails with 400 for LV-... IDs.
      const res = await api.get<{ success: boolean; data: Record<string, unknown> }>(
        `/leaves/public/${encodeURIComponent(id.trim())}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = res.data.data as any;
      // The public route returns the populated student under `student` (not `studentId`).
      const st = d.student;
      setLeaveInfo({
        _id: d._id,
        leaveId: d.leaveId,
        status: d.status,
        studentName: st?.name ?? 'Unknown',
        rollNumber: st?.rollNumber ?? '—',
        fromDate: d.fromDate,
        toDate: d.toDate,
        destination: d.destination,
        leaveType: d.leaveType,
        hostel: st?.hostelId?.name ?? '—',
        room: st?.roomId?.roomNumber ?? '—',
      });
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (err as any)?.response?.status;
      if (status === 404) {
        showError('Leave pass not found. Check the Leave ID.');
      } else if (status === 429) {
        showError('Too many requests. Please wait a moment and try again.');
      } else {
        showError('Could not verify the pass right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleScan = async () => {
    await lookupLeave(manualId);
  };

  const handleRecordExit = async () => {
    if (!leaveInfo) return;
    try {
      await api.post(`/guard/scan`, { leaveId: leaveInfo._id, action: 'exit' });
      success('Exit recorded successfully.');
    } catch {
      showError('Could not record exit at this time.');
    }
  };

  const handleRecordReturn = async () => {
    if (!leaveInfo) return;
    try {
      await api.post(`/guard/scan`, { leaveId: leaveInfo._id, action: 'return' });
      success('Return recorded successfully.');
    } catch {
      showError('Could not record return at this time.');
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const STATUS_OK = ['approved', 'active'];
  const isValid = leaveInfo && STATUS_OK.includes(leaveInfo.status);

  return (
    <div className="guard-page animate-fade-in-up">
      <div className="guard-page__header">
        <h1 className="guard-page__title">QR Scan / Verify Pass</h1>
        <p className="guard-page__subtitle">Enter a Leave ID to verify a student's leave pass</p>
      </div>

      <div className="guard-page__grid">
        {/* Manual lookup */}
        <Card variant="default" padding="lg">
          <h3 className="guard-section-title">Verify Leave Pass</h3>
          <div className="guard-input-row">
            <input
              className="filter-input"
              placeholder="Enter Leave ID (e.g. LV-20261013-PPA8G)"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            />
            <button className="btn btn--primary" onClick={handleScan} disabled={loading || !manualId.trim()}>
              {loading ? 'Checking…' : 'Verify'}
            </button>
          </div>
        </Card>

        {/* Result */}
        {leaveInfo && (
          <Card variant="default" padding="lg">
            <div className={`pass-badge ${isValid ? 'pass-badge--valid' : 'pass-badge--invalid'}`}>
              {isValid ? '✅ VALID PASS' : '⛔ INVALID / NOT APPROVED'}
            </div>
            <div className="pass-details">
              <div className="pass-row"><span className="pass-label">Student</span><span className="pass-value">{leaveInfo.studentName}</span></div>
              <div className="pass-row"><span className="pass-label">Roll No.</span><span className="pass-value">{leaveInfo.rollNumber}</span></div>
              <div className="pass-row"><span className="pass-label">Hostel / Room</span><span className="pass-value">{leaveInfo.hostel} · Room {leaveInfo.room}</span></div>
              <div className="pass-row"><span className="pass-label">Leave Type</span><span className="pass-value">{leaveInfo.leaveType}</span></div>
              <div className="pass-row"><span className="pass-label">Destination</span><span className="pass-value">{leaveInfo.destination}</span></div>
              <div className="pass-row"><span className="pass-label">From</span><span className="pass-value">{formatDate(leaveInfo.fromDate)}</span></div>
              <div className="pass-row"><span className="pass-label">To</span><span className="pass-value">{formatDate(leaveInfo.toDate)}</span></div>
              <div className="pass-row"><span className="pass-label">Status</span>
                <span className={`status-badge status-badge--${isValid ? 'approved' : 'rejected'}`}>
                  {leaveInfo.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            {isValid && (
              <div className="pass-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <button className="btn btn--success" onClick={handleRecordExit}>Record Exit</button>
                <button className="btn btn--secondary" onClick={handleRecordReturn}>Record Return</button>
                <button
                  className="btn btn--outline"
                  onClick={async () => {
                    try {
                      const res = await api.get(`/leaves/${leaveInfo._id}/pdf`, { responseType: 'blob' });
                      const blob = new Blob([res.data], { type: 'application/pdf' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `leave-pass-${leaveInfo.leaveId}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch {
                       showError('Could not download PDF pass.');
                    }
                  }}
                >
                  📄 Download Pass PDF
                </button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
