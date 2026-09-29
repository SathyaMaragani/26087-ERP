import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react';
import { api, ApiError } from '../api/client';

export const TimetableView: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [room, setRoom] = useState('Room 302 (Conference Hall)');
  const [sessionDate, setSessionDate] = useState('2026-11-02');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [topic, setTopic] = useState('Precision Farming Data Analytics');

  const [conflictError, setConflictError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await api.timetable.getSessions(sessionDate);
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load timetable sessions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [sessionDate]);

  const handleScheduleSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);
    setSuccessMsg(null);

    try {
      // Find trainer and batch from programmes
      const progs = await api.programmes.list();
      const firstProg = progs[0];
      const batches = firstProg ? await api.programmes.getBatches(firstProg.id) : [];
      const batch = batches[0];
      const trainees = await api.trainees.list();

      // Get first trainer
      const trainerId = batch?.trainerId || 'test-trainer-id';

      await api.timetable.createSession({
        batchId: batch?.id || 'batch-id',
        trainerId,
        room,
        sessionDate: new Date(sessionDate).toISOString(),
        startTime,
        endTime,
        topic,
      });

      setSuccessMsg(`Session '${topic}' scheduled successfully without timetable conflicts.`);
      setShowModal(false);
      fetchSessions();
    } catch (err: any) {
      if (err.status === 409) {
        setConflictError(
          `TIMETABLE CONFLICT DETECTED (HTTP 409): ${err.message || 'Trainer or Room double-booking detected during the requested time slot.'}`,
        );
      } else {
        setConflictError(`Scheduling failed: ${err.message}`);
      }
    }
  };

  const handleTestConflict = async () => {
    setConflictError(null);
    setSuccessMsg(null);
    try {
      const progs = await api.programmes.list();
      const firstProg = progs[0];
      const batches = firstProg ? await api.programmes.getBatches(firstProg.id) : [];
      const batch = batches[0];

      // Intentionally request an overlapping time slot (11:00 - 13:00) with same room & trainer
      await api.timetable.createSession({
        batchId: batch?.id || 'batch-id',
        trainerId: batch?.trainerId || 'trainer-id',
        room: 'Room 302 (Conference Hall)',
        sessionDate: '2026-11-02T00:00:00.000Z',
        startTime: '11:00',
        endTime: '13:00',
        topic: 'Overlapping Session Simulation',
      });

      setSuccessMsg('Session scheduled.');
    } catch (err: any) {
      setConflictError(
        `[CONFLICT ENGINE BLOCKED]: ${err.message || '409 Conflict: Trainer or Room is already occupied during this time window.'}`,
      );
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-emerald">Timetable & Scheduling</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• Strict Conflict Detection</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', color: '#ffffff', marginTop: '0.25rem' }}>
            Interactive Training Timetable & Conflict Engine
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Multi-room scheduling with algorithmic conflict detection preventing trainer and facility double-booking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleTestConflict} className="btn btn-secondary btn-sm" title="Simulate scheduling an overlapping slot to trigger 409 Conflict">
            <ShieldAlert size={14} color="#f59e0b" />
            <span>Test Conflict Engine</span>
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
            <Plus size={14} />
            <span>Schedule Session</span>
          </button>
        </div>
      </div>

      {/* Conflict / Success Alert Banner */}
      {conflictError && (
        <div
          className="animate-fade-in"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#fb7185',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertTriangle size={20} />
          <div>
            <div style={{ fontWeight: 700 }}>Timetable Conflict Prevented (409 Conflict)</div>
            <div style={{ fontSize: '0.85rem' }}>{conflictError}</div>
          </div>
        </div>
      )}

      {successMsg && (
        <div
          className="animate-fade-in"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <CheckCircle size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Date Picker Bar */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <CalendarIcon size={16} color="#10b981" />
          <span>Select Date:</span>
        </div>
        <input
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          style={{ maxWidth: '200px' }}
        />
      </div>

      {/* Sessions Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
        }}
      >
        {sessions.map((s) => (
          <div
            key={s.id}
            className="glass-panel"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              borderLeft: '4px solid #10b981',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={12} />
                <span>{s.startTime} - {s.endTime}</span>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                {s.batch?.batchCode || 'Batch 1'}
              </span>
            </div>

            <h4 style={{ fontSize: '1.1rem', color: '#ffffff' }}>
              {s.topic || 'Cooperative Business Session'}
            </h4>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={13} color="#f59e0b" />
                <span>{s.room}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={13} color="#06b6d4" />
                <span>Faculty: {s.trainer?.user ? `${s.trainer.user.firstName} ${s.trainer.user.lastName}` : 'Prof. Rajesh Sharma'}</span>
              </div>
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div
            className="glass-panel"
            style={{
              gridColumn: '1 / -1',
              padding: '3rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            No sessions scheduled for this date. Click "Schedule Session" above to add training lectures or labs.
          </div>
        )}
      </div>

      {/* Schedule Session Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(4, 8, 16, 0.8)',
            backdropFilter: 'blur(12px)',
            padding: '1.5rem',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.35rem', color: '#ffffff', marginBottom: '1rem' }}>
              Schedule Training Session
            </h3>
            <form onSubmit={handleScheduleSession} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Session Topic</label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Facility / Room</label>
                <input
                  type="text"
                  required
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Start Time (HH:mm)</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>End Time (HH:mm)</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
