import { useMemo, useState, type FormEvent } from 'react';
import { BadgeCheck, Briefcase, CalendarClock, MapPin, Plus, Search, Send, Users } from 'lucide-react';
import { api, ApiError, type MatchResult } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { useToast } from '../state/toast';
import type { UserPersona } from '../types';
import { Drawer, Modal } from '../ui/Modal';
import { Badge, Button, EmptyState, ErrorState, LoadingBlock, PageHeader, Surface } from '../ui/primitives';
import { fmtDate, statusTone } from '../features/home/shared';
import { JourneyStrip } from '../ui/Lifecycle';
import { MatchNetwork } from '../ui/MatchNetwork';

const norm = (s: string) => s.trim().toLowerCase();
/** Same rule the server uses: substring match either way. */
const holds = (owned: string[], required: string) => owned.some((o) => norm(o).includes(norm(required)) || norm(required).includes(norm(o)));

export function EmploymentExchangeView({ currentPersona }: { currentPersona: UserPersona }) {
  const toast = useToast();
  const role = currentPersona.role;
  const isTrainee = role === 'TRAINEE';
  const canPost = role === 'NCCT_ADMIN' || role === 'RECRUITER';
  const canReview = !isTrainee;

  const jobs = useAsync(() => api.employment.getJobs(), []);
  const mine = useAsync(() => (isTrainee ? api.analytics.getTrainee() : Promise.resolve(null)), [isTrainee]);
  const employerProfile = useAsync(() => (role === 'RECRUITER' ? api.analytics.getEmployer() : Promise.resolve(null)), [role]);
  const employers = useAsync(() => (role === 'NCCT_ADMIN' ? api.employment.getEmployers() : Promise.resolve([] as any[])), [role]);

  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<string | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [matchJob, setMatchJob] = useState<any | null>(null);
  const [appsJob, setAppsJob] = useState<any | null>(null);

  const ownedSkills: string[] = useMemo(() => (mine.data?.skills ?? []).map((s: any) => s.name), [mine.data]);

  const apps = useAsync(() => (isTrainee ? Promise.resolve([] as any[]) : api.employment.getApplications()), [isTrainee]);
  const regs = useAsync(() => (isTrainee ? api.nominations.mine() : Promise.resolve([] as any[])), [isTrainee]);
  const appliedCount = Object.keys(applied).length;
  const selected = (apps.data ?? []).filter((a: any) => a.status === 'SELECTED').length;
  const story = [
    { name: 'TRAINING', state: 'live' as const, count: isTrainee ? (regs.data ?? []).filter((r: any) => ['ENROLLED', 'COMPLETED'].includes(r.status)).length : undefined, hint: isTrainee ? 'Programmes enrolled' : 'Trainees in programmes' },
    { name: 'SKILLS', state: 'live' as const, count: isTrainee ? ownedSkills.length : undefined, hint: 'Verified by institutions' },
    { name: 'CERTIFICATION', state: 'live' as const, count: isTrainee ? mine.data?.kpis?.certificatesEarned : undefined, hint: 'Public, checkable' },
    { name: 'JOB DISCOVERY', state: 'live' as const, count: (jobs.data ?? []).length, hint: 'Open vacancies' },
    { name: 'APPLICATION', state: 'live' as const, count: isTrainee ? appliedCount : (apps.data ?? []).length, hint: isTrainee ? 'This session' : 'Received' },
    { name: 'EMPLOYMENT', state: isTrainee ? ('unavailable' as const) : ('live' as const), count: isTrainee ? undefined : selected, hint: isTrainee ? 'Not visible to learners' : 'Selected' },
    { name: 'OUTCOME', state: 'unavailable' as const, hint: 'Recorded per placement; no list endpoint' },
  ];

  const filtered = useMemo(() => {
    const q = norm(query);
    return (jobs.data ?? []).filter((j: any) => !q || `${j.title} ${j.location} ${j.employer?.companyName ?? ''} ${(j.requiredSkills ?? []).join(' ')}`.toLowerCase().includes(q));
  }, [jobs.data, query]);

  const apply = async (job: any) => {
    if (!currentPersona.traineeId) { toast.error('Your trainee profile could not be found', 'Sign out and back in, or contact your institution.'); return; }
    setApplying(job.id);
    try {
      await api.employment.applyJob(job.id, currentPersona.traineeId);
      setApplied((a) => ({ ...a, [job.id]: true }));
      toast.success('Application sent', `${job.employer?.companyName ?? 'The employer'} can now see your verified NCCT profile.`);
      jobs.reload();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setApplied((a) => ({ ...a, [job.id]: true }));
      toast.error(e instanceof ApiError && e.status === 409 ? 'Already applied' : 'Could not apply', e instanceof Error ? e.message : undefined);
    } finally {
      setApplying(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Employment exchange" title={<>Skills meet <em className="serif-em">work</em></>}
        description={isTrainee ? 'Open roles across the cooperative sector, with how your verified skills fit each one.' : 'Post vacancies and rank candidates by verified skills — deterministic and explainable.'}
        actions={canPost && <Button variant="primary" icon={<Plus size={15} />} onClick={() => setPostOpen(true)}>Post a job</Button>} />

      <div className="story">
        <div className="eyebrow">The employment ecosystem</div>
        <JourneyStrip steps={story} />
      </div>

      <div className="search-row">
        <Search size={16} aria-hidden />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search roles, employers, locations or skills" aria-label="Search jobs" />
      </div>

      {jobs.loading && !jobs.data ? <LoadingBlock label="Loading vacancies" /> : jobs.error ? <ErrorState detail={jobs.error} onRetry={jobs.reload} /> : filtered.length === 0 ? (
        <Surface><EmptyState icon={<Briefcase size={22} />} title={query ? 'No roles match your search' : 'No open vacancies'} detail={query ? undefined : canPost ? 'Post the first vacancy to start matching candidates.' : 'New vacancies will appear here as employers post them.'} /></Surface>
      ) : (
        <ul className="job-list">
          {filtered.map((j: any) => {
            const req: string[] = j.requiredSkills ?? [];
            const have = req.filter((r) => holds(ownedSkills, r));
            const done = applied[j.id];
            return (
              <li key={j.id} className="job">
                <div className="job-main">
                  <div className="job-head">
                    <h3>{j.title}</h3>
                    <Badge tone={statusTone(j.status)} dot>{j.status}</Badge>
                  </div>
                  <div className="job-meta">
                    <span>{j.employer?.companyName}</span>
                    <span><MapPin size={13} aria-hidden /> {j.location}</span>
                    <span><Users size={13} aria-hidden /> {j.vacancies} vacanc{j.vacancies === 1 ? 'y' : 'ies'}</span>
                    {j.salaryRange && <span className="num">{j.salaryRange}</span>}
                    {j.deadline && <span><CalendarClock size={13} aria-hidden /> Apply by {fmtDate(j.deadline)}</span>}
                  </div>
                  <p className="job-desc">{j.description}</p>
                  <ul className="skill-chips" aria-label="Required skills">
                    {req.map((r) => <li key={r} className={isTrainee && holds(ownedSkills, r) ? 'is-held' : ''}>{isTrainee && holds(ownedSkills, r) && <BadgeCheck size={12} aria-label="You hold this skill" />}{r}</li>)}
                  </ul>
                </div>
                <div className="job-side">
                  {isTrainee ? (
                    <>
                      <div className="fit" aria-label={`You hold ${have.length} of ${req.length} required skills`}>
                        <span className="num fit-score">{req.length ? Math.round((have.length / req.length) * 100) : 100}%</span>
                        <span className="cell-sub">skill fit · {have.length} of {req.length}</span>
                      </div>
                      <Button variant="primary" loading={applying === j.id} disabled={done} icon={<Send size={14} />} onClick={() => apply(j)}>{done ? 'Applied' : 'Apply'}</Button>
                    </>
                  ) : (
                    <>
                      <div className="cell-sub num">{j._count?.applications ?? 0} application{(j._count?.applications ?? 0) === 1 ? '' : 's'}</div>
                      {canReview && <Button size="sm" variant="primary" onClick={() => setMatchJob(j)}>Find candidates</Button>}
                      {canReview && <Button size="sm" onClick={() => setAppsJob(j)}>Applications</Button>}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PostJobModal open={postOpen} onClose={() => setPostOpen(false)} role={role}
        ownEmployerId={employerProfile.data?.employer?.id} employers={employers.data ?? []}
        onPosted={() => { setPostOpen(false); jobs.reload(); toast.success('Vacancy posted', 'It is now open for applications and skill matching.'); }} />
      <CandidatesDrawer job={matchJob} onClose={() => setMatchJob(null)} />
      <ApplicationsDrawer job={appsJob} onClose={() => setAppsJob(null)} />
    </>
  );
}

/* ---------------------------------------------------------------- Post job */
function PostJobModal({ open, onClose, role, ownEmployerId, employers, onPosted }: {
  open: boolean; onClose: () => void; role: string; ownEmployerId?: string; employers: any[]; onPosted: () => void;
}) {
  const toast = useToast();
  const [employerId, setEmployerId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [location, setLocation] = useState('');
  const [vacancies, setVacancies] = useState('1');
  const [salaryRange, setSalaryRange] = useState('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);

  const effectiveEmployer = role === 'RECRUITER' ? ownEmployerId : employerId;
  const requiredSkills = skills.split(',').map((s) => s.trim()).filter(Boolean);
  const valid = !!effectiveEmployer && title.trim() && description.trim() && location.trim() && requiredSkills.length > 0 && Number(vacancies) >= 1;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      await api.employment.postJob({
        employerId: effectiveEmployer, title: title.trim(), description: description.trim(), requiredSkills,
        location: location.trim(), vacancies: Number(vacancies),
        ...(salaryRange.trim() && { salaryRange: salaryRange.trim() }),
        ...(deadline && { deadline: new Date(deadline).toISOString() }),
      });
      setTitle(''); setDescription(''); setSkills(''); setLocation(''); setVacancies('1'); setSalaryRange(''); setDeadline('');
      onPosted();
    } catch (err) {
      toast.error('Could not post the vacancy', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Post a vacancy" width={620}>
      <form className="form-grid" onSubmit={submit}>
        {role !== 'RECRUITER' && (
          <div className="field span-2">
            <label htmlFor="pj-emp">Employer</label>
            <select id="pj-emp" required value={employerId} onChange={(e) => setEmployerId(e.target.value)}>
              <option value="">Select an employer…</option>
              {employers.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.companyName}</option>)}
            </select>
          </div>
        )}
        <div className="field span-2"><label htmlFor="pj-title">Role title</label><input id="pj-title" required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="field span-2"><label htmlFor="pj-desc">Description</label><textarea id="pj-desc" rows={3} required value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="field span-2">
          <label htmlFor="pj-skills">Required skills <span className="cell-sub">— comma separated, matched against verified trainee skills</span></label>
          <input id="pj-skills" required value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="PACS Accounting, Digital Payments & UPI Integration" />
          {requiredSkills.length > 0 && <ul className="skill-chips">{requiredSkills.map((s) => <li key={s}>{s}</li>)}</ul>}
        </div>
        <div className="field"><label htmlFor="pj-loc">Location</label><input id="pj-loc" required value={location} onChange={(e) => setLocation(e.target.value)} /></div>
        <div className="field"><label htmlFor="pj-vac">Vacancies</label><input id="pj-vac" type="number" min={1} required value={vacancies} onChange={(e) => setVacancies(e.target.value)} /></div>
        <div className="field"><label htmlFor="pj-sal">Salary range <span className="cell-sub">(optional)</span></label><input id="pj-sal" value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} /></div>
        <div className="field"><label htmlFor="pj-dl">Application deadline <span className="cell-sub">(optional)</span></label><input id="pj-dl" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
        {role === 'RECRUITER' && !ownEmployerId && <p className="form-error span-2" role="alert">Your employer profile could not be loaded, so a vacancy can't be posted yet.</p>}
        <div className="form-actions span-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy} disabled={!valid}>Post vacancy</Button></div>
      </form>
    </Modal>
  );
}

/* --------------------------------------------------------------- Candidates */
function CandidatesDrawer({ job, onClose }: { job: any | null; onClose: () => void }) {
  const state = useAsync<MatchResult | null>(() => (job ? api.employment.matchCandidates(job.id) : Promise.resolve(null)), [job?.id]);
  const req: string[] = state.data?.job.requiredSkills ?? job?.requiredSkills ?? [];
  return (
    <Drawer open={!!job} onClose={onClose} title={job ? `Candidates · ${job.title}` : 'Candidates'} width={720}>
      {state.loading ? <LoadingBlock label="Scoring candidates" /> : state.error ? <ErrorState detail={state.error} onRetry={state.reload} /> : !state.data || state.data.topMatches.length === 0 ? (
        <EmptyState title="No candidate holds a matching skill yet" detail="Candidates appear once they earn a verified skill that this role requires." />
      ) : (
        <>
          <p className="cell-sub">{state.data.topMatches.length} matching of {state.data.totalCandidatesEvaluated} evaluated. Score = share of required skills the candidate holds.</p>
          <MatchNetwork jobTitle={state.data.job.title} required={state.data.job.requiredSkills} candidates={state.data.topMatches.map((c) => ({ id: c.traineeId, name: c.name, score: c.matchScorePercent, matched: c.matchedSkills, certified: c.hasCertificates }))} />
          <ul className="cand-list">
            {state.data.topMatches.map((c) => {
              const missing = req.filter((r) => !holds(c.matchedSkills, r));
              return (
                <li key={c.traineeId}>
                  <div className="cand-top">
                    <div>
                      <strong className="cell-strong">{c.name}</strong>
                      <div className="cell-sub">{[c.cooperativeAffiliation, c.district, c.state].filter(Boolean).join(' · ') || c.traineeCode}</div>
                    </div>
                    {c.hasCertificates && <Badge tone="green" dot>{c.certificatesEarnedCount} certified</Badge>}
                  </div>
                  <div className="score" role="img" aria-label={`${c.matchScorePercent}% match`}><div className="mini-bar"><i style={{ width: `${c.matchScorePercent}%` }} /></div><span className="num">{c.matchScorePercent}%</span></div>
                  <ul className="skill-chips">
                    {c.matchedSkills.map((s) => <li key={s} className="is-held"><BadgeCheck size={12} aria-hidden />{s}</li>)}
                    {missing.map((s) => <li key={s} className="is-missing">{s}</li>)}
                  </ul>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Drawer>
  );
}

/* ------------------------------------------------------------- Applications */
function ApplicationsDrawer({ job, onClose }: { job: any | null; onClose: () => void }) {
  const toast = useToast();
  const state = useAsync(() => (job ? api.employment.getApplications(job.id) : Promise.resolve([] as any[])), [job?.id]);
  const [placing, setPlacing] = useState<any | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pkg, setPkg] = useState('');
  const [busy, setBusy] = useState(false);

  const record = async (e: FormEvent) => {
    e.preventDefault();
    if (!placing || !job) return;
    setBusy(true);
    try {
      await api.employment.recordOutcome({
        traineeId: placing.traineeId, employerName: job.employer?.companyName, jobTitle: job.title,
        placementDate: new Date(date).toISOString(), ...(pkg && { annualPackage: Number(pkg) }),
      });
      toast.success('Placement recorded', 'It now counts toward the employment-linkage figure.');
      setPlacing(null); setPkg('');
    } catch (err) {
      toast.error('Could not record the placement', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Drawer open={!!job} onClose={onClose} title={job ? `Applications · ${job.title}` : 'Applications'} width={520}>
        {state.loading ? <LoadingBlock label="Loading applications" /> : state.error ? <ErrorState detail={state.error} onRetry={state.reload} /> : (state.data ?? []).length === 0 ? (
          <EmptyState title="No applications yet" />
        ) : (
          <ul className="cand-list">
            {(state.data ?? []).map((a: any) => (
              <li key={a.id}>
                <div className="cand-top">
                  <div><strong className="cell-strong">{a.trainee?.user?.firstName} {a.trainee?.user?.lastName}</strong><div className="cell-sub">Applied {fmtDate(a.appliedAt ?? a.createdAt)}</div></div>
                  <Badge tone={statusTone(a.status)} dot>{String(a.status).replace('_', ' ')}</Badge>
                </div>
                <div className="score" role="img" aria-label={`${a.matchScore}% match`}><div className="mini-bar"><i style={{ width: `${a.matchScore ?? 0}%` }} /></div><span className="num">{a.matchScore ?? 0}%</span></div>
                <Button size="sm" onClick={() => setPlacing(a)}>Record placement</Button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
      <Modal open={!!placing} onClose={() => setPlacing(null)} title="Record a placement" width={460}>
        <form className="form-grid" onSubmit={record}>
          <p className="cell-sub span-2">Confirm that {placing?.trainee?.user?.firstName} {placing?.trainee?.user?.lastName} was placed as <strong>{job?.title}</strong> at {job?.employer?.companyName}.</p>
          <div className="field"><label htmlFor="pl-date">Placement date</label><input id="pl-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field"><label htmlFor="pl-pkg">Annual package (₹) <span className="cell-sub">optional</span></label><input id="pl-pkg" type="number" min={0} value={pkg} onChange={(e) => setPkg(e.target.value)} /></div>
          <div className="form-actions span-2"><Button type="button" variant="ghost" onClick={() => setPlacing(null)}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>Record placement</Button></div>
        </form>
      </Modal>
    </>
  );
}
