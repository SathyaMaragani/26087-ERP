import { useState, type FormEvent } from 'react';
import { Award, BadgeCheck, Copy, Plus, Printer, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { navigate } from '../lib/route';
import { useAsync } from '../lib/useAsync';
import { useToast } from '../state/toast';
import type { UserPersona } from '../types';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { Button, EmptyState, ErrorState, LoadingBlock, PageHeader, Surface } from '../ui/primitives';
import { CredentialCard } from '../ui/CredentialCard';
import { JourneyStrip } from '../ui/Lifecycle';
import { fmtDate } from '../features/home/shared';

interface Cert { number: string; title: string; issued?: string; status?: string; grade?: string; skills?: string[]; issuedBy?: string; recipient?: string }

const verifyLink = (n: string) => `${window.location.origin}${window.location.pathname}#/verify/${encodeURIComponent(n)}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** A real, printable credential built from the certificate's own data — "Save as PDF" from the print dialog. */
function printCertificate(c: Cert) {
  const w = window.open('', '_blank', 'width=900,height=650');
  if (!w) return false;
  w.document.write(`<!doctype html><title>${esc(c.number)}</title><style>
    body{margin:0;font-family:Georgia,serif;color:#14181c;display:grid;place-items:center;min-height:100vh}
    .c{width:820px;padding:56px;border:6px double #b8703f;text-align:center}
    small{letter-spacing:.3em;text-transform:uppercase;font:600 11px system-ui;color:#555}
    h1{font-weight:400;font-size:44px;margin:14px 0 6px} h2{font-weight:400;font-style:italic;color:#2f3fb8;font-size:34px;margin:20px 0}
    p{margin:8px 0;font-size:16px;color:#333} .m{font:13px ui-monospace,monospace;margin-top:34px;color:#555;word-break:break-all}
  </style><div class="c"><small>National Council for Cooperative Training</small><h1>Certificate of Completion</h1>
  <p>This credential is issued to</p><h2>${esc(c.recipient ?? '')}</h2><p>for</p><p><strong>${esc(c.title)}</strong></p>
  ${c.grade ? `<p>Grade: ${esc(c.grade)}</p>` : ''}${c.skills?.length ? `<p>Competencies: ${esc(c.skills.join(', '))}</p>` : ''}
  <p>${c.issued ? 'Issued ' + esc(fmtDate(c.issued)) : ''}${c.issuedBy ? ' · ' + esc(c.issuedBy) : ''}</p>
  <div class="m">Certificate ID ${esc(c.number)}<br>Verify: ${esc(verifyLink(c.number))}</div></div>
  <script>onload=()=>setTimeout(()=>print(),250)</script>`);
  w.document.close();
  return true;
}

function CertCard({ c }: { c: Cert }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(verifyLink(c.number)); toast.success('Verification link copied', 'Anyone can open it — no sign-in needed.'); }
    catch { toast.warning('Could not copy automatically', verifyLink(c.number)); }
  };
  const cred = { number: c.number, title: c.title, recipient: c.recipient, issued: c.issued, grade: c.grade, skills: c.skills, issuer: c.issuedBy, status: c.status };
  return (
    <article className="cert-item">
      <button className="cert-open" onClick={() => setOpen(true)} aria-label={`Open credential ${c.title}`}><CredentialCard c={cred} compact /></button>
      <div className="cert-actions">
        <Button size="sm" icon={<ShieldCheck size={14} />} onClick={() => navigate(`#/verify/${encodeURIComponent(c.number)}`)}>Verify</Button>
        <Button size="sm" icon={<Copy size={14} />} onClick={copy}>Copy link</Button>
        <Button size="sm" icon={<Printer size={14} />} onClick={() => { if (!printCertificate(c)) toast.warning('Pop-up blocked', 'Allow pop-ups to print or save as PDF.'); }}>Print / PDF</Button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Digital credential" width={760}>
        <CredentialCard c={cred} />
        {c.skills && c.skills.length > 0 && <><div className="eyebrow vskills-h">Competencies certified</div><ul className="skill-chips">{c.skills.map((s) => <li key={s} className="is-held"><BadgeCheck size={12} aria-hidden />{s}</li>)}</ul></>}
        <div className="eyebrow vskills-h">Path to this credential</div>
        <JourneyStrip steps={[{ name: 'LEARN', state: 'live' }, { name: 'PRACTICE', state: 'unavailable', hint: 'not tracked' }, { name: 'ASSESS', state: 'unavailable', hint: 'not tracked' }, { name: 'PASS', state: 'unavailable', hint: 'not tracked' }, { name: 'CERTIFY', state: 'live', hint: c.issued ? fmtDate(c.issued) : undefined }]} />
        <p className="cell-sub">Anyone can confirm this credential at {verifyLink(c.number)}</p>
      </Modal>
    </article>
  );
}

export function CertificatesView({ currentPersona, onOpenPublicVerify }: { currentPersona: UserPersona; onOpenPublicVerify: () => void }) {
  const role = currentPersona.role;
  if (role === 'RECRUITER') return <VerifyDesk onOpen={onOpenPublicVerify} />;
  if (role === 'TRAINEE') return <MyCredentials persona={currentPersona} />;
  return <Repository persona={currentPersona} />;
}

/* Recruiters have no access to the repository; verification is their tool. */
function VerifyDesk({ onOpen }: { onOpen: () => void }) {
  return (
    <>
      <PageHeader eyebrow="Credentials" title={<>Trust, <em className="serif-em">verified</em></>} description="Check any NCCT certificate a candidate presents. You see the credential, not the candidate's whole profile." />
      <Surface><EmptyState icon={<ShieldCheck size={24} />} title="Verify a certificate" detail="Enter the certificate ID or scan its QR code. Signature and status are checked live." action={<Button variant="primary" icon={<ShieldCheck size={15} />} onClick={onOpen}>Open the verifier</Button>} /></Surface>
    </>
  );
}

/* Trainees can't read the certificate API (no certificate:read), so this uses their own dashboard record. */
function MyCredentials({ persona }: { persona: UserPersona }) {
  const dash = useAsync(() => api.analytics.getTrainee(), []);
  const certs: Cert[] = (dash.data?.recentCertificates ?? []).map((c: any) => ({ number: c.certificateNumber, title: c.title, issued: c.issuedDate, recipient: persona.name }));
  return (
    <>
      <PageHeader eyebrow="Credentials" title={<>My <em className="serif-em">certificates</em></>} description="Share a link and anyone can verify it instantly." />
      {dash.loading && !dash.data ? <LoadingBlock /> : dash.error ? <ErrorState detail={dash.error} onRetry={dash.reload} /> : certs.length === 0 ? (
        <Surface><EmptyState icon={<Award size={22} />} title="No certificates yet" detail="Complete a programme and its assessment to earn one." /></Surface>
      ) : <div className="cert-grid">{certs.map((c) => <CertCard key={c.number} c={c} />)}</div>}
    </>
  );
}

/* Staff repository with issuing. */
function Repository({ persona }: { persona: UserPersona }) {
  const list = useAsync(() => api.certifications.list(), []);
  const canIssue = ['NCCT_ADMIN', 'RICM_DIRECTOR', 'RICM_COORDINATOR'].includes(persona.role);
  const [open, setOpen] = useState(false);
  const certs: Cert[] = (list.data ?? []).map((c: any) => ({
    number: c.certificateNumber, title: c.title, issued: c.issuedDate, status: c.status, grade: c.grade, skills: c.skillsAcquired,
    issuedBy: c.metadata?.issuedBy, recipient: c.trainee?.user ? `${c.trainee.user.firstName} ${c.trainee.user.lastName}` : undefined,
  }));
  return (
    <>
      <PageHeader eyebrow="Credentials" title={<>Signed, <em className="serif-em">verifiable</em></>} description="Every certificate carries a public verification link and QR."
        actions={canIssue && <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>Issue certificate</Button>} />
      {list.loading && !list.data ? <LoadingBlock label="Loading certificates" /> : list.error ? <ErrorState detail={list.error} onRetry={list.reload} /> : certs.length === 0 ? (
        <Surface><EmptyState icon={<Award size={22} />} title="No certificates issued yet" detail={canIssue ? 'Issue one when a trainee completes a programme.' : undefined} /></Surface>
      ) : (
        <div className="cert-grid">{certs.map((c) => <div key={c.number}>{c.recipient && <div className="cert-for cell-sub">{c.recipient}</div>}<CertCard c={c} /></div>)}</div>
      )}
      <IssueModal open={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); list.reload(); }} />
    </>
  );
}

function IssueModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const trainees = useAsync(() => (open ? api.trainees.list() : Promise.resolve([] as any[])), [open]);
  const programmes = useAsync(() => (open ? api.programmes.list() : Promise.resolve([] as any[])), [open]);
  const [f, setF] = useState({ traineeId: '', programmeId: '', title: '', skills: '', grade: '' });
  const [busy, setBusy] = useState(false);
  const pickProgramme = (id: string) => { const p = (programmes.data ?? []).find((x: any) => x.id === id); setF((c) => ({ ...c, programmeId: id, title: c.title || (p ? `NCCT Certificate — ${p.title}` : '') })); };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const skillsAcquired = f.skills.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await api.certifications.issue({ traineeId: f.traineeId, programmeId: f.programmeId, title: f.title.trim(), skillsAcquired, ...(f.grade.trim() && { grade: f.grade.trim() }) });
      toast.success('Certificate issued', res?.certificateNumber ?? f.title);
      setF({ traineeId: '', programmeId: '', title: '', skills: '', grade: '' });
      onDone();
    } catch (err) { toast.error('Could not issue the certificate', err instanceof Error ? err.message : undefined); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Issue a certificate" width={560}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Trainee" wide>{(p) => <select {...p} required value={f.traineeId} onChange={(e) => setF({ ...f, traineeId: e.target.value })}><option value="">Select a trainee…</option>{(trainees.data ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName} · {t.traineeCode}</option>)}</select>}</Field>
        <Field label="Programme" wide>{(p) => <select {...p} required value={f.programmeId} onChange={(e) => pickProgramme(e.target.value)}><option value="">Select a programme…</option>{(programmes.data ?? []).map((g: any) => <option key={g.id} value={g.id}>{g.title}</option>)}</select>}</Field>
        <Field label="Certificate title" wide>{(p) => <input {...p} required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field>
        <Field label="Skills acquired" wide hint="Comma separated. These become verified trainee skills used for job matching.">{(p) => <input {...p} value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} />}</Field>
        <Field label="Grade (optional)" wide>{(p) => <input {...p} value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} />}</Field>
        <div className="form-actions span-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy} disabled={!f.traineeId || !f.programmeId}>Issue</Button></div>
      </form>
    </Modal>
  );
}
