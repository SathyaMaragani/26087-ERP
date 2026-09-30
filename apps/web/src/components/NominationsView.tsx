import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Clock3, ClipboardList, UserPlus, XCircle } from 'lucide-react';
import { api } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { useToast } from '../state/toast';
import type { UserPersona } from '../types';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { Badge, Button, EmptyState, ErrorState, LoadingBlock, PageHeader, Surface } from '../ui/primitives';
import { ProgrammeLifecycle, type ProgrammeStage } from '../ui/Lifecycle';
import { fmtDate, statusTone } from '../features/home/shared';

const FILTERS = ['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'WAITLISTED', 'ENROLLED', 'REJECTED'] as const;
const pretty = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
/** Where a registration sits on DISCOVER → … → CERTIFY. */
function stageOf(n: any): ProgrammeStage {
  switch (n.status) {
    case 'SUBMITTED': case 'UNDER_REVIEW': case 'REJECTED': case 'DRAFT': return 'NOMINATE';
    case 'APPROVED': case 'WAITLISTED': return 'APPROVE';
    case 'ENROLLED': return n.programme?.status === 'ONGOING' ? 'TRAIN' : 'ENROLL';
    case 'COMPLETED': return 'CERTIFY';
    default: return 'DISCOVER';
  }
}
const personName = (n: any) => (n.trainee?.user ? `${n.trainee.user.firstName} ${n.trainee.user.lastName}` : n.trainee?.traineeCode ?? 'Trainee');

export function NominationsView({ currentPersona }: { currentPersona: UserPersona }) {
  return currentPersona.role === 'TRAINEE' ? <TraineeRegistrations /> : <ReviewDesk />;
}

/* ------------------------------------------------------------ Review desk */
function ReviewDesk() {
  const toast = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const noms = useAsync(() => api.nominations.list(), []);
  const progs = useAsync(() => api.programmes.list(), []);
  const certs = useAsync(() => api.certifications.list().catch(() => [] as any[]), []);
  const [decision, setDecision] = useState<{ nomination: any; status: string } | null>(null);
  const [nominateOpen, setNominateOpen] = useState(false);

  const rows = useMemo(() => (noms.data ?? []).filter((n: any) => filter === 'ALL' || n.status === filter), [noms.data, filter]);
  const counts = (s: string) => (noms.data ?? []).filter((n: any) => n.status === s).length;

  const quick = async (n: any, status: string) => {
    try {
      await api.nominations.updateStatus(n.id, status);
      toast.success(`Marked ${pretty(status).toLowerCase()}`, personName(n));
      noms.reload();
    } catch (e) {
      toast.error('Could not update the application', e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Registration & nomination" title={<>Who gets a <em className="serif-em">seat</em></>}
        description="Self-registrations and institutional nominations, from submission to enrolment."
        actions={<Button variant="primary" icon={<UserPlus size={15} />} onClick={() => setNominateOpen(true)}>Nominate a trainee</Button>} />

      <Surface eyebrow="Programme lifecycle" title="Where everyone stands">
        <ProgrammeLifecycle stages={{
          DISCOVER: { count: (progs.data ?? []).length, hint: 'Programmes open' },
          NOMINATE: { count: counts('SUBMITTED') + counts('UNDER_REVIEW'), hint: 'Awaiting review' },
          APPROVE: { count: counts('APPROVED') + counts('WAITLISTED'), hint: 'Approved or waitlisted' },
          ENROLL: { count: counts('ENROLLED'), hint: 'In a batch' },
          TRAIN: { count: (noms.data ?? []).filter((n: any) => n.status === 'ENROLLED' && n.programme?.status === 'ONGOING').length, hint: 'Programme under way' },
          ASSESS: { state: 'unavailable', hint: 'Not in the API yet' },
          CERTIFY: { count: (certs.data ?? []).length, hint: 'Credentials issued' },
        } as Partial<Record<ProgrammeStage, { count?: number; state?: 'live' | 'unavailable'; hint?: string }>>} />
      </Surface>
      <div style={{ height: 16 }} />

      <div className="filter-row" role="group" aria-label="Filter by status">
        {FILTERS.map((s) => (
          <button key={s} className={`filter-chip${filter === s ? ' is-active' : ''}`} aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {s === 'ALL' ? 'All' : pretty(s)}{s !== 'ALL' && <span className="num filter-count">{counts(s)}</span>}
          </button>
        ))}
      </div>

      <Surface pad={false}>
        {noms.loading && !noms.data ? <LoadingBlock label="Loading applications" /> : noms.error ? <ErrorState detail={noms.error} onRetry={noms.reload} /> : rows.length === 0 ? (
          <EmptyState icon={<ClipboardList size={22} />} title={filter === 'ALL' ? 'No applications yet' : `Nothing ${pretty(filter).toLowerCase()}`} detail={filter === 'ALL' ? 'Applications appear when trainees register or institutions nominate them.' : undefined} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Trainee</th><th>Programme</th><th>Route</th><th>Submitted</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {rows.map((n: any) => (
                  <tr key={n.id}>
                    <td><strong className="cell-strong">{personName(n)}</strong><div className="cell-sub">{n.trainee?.cooperativeName ?? n.trainee?.traineeCode}</div></td>
                    <td>{n.programme?.title}<div className="cell-sub num">{n.programme?.code}</div></td>
                    <td>{n.nominationType === 'SELF' ? 'Self-registered' : <>Nominated<div className="cell-sub">{n.nominatingOrgName}</div></>}</td>
                    <td className="num">{fmtDate(n.createdAt)}</td>
                    <td><Badge tone={statusTone(n.status)} dot>{pretty(n.status)}</Badge></td>
                    <td>
                      <div className="row-actions">
                        {['SUBMITTED', 'UNDER_REVIEW', 'WAITLISTED'].includes(n.status) && <Button size="sm" variant="primary" icon={<CheckCircle2 size={13} />} onClick={() => quick(n, 'APPROVED')}>Approve</Button>}
                        {['SUBMITTED', 'UNDER_REVIEW'].includes(n.status) && <Button size="sm" icon={<Clock3 size={13} />} onClick={() => quick(n, 'WAITLISTED')}>Waitlist</Button>}
                        {n.status === 'APPROVED' && <Button size="sm" variant="primary" onClick={() => setDecision({ nomination: n, status: 'ENROLLED' })}>Enrol in batch</Button>}
                        {!['REJECTED', 'ENROLLED', 'CANCELLED', 'COMPLETED'].includes(n.status) && <Button size="sm" variant="danger" icon={<XCircle size={13} />} onClick={() => setDecision({ nomination: n, status: 'REJECTED' })}>Reject</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      <DecisionModal state={decision} onClose={() => setDecision(null)} onDone={() => { setDecision(null); noms.reload(); }} />
      <NominateModal open={nominateOpen} onClose={() => setNominateOpen(false)} onDone={() => { setNominateOpen(false); noms.reload(); }} />
    </>
  );
}

function DecisionModal({ state, onClose, onDone }: { state: { nomination: any; status: string } | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const n = state?.nomination;
  const enrol = state?.status === 'ENROLLED';
  const batches = useAsync(() => (n && enrol ? api.programmes.getBatches(n.programmeId) : Promise.resolve([] as any[])), [n?.id, enrol]);
  const [batchId, setBatchId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!n || !state) return;
    setBusy(true);
    try {
      await api.nominations.updateStatus(n.id, state.status, enrol ? batchId : undefined, remarks.trim() || undefined);
      toast.success(enrol ? 'Trainee enrolled' : 'Application rejected', personName(n));
      setBatchId(''); setRemarks('');
      onDone();
    } catch (err) {
      toast.error('Could not save the decision', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!state} onClose={onClose} title={enrol ? 'Enrol into a batch' : 'Reject application'} width={480}>
      <form className="form-grid" onSubmit={submit}>
        <p className="cell-sub span-2"><strong>{n && personName(n)}</strong> · {n?.programme?.title}</p>
        {enrol && (
          <Field label="Batch" wide hint={batches.data && batches.data.length === 0 ? 'This programme has no batches. Create one under Programmes first.' : undefined}>
            {(p) => <select {...p} required value={batchId} onChange={(e) => setBatchId(e.target.value)}><option value="">Select a batch…</option>{(batches.data ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name} ({b.batchCode})</option>)}</select>}
          </Field>
        )}
        <Field label={enrol ? 'Remarks (optional)' : 'Reason (shared with the applicant)'} wide>{(p) => <textarea {...p} rows={3} required={!enrol} value={remarks} onChange={(e) => setRemarks(e.target.value)} />}</Field>
        <div className="form-actions span-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant={enrol ? 'primary' : 'danger'} loading={busy} disabled={enrol && !batchId}>{enrol ? 'Enrol trainee' : 'Reject application'}</Button></div>
      </form>
    </Modal>
  );
}

function NominateModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const trainees = useAsync(() => (open ? api.trainees.list() : Promise.resolve([] as any[])), [open]);
  const programmes = useAsync(() => (open ? api.programmes.list() : Promise.resolve([] as any[])), [open]);
  const [f, setF] = useState({ traineeId: '', programmeId: '', nominatingOrgName: '', nominatingOfficer: '', remarks: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((c) => ({ ...c, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.nominations.nominate(f.traineeId, { programmeId: f.programmeId, nominatingOrgName: f.nominatingOrgName.trim() || undefined, nominatingOfficer: f.nominatingOfficer.trim() || undefined, remarks: f.remarks.trim() || undefined });
      toast.success('Nomination submitted');
      setF({ traineeId: '', programmeId: '', nominatingOrgName: '', nominatingOfficer: '', remarks: '' });
      onDone();
    } catch (err) {
      toast.error('Could not submit the nomination', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nominate a trainee" width={560}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Trainee" wide>{(p) => <select {...p} required value={f.traineeId} onChange={(e) => set('traineeId', e.target.value)}><option value="">Select a trainee…</option>{(trainees.data ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName} · {t.traineeCode}</option>)}</select>}</Field>
        <Field label="Programme" wide>{(p) => <select {...p} required value={f.programmeId} onChange={(e) => set('programmeId', e.target.value)}><option value="">Select a programme…</option>{(programmes.data ?? []).map((g: any) => <option key={g.id} value={g.id}>{g.title}</option>)}</select>}</Field>
        <Field label="Nominating organisation">{(p) => <input {...p} value={f.nominatingOrgName} onChange={(e) => set('nominatingOrgName', e.target.value)} placeholder="e.g. a PACS or SHG federation" />}</Field>
        <Field label="Nominating officer">{(p) => <input {...p} value={f.nominatingOfficer} onChange={(e) => set('nominatingOfficer', e.target.value)} />}</Field>
        <Field label="Remarks" wide>{(p) => <textarea {...p} rows={2} value={f.remarks} onChange={(e) => set('remarks', e.target.value)} />}</Field>
        <div className="form-actions span-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy} disabled={!f.traineeId || !f.programmeId}>Submit nomination</Button></div>
      </form>
    </Modal>
  );
}

/* --------------------------------------------------------- Trainee's view */
function TraineeRegistrations() {
  const toast = useToast();
  const mine = useAsync(() => api.nominations.mine(), []);
  const programmes = useAsync(() => api.programmes.list(), []);
  const [busy, setBusy] = useState<string | null>(null);
  const registered = new Set((mine.data ?? []).map((n: any) => n.programmeId));

  const register = async (p: any) => {
    setBusy(p.id);
    try {
      await api.nominations.registerSelf({ programmeId: p.id });
      toast.success('Registration submitted', `${p.title} — you'll be notified when it is reviewed.`);
      mine.reload();
    } catch (e) {
      toast.error('Could not register', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow="My programmes" title={<>Find your next <em className="serif-em">programme</em></>} description="Register yourself; your institution reviews and confirms your seat." />
      <div className="home-grid">
        <div className="span-5">
          <Surface eyebrow="My registrations" title="Where I stand">
            {mine.loading && !mine.data ? <LoadingBlock /> : mine.error ? <ErrorState detail={mine.error} onRetry={mine.reload} /> : (mine.data ?? []).length === 0 ? <EmptyState title="No registrations yet" detail="Pick a programme on the right to apply." /> : (
              <ul className="rows rows-flush">
                {(mine.data ?? []).map((n: any) => (
                  <li key={n.id} className="reg-item">
                    <div className="reg-top"><div><strong className="cell-strong">{n.programme?.title}</strong><div className="cell-sub num">{fmtDate(n.programme?.startDate)} – {fmtDate(n.programme?.endDate)}</div>{n.remarks && <div className="cell-sub">“{n.remarks}”</div>}</div>
                    <Badge tone={statusTone(n.status)} dot>{pretty(n.status)}</Badge></div>
                    <ProgrammeLifecycle compact stages={{}} current={stageOf(n)} />
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        </div>
        <div className="span-7">
          <Surface eyebrow="Open for registration" title="Programmes">
            {programmes.loading && !programmes.data ? <LoadingBlock /> : programmes.error ? <ErrorState detail={programmes.error} onRetry={programmes.reload} /> : (programmes.data ?? []).length === 0 ? <EmptyState title="No programmes are open right now" /> : (
              <ul className="rows rows-flush">
                {(programmes.data ?? []).filter((p: any) => !['COMPLETED', 'CANCELLED'].includes(p.status)).map((p: any) => (
                  <li key={p.id}>
                    <div><strong className="cell-strong">{p.title}</strong><div className="cell-sub">{p.location} · {p.durationDays} days · {p.mode}</div><div className="cell-sub num">{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</div></div>
                    <Button size="sm" variant="primary" loading={busy === p.id} disabled={registered.has(p.id)} onClick={() => register(p)}>{registered.has(p.id) ? 'Registered' : 'Register'}</Button>
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        </div>
      </div>
    </>
  );
}
