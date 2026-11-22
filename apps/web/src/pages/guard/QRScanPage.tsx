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
  gatePassNumber?: string;
  gatePassStatus?: string;
  actualExitTime?: string;
  actualReturnTime?: string;
}

export function QRScanPage() {
  const { error: showError, success } = useFeedback();
  const [manualId, setManualId] = useState('');
  const [leaveInfo, setLeaveInfo] = useState<LeavePassInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<'exit' | 'return' | null>(null);

  const lookupLeave = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      // Look up via the authenticated guard lookup route so we also receive the
      // gate pass state (exit/return availability).
      const res = await api.get<{ success: boolean; data: Record<string, unknown> }>(
        `/guard/lookup/${encodeURIComponent(id.trim())}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = res.data.data as any;
      const leave = d.leave;
      const gatePass = d.gatePass;
      if (!leave) {
        setLeaveInfo(null);
        showError('Leave pass not found. Check the Leave ID.');
        return;
      }
      const st = leave.studentId ?? {};
      setLeaveInfo({
        _id: leave._id,
        leaveId: leave.leaveId,
        status: leave.status,
        studentName: st.name ?? 'Unknown',
        rollNumber: st.rollNumber ?? '—',
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        destination: leave.destination,
        leaveType: leave.leaveType,
        hostel: st.hostelId?.name ?? '—',
        room: st.roomId?.roomNumber ?? '—',
        gatePassNumber: gatePass?.gatePassNumber,
        gatePassStatus: gatePass?.status,
        actualExitTime: gatePass?.actualExitTime,
        actualReturnTime: gatePass?.actualReturnTime,
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
    setActionLoading('exit');
    try {
      await api.post(`/guard/scan`, { leaveRequestId: leaveInfo._id, action: 'exit' });
      success('Exit recorded successfully.');
      await lookupLeave(leaveInfo.leaveId);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(msg || 'Could not record exit at this time.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecordReturn = async () => {
    if (!leaveInfo) return;
    setActionLoading('return');
    try {
      await api.post(`/guard/scan`, { leaveRequestId: leaveInfo._id, action: 'entry' });
      success('Return recorded successfully.');
      await lookupLeave(leaveInfo.leaveId);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showError(msg || 'Could not record return at this time.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // A pass is valid for gate action when the leave is approved (or already
  // completed after a return) and a gate pass exists.
  const STATUS_OK = ['approved', 'completed'];
  const isValid = !!leaveInfo && STATUS_OK.includes(leaveInfo.status);
  // Exit is available only when the student has not yet exited.
  const canExit = isValid && leaveInfo?.gatePassStatus === 'approved' && !leaveInfo?.actualExitTime;
  // Return is available only after an exit and before a return.
  const canReturn = isValid && !!leaveInfo?.actualExitTime && !leaveInfo?.actualReturnTime;

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
              {leaveInfo.gatePassNumber && (
                <div className="pass-row"><span className="pass-label">Gate Pass</span><span className="pass-value">{leaveInfo.gatePassNumber}</span></div>
              )}
              {leaveInfo.actualExitTime && (
                <div className="pass-row"><span className="pass-label">Exited</span><span className="pass-value">{formatDate(leaveInfo.actualExitTime)}</span></div>
              )}
              {leaveInfo.actualReturnTime && (
                <div className="pass-row"><span className="pass-label">Returned</span><span className="pass-value">{formatDate(leaveInfo.actualReturnTime)}</span></div>
              )}
            </div>
            {isValid && (
              <div className="pass-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <button className="btn btn--success" onClick={handleRecordExit} disabled={!canExit || actionLoading !== null}>
                  {actionLoading === 'exit' ? 'Recording…' : 'Record Exit'}
                </button>
                <button className="btn btn--secondary" onClick={handleRecordReturn} disabled={!canReturn || actionLoading !== null}>
                  {actionLoading === 'return' ? 'Recording…' : 'Record Return'}
                </button>
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
