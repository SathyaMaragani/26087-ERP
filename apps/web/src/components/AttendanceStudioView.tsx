import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Clock, ScanLine, ShieldAlert, UserCheck } from 'lucide-react';
import { api } from '../api/client';
import { CheckInCinematic, type CheckInPhase } from '../features/attendance/CheckInCinematic';
import { QrFormation } from '../features/attendance/QrFormation';
import { useAsync } from '../lib/useAsync';
import { useQrScan } from '../lib/useQrScan';
import { useToast } from '../state/toast';
import type { UserPersona } from '../types';
import { JourneyStrip } from '../ui/Lifecycle';
import { Badge, Button, EmptyState, ErrorState, LoadingBlock, PageHeader, Surface, Tabs } from '../ui/primitives';

type Mode = 'display' | 'checkin' | 'face';
interface QrPayload { token: string; expiresAt: number; rotationIndex: number }

/** The QR token carries its session id; the server still verifies the HMAC. */
function sessionIdFromToken(token: string): string | null {
  try {
    const b64 = token.trim().replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    return String(json.rawPayload).split(':')[0] || null;
  } catch { return null; }
}

const RING = 2 * Math.PI * 122;
const DISSOLVE_AT = 1.4;

function QrDisplay({ sessions }: { sessions: any[] }) {
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? '');
  const [qr, setQr] = useState<QrPayload | null>(null);
  const [remaining, setRemaining] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const session = useMemo(() => sessions.find((s) => s.id === sessionId), [sessions, sessionId]);
  const busy = useRef(false);

  const rotate = useCallback(async () => {
    if (!sessionId || busy.current) return;
    busy.current = true;
    try { setQr(await api.attendance.generateDynamicQr(sessionId)); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not generate a code'); setQr(null); }
    finally { busy.current = false; }
  }, [sessionId, busy]);
  useEffect(() => { setQr(null); rotate(); }, [rotate]);

  // Countdown from the server-issued expiry; rotate the moment it lapses.
  useEffect(() => {
    if (!qr) return;
    const tick = () => {
      const left = Math.max(0, (qr.expiresAt - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) rotate();
    };
    tick();
    const t = window.setInterval(tick, 100);
    return () => window.clearInterval(t);
  }, [qr, rotate]);

  const secs = Math.ceil(remaining);
  return (
    <div className="att-grid">
      <Surface eyebrow="Session" title="Choose a class to open for attendance">
        {sessions.length === 0 ? (
          <EmptyState title="No sessions scheduled" detail="Create a session in the timetable, then return here to display its QR code." />
        ) : (
          <div className="att-picker" role="radiogroup" aria-label="Session">
            {sessions.map((s) => (
              <button key={s.id} role="radio" aria-checked={s.id === sessionId} className={`att-session${s.id === sessionId ? ' is-active' : ''}`} onClick={() => setSessionId(s.id)}>
                <strong>{s.topic || s.batch?.programme?.title || 'Session'}</strong>
                <span>{new Date(s.sessionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {s.startTime}–{s.endTime} · {s.room}</span>
              </button>
            ))}
          </div>
        )}
      </Surface>

      <Surface eyebrow="Live credential" title={session ? (session.batch?.programme?.title ?? 'Session') : 'Attendance code'} action={<Badge tone="teal" dot>60 s rotation</Badge>}>
        {error ? <ErrorState title="Couldn't issue a code" detail={error} onRetry={rotate} /> : (
          <div className="qr-stage">
            <div className="qr-frame qr-frame-live">
              <svg className="qr-ring" viewBox="0 0 250 250" aria-hidden>
                <circle cx="125" cy="125" r="122" fill="none" stroke="var(--border-default)" strokeWidth="1.5" />
                <circle cx="125" cy="125" r="116" fill="none" stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="2 7" className="qr-orbit" />
                <circle cx="125" cy="125" r="122" fill="none" stroke={remaining <= 10 ? 'var(--accent-warning)' : 'var(--accent-secondary)'} strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={RING} strokeDashoffset={RING * (1 - Math.min(1, remaining / 60))} transform="rotate(-90 125 125)" style={{ transition: 'stroke 0.3s' }} />
              </svg>
              <span className="qr-pulse" aria-hidden />
              {qr ? <QrFormation key={qr.token} token={qr.token} dissolve={remaining <= DISSOLVE_AT} /> : <div className="qr-loading"><LoadingBlock label="Issuing code" /></div>}
            </div>
            <div className="qr-meta">
              <div className="qr-count"><Clock size={16} aria-hidden /> Rotates in <span className="num">{secs}s</span></div>
              {qr && <div className="cell-sub num qr-key" aria-label="Rotating key fragment">KEY · {qr.token.slice(0, 22)}…</div>}
              {qr && <div className="cell-sub num">Rotation #{qr.rotationIndex} · HMAC-signed · this session only</div>}
              <p className="cell-sub att-note">Project this on the classroom screen. A photo of an expired code is rejected by the server.</p>
            </div>
          </div>
        )}
      </Surface>
    </div>
  );
}

function CheckIn({ persona }: { persona: UserPersona }) {
  const toast = useToast();
  const [token, setToken] = useState('');
  const [phase, setPhase] = useState<CheckInPhase>('idle');
  const [reason, setReason] = useState<string>();

  const submit = useCallback(async (value: string) => {
    const t = value.trim();
    const sessionId = sessionIdFromToken(t);
    setReason(undefined);
    if (!sessionId) { setPhase('fail'); setReason('that is not a valid attendance code'); return; }
    setPhase('verifying');
    const started = Date.now();
    try {
      await api.attendance.scanQr(sessionId, t);
      // Let the ring finish drawing before it closes, so the confirmation is legible.
      const wait = Math.max(0, 1500 - (Date.now() - started));
      window.setTimeout(() => { setPhase('ok'); setToken(''); toast.success('Attendance recorded'); }, wait);
    } catch (e) {
      setPhase('fail'); setReason(e instanceof Error ? e.message : 'check-in was rejected');
    }
  }, [toast]);

  const scan = useQrScan((raw) => { setToken(raw); submit(raw); }, () => toast.warning('Camera unavailable', "Allow camera access, or paste the code shown on the trainer's screen."));
  const onSubmit = (e: FormEvent) => { e.preventDefault(); submit(token); };

  return (
    <div className="att-grid att-single">
      <Surface eyebrow="Learner check-in" title="Record your attendance">
        <p className="cell-sub att-note">Scan the rotating code on the classroom screen. It changes every 60 seconds, so it only works while you are there.</p>
        {scan.scanning && <div className="scan-view"><video ref={scan.videoRef} muted playsInline aria-label="Camera preview" /><div className="scan-reticle" aria-hidden /></div>}
        <div className="att-actions">
          {scan.supported ? <Button icon={<ScanLine size={15} />} onClick={scan.scanning ? scan.stop : scan.start}>{scan.scanning ? 'Stop camera' : 'Scan with camera'}</Button>
            : <span className="cell-sub">Camera scanning isn't supported in this browser — paste the code below.</span>}
        </div>
        <form onSubmit={onSubmit} className="att-form">
          <label htmlFor="qr-token">Attendance code</label>
          <input id="qr-token" className="mono-input" value={token} onChange={(e) => { setToken(e.target.value); if (phase !== 'verifying') setPhase('idle'); }} placeholder="Paste the code from the trainer's display" autoComplete="off" spellCheck={false} />
          <Button type="submit" variant="primary" loading={phase === 'verifying'} disabled={!token.trim()} icon={<UserCheck size={15} />}>Mark me present</Button>
        </form>
        <CheckInCinematic phase={phase} name={persona.name.split(' ')[0]} reason={reason} />
      </Surface>
    </div>
  );
}

function FaceUnavailable() {
  return (
    <div className="att-grid att-single">
      <Surface eyebrow="Face verification · optional" title="Not active in this deployment" action={<Badge tone="amber" dot>Not connected</Badge>}>
        <div className="att-unavailable">
          <ShieldAlert size={22} aria-hidden />
          <div>
            <p>Face recognition is designed as an optional, consent-first alternative to QR, run by a separate provider so the ERP never holds raw biometrics.</p>
            <p>No recognition engine is connected here, and the current endpoint accepts a client-supplied liveness score, which cannot verify a person. So nothing on this screen captures or matches a face — use the QR code.</p>
          </div>
        </div>
        <div className="eyebrow face-h">The planned flow (not running)</div>
        <JourneyStrip steps={[
          { name: 'CONSENT', state: 'unavailable', hint: 'Explicit, revocable' },
          { name: 'CAPTURE', state: 'unavailable', hint: 'On device' },
          { name: 'VERIFY', state: 'unavailable', hint: 'Provider match' },
          { name: 'RECORD', state: 'unavailable', hint: 'Attendance entry' },
        ]} />
      </Surface>
    </div>
  );
}

export function AttendanceStudioView({ persona }: { persona: UserPersona }) {
  const isTrainee = persona.role === 'TRAINEE';
  const [mode, setMode] = useState<Mode>(isTrainee ? 'checkin' : 'display');
  // Trainees can't list sessions; their check-in derives the session from the scanned code.
  const sessions = useAsync(async () => {
    if (isTrainee) return [] as any[];
    const list = await api.timetable.getSessions();
    const today = new Date().toISOString().slice(0, 10);
    return [...list].sort((a: any, b: any) => {
      const da = String(a.sessionDate).slice(0, 10), db = String(b.sessionDate).slice(0, 10);
      const ta = da === today ? 0 : da > today ? 1 : 2, tb = db === today ? 0 : db > today ? 1 : 2;
      return ta - tb || da.localeCompare(db) || String(a.startTime).localeCompare(String(b.startTime));
    });
  }, [isTrainee]);

  const tabs = isTrainee
    ? [{ id: 'checkin' as Mode, label: 'Check in' }, { id: 'face' as Mode, label: 'Face verification' }]
    : [{ id: 'display' as Mode, label: 'Display QR' }, { id: 'checkin' as Mode, label: 'Check in' }, { id: 'face' as Mode, label: 'Face verification' }];

  return (
    <>
      <PageHeader eyebrow="Attendance" title={<>Present, <em className="serif-em">provably</em></>}
        description="A live, time-limited credential that makes proxy attendance impractical." />
      <div className="story">
        <div className="eyebrow">How a check-in becomes a record</div>
        <JourneyStrip steps={[
          { name: 'TRAINER', state: 'live', hint: 'Opens the session' },
          { name: 'GENERATE QR', state: 'live', hint: 'Signed, 60 s' },
          { name: 'TRAINEE SCANS', state: 'live', hint: 'Camera or code' },
          { name: 'VERIFIED', state: 'live', hint: 'Server checks it' },
          { name: 'RECORD STORED', state: 'live', hint: 'Attendance entry' },
        ]} />
      </div>
      <Tabs tabs={tabs} value={mode} onChange={setMode} label="Attendance method" />
      <div className="att-body">
        {mode === 'display' && (sessions.loading ? <LoadingBlock label="Loading sessions" /> : sessions.error ? <ErrorState detail={sessions.error} onRetry={sessions.reload} /> : <QrDisplay sessions={sessions.data ?? []} />)}
        {mode === 'checkin' && <CheckIn persona={persona} />}
        {mode === 'face' && <FaceUnavailable />}
      </div>
    </>
  );
}
