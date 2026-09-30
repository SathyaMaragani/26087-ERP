import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { api } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { Funnel } from '../../ui/charts';
import { Metric } from '../../ui/Metric';
import { MatchNetwork } from '../../ui/MatchNetwork';
import { Badge, Button, EmptyState, PageHeader, Surface } from '../../ui/primitives';
import { Async, firstName, greeting, statusTone, type HomeProps } from './shared';

export function RecruiterHome({ persona, onNavigate }: HomeProps) {
  const dash = useAsync(() => api.analytics.getEmployer(), []);
  const jobs = useAsync(() => api.employment.getJobs(), []);
  const [picked, setPicked] = useState<string>('');
  const job = jobs.data?.find((j: any) => j.id === picked) ?? jobs.data?.find((j: any) => j.status === 'OPEN') ?? jobs.data?.[0];
  const matches = useAsync(() => (job ? api.employment.matchCandidates(job.id) : Promise.resolve(null)), [job?.id]);

  return (
    <>
      <PageHeader eyebrow="Talent Intelligence" title={<>{greeting()}, {firstName(persona.name)}</>} description={dash.data?.employer?.companyName ?? persona.instituteName}
        actions={<Button variant="primary" onClick={() => onNavigate('employment')}>Post or manage jobs</Button>} />
      <div className="home-grid">
        <div className="span-12">
          <Async state={dash} label="Loading hiring overview">
            {(d) => {
              const k = d.kpis ?? {};
              return (
                <div className="kpi-row">
                  <Metric label="Active jobs" value={k.activeJobs ?? 0} tone="copper" />
                  <Metric label="Applications" value={k.totalApplications ?? 0} tone="teal" />
                  <Metric label="Shortlisted" value={k.shortlistedCandidates ?? 0} tone="indigo" />
                  <Metric label="Interviews" value={k.interviewsScheduled ?? 0} tone="amber" />
                </div>
              );
            }}
          </Async>
        </div>

        <div className="span-12">
          <Surface eyebrow="Talent matching network" title="Job → required skills → verified candidates"
            action={(jobs.data ?? []).length > 1 ? <select className="toolbar-select" aria-label="Vacancy" value={job?.id ?? ''} onChange={(e) => setPicked(e.target.value)}>{(jobs.data ?? []).map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}</select> : undefined}>
            {!job && !jobs.loading ? <EmptyState title="Post a vacancy to see matches" detail="Candidates connect to a role only through skills they hold and have had verified." /> : (
              <Async state={matches} label="Scoring candidates">
                {(m) => !m || m.topMatches.length === 0 ? <EmptyState title="No candidate holds a matching skill yet" detail="They appear as soon as a trainee earns a verified skill this role requires." /> : (
                  <MatchNetwork jobTitle={m.job.title} required={m.job.requiredSkills} candidates={m.topMatches.map((c) => ({ id: c.traineeId, name: c.name, score: c.matchScorePercent, matched: c.matchedSkills, certified: c.hasCertificates }))} />
                )}
              </Async>
            )}
          </Surface>
        </div>

        <div className="span-5">
          <Surface eyebrow="Hiring funnel" title="From application to interview">
            <Async state={dash}>
              {(d) => (d.kpis?.totalApplications ?? 0) === 0 ? <EmptyState title="No applications yet" detail="Candidates who apply to your vacancies will flow through here." /> : (
                <Funnel stages={[
                  { label: 'Applications', value: d.kpis.totalApplications },
                  { label: 'Shortlisted', value: d.kpis.shortlistedCandidates },
                  { label: 'Interviews', value: d.kpis.interviewsScheduled },
                ]} />
              )}
            </Async>
          </Surface>
        </div>

        <div className="span-7">
          <Surface eyebrow="Ranked" title="Best matches" action={<Button size="sm" onClick={() => onNavigate('employment')}>All candidates</Button>} pad={false}>
            <Async state={matches} label="Ranking">
              {(m) => !m || m.topMatches.length === 0 ? <div className="surface-body"><EmptyState title="Nothing to rank yet" /></div> : (
                <ul className="rows">
                  {m.topMatches.slice(0, 6).map((c) => (
                    <li key={c.traineeId}>
                      <div>
                        <strong className="cell-strong">{c.name}</strong>
                        <div className="cell-sub">{c.matchedSkills.length} of {m.job.requiredSkills.length} required skills{c.hasCertificates && <> · <BadgeCheck size={12} className="inline-icon" aria-label="Certified" /> certified</>}</div>
                      </div>
                      <div className="score" role="img" aria-label={`${c.matchScorePercent}% match`}>
                        <div className="mini-bar"><i style={{ width: `${c.matchScorePercent}%` }} /></div>
                        <span className="num">{c.matchScorePercent}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Async>
          </Surface>
        </div>

        <div className="span-12">
          <Surface eyebrow="Vacancies" title="Your open roles" pad={false}>
            <Async state={jobs}>
              {(list) => list.length === 0 ? <div className="surface-body"><EmptyState title="No vacancies posted" /></div> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Role</th><th>Location</th><th>Required skills</th><th>Vacancies</th><th>Status</th></tr></thead>
                    <tbody>
                      {list.map((j: any) => (
                        <tr key={j.id}>
                          <td><strong className="cell-strong">{j.title}</strong></td>
                          <td>{j.location}</td>
                          <td>{(j.requiredSkills ?? []).map((s: string) => <span key={s} className="chip-sm">{s}</span>)}</td>
                          <td className="num">{j.vacancies}</td>
                          <td><Badge tone={statusTone(j.status)} dot>{j.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Async>
          </Surface>
        </div>
      </div>
    </>
  );
}
