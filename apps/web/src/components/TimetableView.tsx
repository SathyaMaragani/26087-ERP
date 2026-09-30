import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, DoorOpen, OctagonAlert, Plus } from 'lucide-react';
import { api } from '../api/client';
import { CONFLICT_LABEL, existingConflicts, findConflicts, type SessionLike } from '../lib/conflicts';
import { useAsync } from '../lib/useAsync';
import { useToast } from '../state/toast';
import type { UserPersona } from '../types';
import { DayTimeline, type LaneBy } from '../features/timetable/DayTimeline';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { Button, EmptyState, ErrorState, LoadingBlock, PageHeader } from '../ui/primitives';

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const dayOf = (s: any) => String(s.sessionDate).slice(0, 10);
const mondayOf = (d: Date) => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dow = (x.getUTCDay() + 6) % 7; return new Date(x.getTime() - dow * DAY_MS); };
const fmtDay = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const trainerName = (s: any) => (s.trainer?.user ? `${s.trainer.user.firstName} ${s.trainer.user.lastName}` : 'Trainer');

type View = 'week' | 'day';

export function TimetableView({ currentPersona }: { currentPersona: UserPersona }) {
  const canSchedule = currentPersona.role !== 'TRAINER';
  const sessions = useAsync(() => api.timetable.getSessions(), []);
  const [view, setView] = useState<View>('week');
  const [laneBy, setLaneBy] = useState<LaneBy>('room');
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [dayKey, setDayKey] = useState(() => isoDay(new Date()));
  const [open, setOpen] = useState(false);
  const today = isoDay(new Date());
  const all: any[] = useMemo(() => sessions.data ?? [], [sessions.data]);
  const clashes = useMemo(() => existingConflicts(all), [all]);

  // Land on the first date that actually has sessions.
  useEffect(() => {
    if (all.length === 0) return;
    const dates = all.map(dayOf).sort();
    const next = dates.find((d) => d >= today) ?? dates[0];
    setWeekStart(mondayOf(new Date(next))); setDayKey(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions.data]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(+weekStart + i * DAY_MS)), [weekStart]);
  const byDay = useMemo(() => {
    const m: Record<string, any[]> = {};
    all.forEach((s) => { (m[dayOf(s)] ??= []).push(s); });
    Object.values(m).forEach((l) => l.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))));
    return m;
  }, [all]);
  const shift = (weeks: number) => setWeekStart((w) => new Date(+w + weeks * 7 * DAY_MS));
  const totalClashes = clashes.size;

  const blocks = useMemo(() => (byDay[dayKey] ?? []).map((s) => ({
    id: s.id, start: s.startTime, end: s.endTime, title: s.topic || s.batch?.programme?.title || 'Session', conflicts: clashes.get(s.id),
    lane: laneBy === 'room' ? s.room : laneBy === 'trainer' ? trainerName(s) : s.batch?.name ?? 'Batch',
    laneSub: laneBy === 'room' ? undefined : undefined,
    sub: laneBy === 'room' ? trainerName(s) : laneBy === 'trainer' ? s.room : s.room,
  })), [byDay, dayKey, laneBy, clashes]);

  return (
    <>
      <PageHeader eyebrow="Timetable" title={<>Sessions without <em className="serif-em">clashes</em></>}
        description="Trainer, room and batch conflicts are flagged the moment you propose a session, and enforced again by the server."
        actions={<>
          <div className="view-switch" role="group" aria-label="Timetable view">
            <button className={view === 'week' ? 'is-active' : ''} aria-pressed={view === 'week'} onClick={() => setView('week')}>Week</button>
            <button className={view === 'day' ? 'is-active' : ''} aria-pressed={view === 'day'} onClick={() => setView('day')}>Day timeline</button>
          </div>
          {canSchedule && <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>Schedule session</Button>}
        </>} />

      {totalClashes > 0 && <div className="alert alert-warn" role="alert"><span className="alert-dot" /><span className="alert-text">{totalClashes} saved session{totalClashes === 1 ? '' : 's'} clash with another. Highlighted in the timeline.</span></div>}

      {view === 'week' ? (
        <div className="week-nav">
          <Button size="sm" variant="ghost" icon={<ChevronLeft size={15} />} onClick={() => shift(-1)} aria-label="Previous week" />
          <strong className="num">{fmtDay(days[0])} – {fmtDay(days[6])}</strong>
          <Button size="sm" variant="ghost" icon={<ChevronRight size={15} />} onClick={() => shift(1)} aria-label="Next week" />
          <Button size="sm" onClick={() => setWeekStart(mondayOf(new Date()))}>This week</Button>
        </div>
      ) : (
        <div className="week-nav">
          <input type="date" value={dayKey} onChange={(e) => e.target.value && setDayKey(e.target.value)} aria-label="Day" className="toolbar-select" />
          <div className="view-switch" role="group" aria-label="Group lanes by">
            {(['room', 'trainer', 'batch'] as LaneBy[]).map((l) => <button key={l} className={laneBy === l ? 'is-active' : ''} aria-pressed={laneBy === l} onClick={() => setLaneBy(l)}>By {l}</button>)}
          </div>
        </div>
      )}

      {sessions.loading && !sessions.data ? <LoadingBlock label="Loading timetable" /> : sessions.error ? <ErrorState detail={sessions.error} onRetry={sessions.reload} /> : (
        <>
          {all.length === 0 && <EmptyState icon={<DoorOpen size={22} />} title="No sessions scheduled" detail={canSchedule ? 'Schedule the first session for a batch.' : 'Sessions assigned to you will appear here.'} />}
          {view === 'week' ? (
            <div className={`week${all.length === 0 ? ' week--idle' : ''}`}>
              {days.map((d) => {
                const key = isoDay(d);
                const list = byDay[key] ?? [];
                return (
                  <section key={key} className={`week-day${key === today ? ' is-today' : ''}`} aria-label={fmtDay(d)}>
                    <h3 className="week-head"><span>{fmtDay(d)}</span>{key === today && <span className="week-now num">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>}</h3>
                    {key === today && <NowMarker />}
                    {list.length === 0 ? <div className="week-empty">—</div> : list.map((s: any) => (
                      <article key={s.id} className={`slot${clashes.has(s.id) ? ' slot-clash' : ''}`}>
                        <div className="slot-time num">{s.startTime}–{s.endTime}</div>
                        <strong>{s.topic || s.batch?.programme?.title}</strong>
                        <div className="cell-sub">{s.batch?.name}</div>
                        <div className="cell-sub"><DoorOpen size={12} aria-hidden /> {s.room}</div>
                        <div className="cell-sub">{trainerName(s)}</div>
                        {clashes.get(s.id)?.map((k) => <span key={k} className="pill pill-red slot-flag">{CONFLICT_LABEL[k]}</span>)}
                      </article>
                    ))}
                  </section>
                );
              })}
            </div>
          ) : <DayTimeline blocks={blocks} />}
        </>
      )}

      <ScheduleModal open={open} existing={all} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); sessions.reload(); }} />
    </>
  );
}

/** Position of the current time within a 07:00–20:00 working day, refreshed each minute. */
function NowMarker() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setT(new Date()), 60_000); return () => window.clearInterval(id); }, []);
  const mins = t.getHours() * 60 + t.getMinutes();
  const f = Math.min(1, Math.max(0, (mins - 7 * 60) / (13 * 60)));
  return <div className="now-marker" style={{ top: `${(f * 100).toFixed(2)}%` }} aria-hidden />;
}

function ScheduleModal({ open, existing, onClose, onSaved }: { open: boolean; existing: any[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const options = useAsync(async () => {
    if (!open) return null;
    const [programmes, trainers] = await Promise.all([api.programmes.list(), api.trainers.list()]);
    const batches = (await Promise.all(programmes.map((p: any) => api.programmes.getBatches(p.id).then((b) => b.map((x: any) => ({ ...x, programmeTitle: p.title })))))).flat();
    return { batches, trainers };
  }, [open]);
  const [f, setF] = useState({ batchId: '', trainerId: '', room: '', sessionDate: '', startTime: '09:00', endTime: '11:00', topic: '' });
  const [busy, setBusy] = useState(false);
  const [serverMsg, setServerMsg] = useState('');
  const set = (k: keyof typeof f, v: string) => { setServerMsg(''); setF((c) => ({ ...c, [k]: v })); };
  const timesOk = f.endTime > f.startTime;

  const draft: SessionLike = { batchId: f.batchId, trainerId: f.trainerId, room: f.room, sessionDate: f.sessionDate, startTime: f.startTime, endTime: f.endTime };
  const conflicts = useMemo(() => findConflicts(draft, existing), [f, existing]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = !!(f.batchId && f.trainerId && f.room.trim() && f.sessionDate && f.topic.trim());
  const dayBlocks = useMemo(() => {
    if (!f.sessionDate) return [];
    const same = existing.filter((s) => dayOf(s) === f.sessionDate).map((s) => ({ id: s.id, lane: s.room, start: s.startTime, end: s.endTime, title: s.topic || 'Session', sub: trainerName(s), conflicts: conflicts.filter((c) => c.with.id === s.id).map((c) => c.kind) }));
    if (f.room.trim() && timesOk) same.push({ id: 'draft', lane: f.room.trim(), start: f.startTime, end: f.endTime, title: f.topic || 'New session', sub: '', conflicts: conflicts.map((c) => c.kind), draft: true } as never);
    return same;
  }, [existing, f, conflicts, timesOk]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!timesOk || conflicts.length) return;
    setBusy(true); setServerMsg('');
    try {
      await api.timetable.createSession({ ...f, room: f.room.trim(), topic: f.topic.trim(), sessionDate: new Date(f.sessionDate).toISOString() });
      toast.success('Session scheduled', `${f.room} · ${f.startTime}–${f.endTime}`);
      setF((c) => ({ ...c, room: '', topic: '' }));
      onSaved();
    } catch (err) { setServerMsg(err instanceof Error ? err.message : 'Could not schedule the session'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule a session" width={760}>
      {options.loading ? <LoadingBlock label="Loading batches and trainers" /> : options.error ? <ErrorState detail={options.error} onRetry={options.reload} /> : (
        <form className="form-grid" onSubmit={submit}>
          <Field label="Batch" wide hint={options.data && options.data.batches.length === 0 ? 'No batches exist yet. Create one under Programmes.' : undefined}>
            {(p) => <select {...p} required value={f.batchId} onChange={(e) => set('batchId', e.target.value)}><option value="">Select a batch…</option>{(options.data?.batches ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.programmeTitle} — {b.name}</option>)}</select>}
          </Field>
          <Field label="Trainer" wide>{(p) => <select {...p} required value={f.trainerId} onChange={(e) => set('trainerId', e.target.value)}><option value="">Select a trainer…</option>{(options.data?.trainers ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName}</option>)}</select>}</Field>
          <Field label="Room">{(p) => <input {...p} required value={f.room} onChange={(e) => set('room', e.target.value)} placeholder="Room 204" />}</Field>
          <Field label="Date">{(p) => <input {...p} type="date" required value={f.sessionDate} onChange={(e) => set('sessionDate', e.target.value)} />}</Field>
          <Field label="Starts">{(p) => <input {...p} type="time" required value={f.startTime} onChange={(e) => set('startTime', e.target.value)} />}</Field>
          <Field label="Ends" hint={timesOk ? undefined : 'The end time must be after the start time.'}>{(p) => <input {...p} type="time" required value={f.endTime} onChange={(e) => set('endTime', e.target.value)} aria-invalid={!timesOk} />}</Field>
          <Field label="Topic" wide>{(p) => <input {...p} required value={f.topic} onChange={(e) => set('topic', e.target.value)} />}</Field>

          <div className="span-2 conflicts" aria-live="polite">
            {conflicts.map((c, i) => (
              <div key={i} className="conflict" role="alert"><OctagonAlert size={16} aria-hidden /><div><strong>{CONFLICT_LABEL[c.kind]}</strong>{c.kind === 'TRAINER' ? `${trainerName(c.with)} is already teaching “${c.with.topic}”` : c.kind === 'ROOM' ? `${c.with.room} is booked for “${c.with.topic}”` : `This batch already has “${c.with.topic}”`} at {c.with.startTime}–{c.with.endTime}.</div></div>
            ))}
            {conflicts.length === 0 && ready && timesOk && <div className="conflict-ok"><CheckCircle2 size={15} aria-hidden /> No trainer, room or batch conflicts found.</div>}
            {serverMsg && <div className="conflict" role="alert"><OctagonAlert size={16} aria-hidden /><div><strong>THE SERVER REJECTED THIS SESSION</strong>{serverMsg}</div></div>}
          </div>
          {f.sessionDate && <div className="span-2"><div className="eyebrow" style={{ marginBottom: 8 }}>That day, by room</div><DayTimeline blocks={dayBlocks} /></div>}
          <div className="form-actions span-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy} disabled={!timesOk || conflicts.length > 0}>{conflicts.length ? 'Resolve conflicts to schedule' : 'Schedule'}</Button></div>
        </form>
      )}
    </Modal>
  );
}
