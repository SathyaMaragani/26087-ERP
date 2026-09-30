import { useState, type FormEvent } from 'react';
import { CalendarDays, Layers, MapPin, Plus, Users } from 'lucide-react';
import { api } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { useToast } from '../state/toast';
import { Drawer, Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { Badge, Button, EmptyState, ErrorState, LoadingBlock, PageHeader, Surface } from '../ui/primitives';
import { fmtDate, statusTone } from '../features/home/shared';

const MODES = ['OFFLINE', 'ONLINE', 'BLENDED'] as const;
const STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const;
const toIso = (d: string) => new Date(d).toISOString();

export function ProgrammesView() {
  const list = useAsync(() => api.programmes.list(), []);
  const [createOpen, setCreateOpen] = useState(false);
  const [batchesFor, setBatchesFor] = useState<any | null>(null);
  const [filter, setFilter] = useState<string>('ALL');

  const shown = (list.data ?? []).filter((p: any) => filter === 'ALL' || p.status === filter);

  return (
    <>
      <PageHeader eyebrow="Training programmes" title={<>The training <em className="serif-em">calendar</em></>}
        description="Programmes, their capacity and the batches that deliver them."
        actions={<Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>New programme</Button>} />

      <div className="filter-row" role="group" aria-label="Filter by status">
        {['ALL', ...STATUSES].map((s) => (
          <button key={s} className={`filter-chip${filter === s ? ' is-active' : ''}`} aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {list.loading && !list.data ? <LoadingBlock label="Loading programmes" /> : list.error ? <ErrorState detail={list.error} onRetry={list.reload} /> : shown.length === 0 ? (
        <Surface><EmptyState icon={<CalendarDays size={22} />} title={filter === 'ALL' ? 'No programmes yet' : 'No programmes with this status'} detail={filter === 'ALL' ? 'Create a programme to open registrations.' : undefined}
          action={filter === 'ALL' ? <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>Create a programme</Button> : undefined} /></Surface>
      ) : (
        <div className="prog-grid">
          {shown.map((p: any) => {
            const reg = p._count?.registrations ?? 0;
            const pct = p.capacity ? Math.min(100, Math.round((reg / p.capacity) * 100)) : 0;
            return (
              <article key={p.id} className="prog">
                <header>
                  <div className="prog-code num">{p.code}</div>
                  <Badge tone={statusTone(p.status)} dot>{p.status}</Badge>
                </header>
                <h3>{p.title}</h3>
                <p className="prog-desc">{p.description}</p>
                <dl className="prog-facts">
                  <div><dt><CalendarDays size={13} aria-hidden /> Dates</dt><dd className="num">{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</dd></div>
                  <div><dt><MapPin size={13} aria-hidden /> Venue</dt><dd>{p.location || '—'}</dd></div>
                  <div><dt>Mode</dt><dd>{p.mode}{p.hostelRequired ? ' · hostel' : ''}</dd></div>
                  <div><dt>Category</dt><dd>{p.category}</dd></div>
                </dl>
                <div className="prog-cap">
                  <div className="cap-head"><span className="cell-sub"><Users size={13} aria-hidden /> Registrations</span><span className="num cell-sub">{reg} / {p.capacity}</span></div>
                  <div className="mini-bar" style={{ width: '100%' }} role="img" aria-label={`${pct}% of capacity`}><i style={{ width: `${pct}%` }} /></div>
                </div>
                <footer>
                  <span className="cell-sub num">{p._count?.batches ?? 0} batch{(p._count?.batches ?? 0) === 1 ? '' : 'es'} · {p._count?.certificates ?? 0} certificates</span>
                  <Button size="sm" icon={<Layers size={14} />} onClick={() => setBatchesFor(p)}>Batches</Button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <CreateProgramme open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); list.reload(); }} />
      <BatchesDrawer programme={batchesFor} onClose={() => setBatchesFor(null)} onChanged={list.reload} />
    </>
  );
}

function CreateProgramme({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ code: '', title: '', description: '', category: '', targetAudience: '', mode: 'BLENDED', durationDays: '5', startDate: '', endDate: '', capacity: '50', location: '', eligibilityCriteria: '', hostelRequired: false, status: 'UPCOMING' });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const datesOk = !f.startDate || !f.endDate || f.endDate >= f.startDate;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!datesOk) return;
    setBusy(true);
    try {
      await api.programmes.create({
        code: f.code.trim(), title: f.title.trim(), description: f.description.trim(), category: f.category.trim(),
        ...(f.targetAudience.trim() && { targetAudience: f.targetAudience.trim() }),
        mode: f.mode, durationDays: Number(f.durationDays), startDate: toIso(f.startDate), endDate: toIso(f.endDate),
        capacity: Number(f.capacity), ...(f.location.trim() && { location: f.location.trim() }),
        ...(f.eligibilityCriteria.trim() && { eligibilityCriteria: f.eligibilityCriteria.trim() }),
        hostelRequired: f.hostelRequired, status: f.status,
      });
      toast.success('Programme created', f.title);
      onCreated();
    } catch (err) {
      toast.error('Could not create the programme', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New training programme" width={700}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Programme code">{(p) => <input {...p} required value={f.code} onChange={(e) => set('code', e.target.value)} placeholder="PRG-XX-2026-01" />}</Field>
        <Field label="Category">{(p) => <input {...p} required value={f.category} onChange={(e) => set('category', e.target.value)} placeholder="Digital Literacy" />}</Field>
        <Field label="Title" wide>{(p) => <input {...p} required value={f.title} onChange={(e) => set('title', e.target.value)} />}</Field>
        <Field label="Description" wide>{(p) => <textarea {...p} required rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} />}</Field>
        <Field label="Target audience" wide>{(p) => <input {...p} value={f.targetAudience} onChange={(e) => set('targetAudience', e.target.value)} placeholder="PACS personnel, SHG representatives…" />}</Field>
        <Field label="Start date">{(p) => <input {...p} type="date" required value={f.startDate} onChange={(e) => set('startDate', e.target.value)} />}</Field>
        <Field label="End date" hint={datesOk ? undefined : 'The end date must not be before the start date.'}>{(p) => <input {...p} type="date" required min={f.startDate} value={f.endDate} onChange={(e) => set('endDate', e.target.value)} aria-invalid={!datesOk} />}</Field>
        <Field label="Mode">{(p) => <select {...p} value={f.mode} onChange={(e) => set('mode', e.target.value)}>{MODES.map((m) => <option key={m}>{m}</option>)}</select>}</Field>
        <Field label="Status">{(p) => <select {...p} value={f.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((m) => <option key={m}>{m}</option>)}</select>}</Field>
        <Field label="Duration (days)">{(p) => <input {...p} type="number" min={1} required value={f.durationDays} onChange={(e) => set('durationDays', e.target.value)} />}</Field>
        <Field label="Capacity">{(p) => <input {...p} type="number" min={1} required value={f.capacity} onChange={(e) => set('capacity', e.target.value)} />}</Field>
        <Field label="Venue" wide>{(p) => <input {...p} value={f.location} onChange={(e) => set('location', e.target.value)} />}</Field>
        <Field label="Eligibility" wide>{(p) => <input {...p} value={f.eligibilityCriteria} onChange={(e) => set('eligibilityCriteria', e.target.value)} />}</Field>
        <label className="check span-2"><input type="checkbox" checked={f.hostelRequired} onChange={(e) => set('hostelRequired', e.target.checked)} /> Residential — hostel accommodation required</label>
        <div className="form-actions span-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy} disabled={!datesOk}>Create programme</Button></div>
      </form>
    </Modal>
  );
}

function BatchesDrawer({ programme, onClose, onChanged }: { programme: any | null; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const batches = useAsync(() => (programme ? api.programmes.getBatches(programme.id) : Promise.resolve([] as any[])), [programme?.id]);
  const trainers = useAsync(() => (programme ? api.trainers.list().catch(() => [] as any[]) : Promise.resolve([] as any[])), [programme?.id]);
  const [f, setF] = useState({ batchCode: '', name: '', trainerId: '', startDate: '', endDate: '', capacity: '30' });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((c) => ({ ...c, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!programme) return;
    setBusy(true);
    try {
      await api.programmes.createBatch(programme.id, {
        batchCode: f.batchCode.trim(), name: f.name.trim(), ...(f.trainerId && { trainerId: f.trainerId }),
        startDate: toIso(f.startDate), endDate: toIso(f.endDate), capacity: Number(f.capacity),
      });
      toast.success('Batch created', f.name);
      setF({ batchCode: '', name: '', trainerId: '', startDate: programme.startDate?.slice(0, 10) ?? '', endDate: programme.endDate?.slice(0, 10) ?? '', capacity: '30' });
      batches.reload(); onChanged();
    } catch (err) {
      toast.error('Could not create the batch', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={!!programme} onClose={onClose} title={programme ? `Batches · ${programme.code}` : 'Batches'} width={520}>
      {batches.loading ? <LoadingBlock label="Loading batches" /> : batches.error ? <ErrorState detail={batches.error} onRetry={batches.reload} /> : (batches.data ?? []).length === 0 ? (
        <EmptyState title="No batches yet" detail="A batch groups trainees under one trainer for the timetable." />
      ) : (
        <ul className="cand-list">
          {(batches.data ?? []).map((b: any) => (
            <li key={b.id}>
              <div className="cand-top"><div><strong className="cell-strong">{b.name}</strong><div className="cell-sub num">{b.batchCode} · {fmtDate(b.startDate)} – {fmtDate(b.endDate)}</div></div><Badge tone="indigo">Cap. {b.capacity}</Badge></div>
              <div className="cell-sub">Trainer: {b.trainer?.user ? `${b.trainer.user.firstName} ${b.trainer.user.lastName}` : 'Unassigned'}</div>
            </li>
          ))}
        </ul>
      )}
      <h3 className="drawer-h">Add a batch</h3>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Batch code">{(p) => <input {...p} required value={f.batchCode} onChange={(e) => set('batchCode', e.target.value)} placeholder="BATCH-B" />}</Field>
        <Field label="Capacity">{(p) => <input {...p} type="number" min={1} required value={f.capacity} onChange={(e) => set('capacity', e.target.value)} />}</Field>
        <Field label="Name" wide>{(p) => <input {...p} required value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Batch B — Afternoon" />}</Field>
        <Field label="Trainer" wide hint={trainers.data && trainers.data.length === 0 ? 'No trainers are registered yet.' : undefined}>
          {(p) => <select {...p} value={f.trainerId} onChange={(e) => set('trainerId', e.target.value)}><option value="">Unassigned</option>{(trainers.data ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName}</option>)}</select>}
        </Field>
        <Field label="Start">{(p) => <input {...p} type="date" required value={f.startDate} onChange={(e) => set('startDate', e.target.value)} />}</Field>
        <Field label="End">{(p) => <input {...p} type="date" required min={f.startDate} value={f.endDate} onChange={(e) => set('endDate', e.target.value)} />}</Field>
        <div className="form-actions span-2"><Button type="submit" variant="primary" loading={busy}>Create batch</Button></div>
      </form>
    </Drawer>
  );
}
