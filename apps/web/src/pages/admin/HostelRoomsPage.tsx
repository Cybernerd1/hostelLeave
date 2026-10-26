/** Configure every room in one hostel and manage its students. */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi, type AllocationCandidate, type HostelRecord, type RoomRecord } from '@/services/admin.service';
import { Card } from '@/components/ui/Card';
import '../shared/ApprovalsPage.css';

export function HostelRoomsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hostel, setHostel] = useState<HostelRecord | null>(null);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [candidates, setCandidates] = useState<AllocationCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [availability, setAvailability] = useState('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ roomNumber: '', floor: '', capacity: 1 as 1 | 2 | 3 });
  const [saving, setSaving] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [hostelResult, roomResult, candidateResult] = await Promise.all([
        adminApi.getHostels({ page: 1, limit: 100 }),
        adminApi.getHostelRooms(id),
        adminApi.getAllocationCandidates(),
      ]);
      const selected = hostelResult.data.find((item) => item._id === id) || null;
      setHostel(selected);
      setRooms(roomResult);
      setCandidates(candidateResult);
      if (!selected) setError('Hostel not found.');
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || 'Unable to load hostel rooms.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveRoom = async (room: RoomRecord) => {
    setSaving(room._id);
    setError('');
    try {
      await adminApi.updateRoom(room._id, draft);
      setEditing(null);
      setMessage(`Room ${draft.roomNumber} updated.`);
      await load();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message || 'Unable to update room.');
    } finally { setSaving(null); }
  };

  const toggleRoom = async (room: RoomRecord) => {
    try { await adminApi.updateRoom(room._id, { isActive: !room.isActive }); await load(); }
    catch (err: unknown) { const apiError = err as { response?: { data?: { message?: string } } }; setError(apiError.response?.data?.message || 'Unable to change room status.'); }
  };

  const deleteRoom = async (room: RoomRecord) => {
    if (!window.confirm(`Delete room ${room.roomNumber}?`)) return;
    try { await adminApi.deleteRoom(room._id); setMessage(`Room ${room.roomNumber} deleted.`); await load(); }
    catch (err: unknown) { const apiError = err as { response?: { data?: { message?: string } } }; setError(apiError.response?.data?.message || 'Unable to delete room.'); }
  };

  const addStudent = async (room: RoomRecord, studentId: string) => {
    if (!studentId || !hostel) return;
    setAdding(room._id);
    try {
      await adminApi.allocateRoom(studentId, { hostelId: hostel._id, roomId: room._id, reason: `Room assignment by hostel manager` });
      setMessage('Student added to room.');
      await load();
    } catch (err: unknown) { const apiError = err as { response?: { data?: { message?: string } } }; setError(apiError.response?.data?.message || 'Unable to add student to room.'); }
    finally { setAdding(null); }
  };

  const removeStudent = async (studentId: string) => {
    if (!window.confirm('Remove this student from the hostel and room?')) return;
    try { await adminApi.removeStudentFromRoom(studentId); setMessage('Student removed from room and hostel.'); await load(); }
    catch (err: unknown) { const apiError = err as { response?: { data?: { message?: string } } }; setError(apiError.response?.data?.message || 'Unable to remove student.'); }
  };

  const filteredRooms = rooms
    .filter((room) => room.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()))
    .filter((room) => availability === 'all' || (availability === 'available' ? room.isActive && room.availableSeats > 0 : availability === 'full' ? room.isActive && room.availableSeats === 0 : !room.isActive));

  if (loading) return <div className="table-empty"><div className="spinner" /><p>Loading rooms…</p></div>;
  if (!hostel) return <div className="table-empty"><p>{error || 'Hostel not found.'}</p></div>;

  return (
    <div className="approvals-page animate-fade-in-up">
      <div className="approvals-page__header">
        <div><button className="btn-action btn-action--view" onClick={() => navigate('/admin/hostels')}>← Hostels</button><h1 className="approvals-page__title" style={{ marginTop: '0.75rem' }}>{hostel.name} Rooms</h1><p className="approvals-page__subtitle">{rooms.length} rooms · {hostel.capacity} beds · {hostel.availableSeats} available seats</p></div>
      </div>
      {message && <div className="form-message form-message--success" style={{ marginBottom: '1rem' }}>{message}</div>}
      {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="filters-row"><input className="filter-input" placeholder="Search room number…" value={roomSearch} onChange={(e) => setRoomSearch(e.target.value)} /><select className="filter-select" value={availability} onChange={(e) => setAvailability(e.target.value)}><option value="all">All rooms</option><option value="available">Available</option><option value="full">Full</option><option value="inactive">Unavailable</option></select></div>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {filteredRooms.length === 0 ? <Card variant="default" padding="lg"><div className="table-empty"><p>No rooms match this filter.</p></div></Card> : filteredRooms.map((room) => {
          const roomStudentIds = new Set((room.students || []).map((student) => student._id));
          const availableCandidates = candidates.filter((candidate) => !roomStudentIds.has(candidate._id) && candidate.roomId !== room._id);
          return <Card key={room._id} variant="default" padding="lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div><h2 style={{ margin: 0 }}>{room.roomNumber}</h2><p style={{ margin: '0.25rem 0', color: 'var(--color-neutral-500)' }}>{room.occupied} occupied · {room.availableSeats} available · {room.occupancyStatus}</p></div>
              <span className={`status-badge status-badge--${room.isActive ? 'approved' : 'rejected'}`}>{room.isActive ? 'Available for allocation' : 'Unavailable'}</span>
            </div>
            {editing === room._id ? <div className="filters-row" style={{ marginTop: '1rem' }}><input className="filter-input" value={draft.roomNumber} onChange={(e) => setDraft({ ...draft, roomNumber: e.target.value })} /><input className="filter-input" value={draft.floor} onChange={(e) => setDraft({ ...draft, floor: e.target.value })} placeholder="Floor" /><select className="filter-select" value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) as 1 | 2 | 3 })}><option value={1}>1 seater</option><option value={2}>2 seater</option><option value={3}>3 seater</option></select><button className="btn btn--primary btn--sm" onClick={() => saveRoom(room)} disabled={saving === room._id}>{saving === room._id ? 'Saving…' : 'Save'}</button><button className="btn btn--secondary btn--sm" onClick={() => setEditing(null)}>Cancel</button></div> : <div style={{ marginTop: '1rem', display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn btn--secondary btn--sm" onClick={() => { setEditing(room._id); setDraft({ roomNumber: room.roomNumber, floor: room.floor, capacity: room.capacity as 1 | 2 | 3 }); }}>Configure room</button><button className="btn btn--secondary btn--sm" onClick={() => toggleRoom(room)}>{room.isActive ? 'Mark unavailable' : 'Mark available'}</button><button className="btn btn--secondary btn--sm" onClick={() => deleteRoom(room)}>Delete</button></div>}
            <details style={{ marginTop: '1rem' }}><summary style={{ cursor: 'pointer', fontWeight: 600 }}>Students in room ({room.students?.length || 0})</summary><div style={{ marginTop: '0.75rem' }}>{room.students?.length ? <div style={{ display: 'grid', gap: 8 }}>{room.students.map((student) => <div key={student._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '0.5rem', background: 'var(--color-neutral-50)', borderRadius: 8 }}><span><strong>{student.name}</strong><small style={{ display: 'block', color: 'var(--color-neutral-500)' }}>{student.rollNumber} · {student.email || 'No email'}</small></span><button className="btn-action btn-action--view" onClick={() => removeStudent(student._id)}>Remove</button></div>)}</div> : <p style={{ color: 'var(--color-neutral-500)' }}>No students assigned.</p>}</div></details>
            {room.isActive && room.availableSeats > 0 && <div style={{ marginTop: '1rem' }}><select className="filter-select" value="" disabled={adding === room._id} onChange={(e) => addStudent(room, e.target.value)}><option value="">{adding === room._id ? 'Adding student…' : 'Add student to this room'}</option>{availableCandidates.map((candidate) => <option key={candidate._id} value={candidate._id}>{candidate.name} — {candidate.rollNumber}{candidate.roomId ? ' (transfer)' : ''}</option>)}</select></div>}
          </Card>;
        })}
      </div>
    </div>
  );
}
