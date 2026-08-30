/**
 * Guard: QR Scan Page
 * Allows guard to scan a leave pass QR code or enter leave ID manually.
 */

import { useState, useCallback } from 'react';
import api from '@/services/api';
import { Card } from '@/components/ui/Card';
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
  const [manualId, setManualId] = useState('');
  const [leaveInfo, setLeaveInfo] = useState<LeavePassInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recordMsg, setRecordMsg] = useState<string | null>(null);

  const lookupLeave = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    setLeaveInfo(null);
    setRecordMsg(null);
    try {
      const res = await api.get<{ success: boolean; data: LeavePassInfo }>(`/leaves/${id.trim()}`);
      const d = res.data.data;
      setLeaveInfo({
        _id: d._id,
        leaveId: (d as unknown as { leaveId: string }).leaveId,
        status: d.status,
        studentName: (d.studentId as unknown as { name: string })?.name ?? 'Unknown',
        rollNumber: (d.studentId as unknown as { rollNumber: string })?.rollNumber ?? '—',
        fromDate: d.fromDate,
        toDate: d.toDate,
        destination: d.destination,
        leaveType: d.leaveType,
        hostel: (d.studentId as unknown as { hostelId?: { name: string } })?.hostelId?.name ?? '—',
        room: (d.studentId as unknown as { roomId?: { roomNumber: string } })?.roomId?.roomNumber ?? '—',
      });
    } catch {
      setError('Leave pass not found or invalid ID.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleScan = async () => {
    await lookupLeave(manualId);
  };

  const handleRecordExit = async () => {
    if (!leaveInfo) return;
    setRecordMsg(null);
    try {
      await api.post(`/guard/scan`, { leaveId: leaveInfo._id, action: 'exit' });
      setRecordMsg('✅ Exit recorded successfully.');
    } catch {
      setRecordMsg('❌ Could not record exit at this time.');
    }
  };

  const handleRecordReturn = async () => {
    if (!leaveInfo) return;
    setRecordMsg(null);
    try {
      await api.post(`/guard/scan`, { leaveId: leaveInfo._id, action: 'return' });
      setRecordMsg('✅ Return recorded successfully.');
    } catch {
      setRecordMsg('❌ Could not record return at this time.');
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
              placeholder="Enter Leave ID (e.g. LV-2024-001)"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
            />
            <button className="btn btn--primary" onClick={handleScan} disabled={loading || !manualId.trim()}>
              {loading ? 'Checking…' : 'Verify'}
            </button>
          </div>
          {error && <div className="guard-error">{error}</div>}
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
              <div className="pass-actions">
                <button className="btn btn--success" onClick={handleRecordExit}>Record Exit</button>
                <button className="btn btn--secondary" onClick={handleRecordReturn}>Record Return</button>
              </div>
            )}
            {recordMsg && <p className="guard-msg">{recordMsg}</p>}
          </Card>
        )}
      </div>
    </div>
  );
}
