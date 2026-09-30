import { lazy, Suspense, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { api, tenantApi } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { useDeviceTier } from '../lib/device';
import type { UserPersona } from '../types';
import { BarList, Donut, Funnel, RadialGauge } from '../ui/charts';
import { Metric } from '../ui/Metric';
import { withCertificates } from '../lib/useTraineePool';
import { EmptyState, ErrorState, LoadingBlock, PageHeader, Surface, Tabs } from '../ui/primitives';

const IndiaPulse = lazy(() => import('../scene/IndiaPulse'));
type Tab = 'training' | 'institutions' | 'skills' | 'employment' | 'outreach';
const pretty = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

interface Bundle {
  scopeNote: string;
  cc: any; inst: any;
  orgs: Array<{ org: any; programmes: any[]; trainees: any[]; occupancy: any | null }>;
  jobs: any[]; applications: any[]; employmentVisible: boolean;
  gaps: string[];
}

/** One load, many questions. Failures degrade a section instead of blanking the page. */
async function load(persona: UserPersona): Promise<Bundle> {
  const gaps: string[] = [];
  const guard = async <T,>(label: string, p: Promise<T>, fallback: T): Promise<T> => { try { return await p; } catch (e) { gaps.push(`${label}: ${e instanceof Error ? e.message : 'unavailable'}`); return fallback; } };
  const isAdmin = persona.role === 'NCCT_ADMIN';
  const employmentVisible = persona.role === 'NCCT_ADMIN' || persona.role === 'RICM_DIRECTOR';
  const [cc, inst, allOrgs, jobs, applications] = await Promise.all([
    guard('National indicators', api.analytics.getCommandCenter(), null),
    guard('Institution indicators', api.analytics.getInstitution(), null),
    isAdmin ? guard('Institutions', api.organizations.list(), [] as any[]) : Promise.resolve([{ id: persona.organizationId, name: persona.instituteName, institutionType: 'RICM' }]),
    employmentVisible ? guard('Vacancies', api.employment.getJobs(), [] as any[]) : Promise.resolve([] as any[]),
    employmentVisible ? guard('Applications', api.employment.getApplications(), [] as any[]) : Promise.resolve([] as any[]),
  ]);
  const targets = allOrgs.filter((o: any) => o.institutionType !== 'NCCT_HQ');
  const orgs = await Promise.all(targets.map(async (org: any) => {
    const t = tenantApi(org.id);
    const [programmes, rawTrainees, certs, occupancy] = await Promise.all([
      guard(`${org.name} programmes`, t.programmes(), [] as any[]),
      guard(`${org.name} trainees`, t.trainees(), [] as any[]),
      guard(`${org.name} certificates`, t.certificates(), [] as any[]),
      guard(`${org.name} hostel`, t.occupancy(), null),
    ]);
    return { org, programmes, trainees: withCertificates(rawTrainees, certs), occupancy };
  }));
  return { scopeNote: isAdmin ? 'Across every institution you can see.' : 'For your institution.', cc, inst, orgs, jobs, applications, employmentVisible, gaps };
}

function Question({ q, hint, children }: { q: string; hint?: string; children: React.ReactNode }) {
  return <Surface eyebrow="The question" title={q}>{hint && <p className="cell-sub q-hint">{hint}</p>}{children}</Surface>;
}

function SupplyDemand({ rows }: { rows: Array<{ skill: string; supply: number; demand: number }> }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.supply, r.demand]));
  return (
    <ul className="sd">
      <li className="sd-head" aria-hidden><span /><span>Trained (supply)</span><span>Requested by employers (demand)</span></li>
      {rows.map((r) => (
        <li key={r.skill} className={r.demand > r.supply ? 'is-gap' : ''}>
          <span className="sd-name">{r.skill}{r.demand > r.supply && <span className="sd-flag"><AlertTriangle size={12} aria-hidden /> shortfall</span>}</span>
          <span className="sd-bar"><i className="s" style={{ width: `${(r.supply / max) * 100}%` }} /><b className="num">{r.supply}</b></span>
          <span className="sd-bar"><i className="d" style={{ width: `${(r.demand / max) * 100}%` }} /><b className="num">{r.demand}</b></span>
        </li>
      ))}
    </ul>
  );
}

export function AnalyticsView({ persona }: { persona: UserPersona }) {
  const [tab, setTab] = useState<Tab>('training');
  const tier = useDeviceTier();
  const state = useAsync(() => load(persona), [persona.role, persona.organizationId]);
  const d = state.data;

  const derived = useMemo(() => {
    if (!d) return null;
    const programmes = d.orgs.flatMap((o) => o.programmes.map((p) => ({ ...p, orgName: o.org.name })));
    const trainees = d.orgs.flatMap((o) => o.trainees);
    const registrations = programmes.reduce((n, p) => n + (p._count?.registrations ?? 0), 0);
    const capacity = programmes.reduce((n, p) => n + (p.capacity ?? 0), 0);
    const supply = new Map<string, number>();
    trainees.forEach((t) => (t.skills ?? []).forEach((s: any) => { const n = s.skill?.name; if (n) supply.set(n, (supply.get(n) ?? 0) + 1); }));
    const demand = new Map<string, number>();
    d.jobs.forEach((j) => (j.requiredSkills ?? []).forEach((s: string) => demand.set(s, (demand.get(s) ?? 0) + (j.vacancies ?? 1))));
    const names = Array.from(new Set([...supply.keys(), ...demand.keys()]));
    const skillRows = names.map((skill) => ({ skill, supply: supply.get(skill) ?? 0, demand: demand.get(skill) ?? 0 })).sort((a, b) => (b.demand - b.supply) - (a.demand - a.supply) || b.demand - a.demand);
    const certified = trainees.filter((t) => (t.certificates ?? []).length > 0).length;
    const byStatus = new Map<string, number>();
    d.applications.forEach((a) => byStatus.set(a.status, (byStatus.get(a.status) ?? 0) + 1));
    const applicants = new Set(d.applications.map((a) => a.traineeId)).size;
    return { programmes, trainees, registrations, capacity, skillRows, certified, byStatus, applicants };
  }, [d]);

  return (
    <>
      <PageHeader eyebrow="Analytics" title={<>Questions, <em className="serif-em">answered</em></>} description={d ? d.scopeNote : 'Every chart answers one operational question.'} />
      <Tabs label="Analytics area" value={tab} onChange={setTab} tabs={[{ id: 'training', label: 'Training' }, { id: 'institutions', label: 'Institutions' }, { id: 'skills', label: 'Skills' }, { id: 'employment', label: 'Employment' }, { id: 'outreach', label: 'Outreach' }]} />

      <div className="att-body">
        {state.loading && !d ? <LoadingBlock label="Reading the national record" /> : state.error ? <ErrorState detail={state.error} onRetry={state.reload} /> : d && derived && (
          <>
            {d.gaps.length > 0 && <div className="alert alert-warn" role="status"><span className="alert-dot" /><span className="alert-text">Some data couldn't be read, so parts of this view are incomplete: {d.gaps.slice(0, 2).join(' · ')}{d.gaps.length > 2 ? ` · +${d.gaps.length - 2} more` : ''}</span></div>}

            {tab === 'training' && (
              <div className="home-grid">
                <div className="span-12 kpi-row">
                  <Metric label="Programmes" value={derived.programmes.length} tone="copper" />
                  <Metric label="Registrations" value={derived.registrations} tone="teal" hint={derived.capacity ? `${Math.round((derived.registrations / derived.capacity) * 100)}% of ${derived.capacity} seats` : undefined} />
                  <Metric label="Attendance" value={d.inst?.kpis?.attendanceRatePercent ?? 0} suffix="%" tone="indigo" hint="Across sessions, your institution" />
                  <Metric label="Completion" value={d.cc?.nationalKpis?.completionRatePercent ?? 0} suffix="%" tone="amber" />
                </div>
                <div className="span-7"><Question q="Are programmes filling their seats?" hint="Registrations against capacity, per programme.">
                  {derived.programmes.length === 0 ? <EmptyState icon={<BarChart3 size={22} />} title="No programmes to measure yet" /> :
                    <BarList tone="teal" items={derived.programmes.map((p) => ({ label: p.title, value: p._count?.registrations ?? 0, sub: `${p.capacity ? Math.round(((p._count?.registrations ?? 0) / p.capacity) * 100) : 0}% of ${p.capacity} seats · ${p.orgName}` }))} />}
                </Question></div>
                <div className="span-5"><Question q="Are trainees finishing, and getting certified?">
                  <div className="gauges"><RadialGauge size={120} label="Completion" value={d.cc?.nationalKpis?.completionRatePercent ?? 0} tone="teal" /><RadialGauge size={120} label="Certification" value={d.cc?.nationalKpis?.certificationRatePercent ?? 0} tone="copper" /></div>
                </Question></div>
                <div className="span-12"><Question q="How well are trainees performing in assessments?">
                  <EmptyState icon={<AlertTriangle size={22} />} title="Not available yet" detail="The platform stores assessment models but its API exposes no assessment results, so scores can't be analysed. This view will populate once assessment routes exist." />
                </Question></div>
              </div>
            )}

            {tab === 'institutions' && (
              <div className="home-grid">
                <div className="span-12"><Question q="Which institutions are carrying the load, and which have room?" hint="Utilisation = registrations ÷ programme capacity; hostel = beds occupied.">
                  {d.orgs.length === 0 ? <EmptyState title="No institutions to compare" /> : (
                    <div className="table-wrap"><table>
                      <thead><tr><th>Institution</th><th>Programmes</th><th>Registrations / capacity</th><th>Trainees on record</th><th>Hostel</th></tr></thead>
                      <tbody>{d.orgs.map(({ org, programmes, trainees, occupancy }) => {
                        const reg = programmes.reduce((n, p) => n + (p._count?.registrations ?? 0), 0), cap = programmes.reduce((n, p) => n + (p.capacity ?? 0), 0);
                        const pct = cap ? Math.min(100, Math.round((reg / cap) * 100)) : 0;
                        return (
                          <tr key={org.id}>
                            <td><strong className="cell-strong">{org.name}</strong><div className="cell-sub">{pretty(org.institutionType ?? '')}{org.state ? ` · ${org.state}` : ''}</div></td>
                            <td className="num">{programmes.length}</td>
                            <td><div className="mini-bar"><i style={{ width: `${pct}%` }} /></div><span className="cell-sub num">{reg} / {cap} · {pct}%</span></td>
                            <td className="num">{trainees.length}</td>
                            <td className="num">{occupancy && occupancy.totalBeds ? `${occupancy.occupiedBeds}/${occupancy.totalBeds} beds` : '—'}</td>
                          </tr>
                        );
                      })}</tbody>
                    </table></div>
                  )}
                </Question></div>
              </div>
            )}

            {!d.employmentVisible && (tab === 'skills' || tab === 'employment') && <div className="alert alert-info" role="status"><span className="alert-dot" /><span className="alert-text">Vacancies and applications aren't visible to your role, so employer demand and application figures are left out of this view.</span></div>}
            {tab === 'skills' && (
              <div className="home-grid">
                <div className="span-12 kpi-row">
                  <Metric label="Skills produced" value={derived.skillRows.filter((r) => r.supply > 0).length} tone="teal" />
                  <Metric label="Skills employers ask for" value={derived.skillRows.filter((r) => r.demand > 0).length} tone="copper" />
                  <Metric label="Certified trainees" value={derived.trainees.length ? Math.round((derived.certified / derived.trainees.length) * 100) : 0} suffix="%" tone="indigo" hint={`${derived.certified} of ${derived.trainees.length}`} />
                </div>
                <div className="span-12"><Question q="Are we training the skills employers actually want?" hint="Supply counts trainees holding a verified skill; demand counts vacancies requiring it. Shortfalls are flagged.">
                  {derived.skillRows.length === 0 ? <EmptyState title="No skill data yet" /> : <SupplyDemand rows={derived.skillRows} />}
                </Question></div>
              </div>
            )}

            {tab === 'employment' && (
              <div className="home-grid">
                <div className="span-12 kpi-row">
                  <Metric label="Open vacancies" value={d.jobs.length} tone="copper" />
                  <Metric label="Applications" value={d.applications.length} tone="teal" />
                  <Metric label="Applicants" value={derived.applicants} tone="indigo" />
                  <Metric label="Employment linkage" value={d.cc?.nationalKpis?.employmentLinkagePercent ?? 0} suffix="%" tone="amber" />
                </div>
                <div className="span-6"><Question q="Is training turning into work?" hint="From everyone trained to those who applied.">
                  <Funnel stages={[{ label: 'Trainees on record', value: derived.trainees.length }, { label: 'Certified', value: derived.certified }, { label: 'Have applied for a role', value: derived.applicants }]} />
                </Question></div>
                <div className="span-6"><Question q="Where do applications stand?">
                  {d.applications.length === 0 ? <EmptyState title="No applications yet" /> : <BarList tone="copper" items={[...derived.byStatus].map(([label, value]) => ({ label: pretty(label), value }))} />}
                </Question></div>
              </div>
            )}

            {tab === 'outreach' && (
              <div className="home-grid">
                <div className="span-8"><Surface pad={false} className="hero-map"><div className="map-canvas">{tier.webgl && <Suspense fallback={null}><IndiaPulse states={d.cc?.statePerformance ?? []} /></Suspense>}</div><div className="map-overlay"><div className="eyebrow">Where are we reaching?</div><div className="map-figures"><Metric label="States" value={(d.cc?.statePerformance ?? []).length} tone="copper" /><Metric label="Institutions" value={d.cc?.nationalKpis?.totalInstitutions ?? 0} tone="teal" /></div></div></Surface></div>
                <div className="span-4"><Question q="Which states carry the participation?">
                  {(d.cc?.statePerformance ?? []).length === 0 ? <EmptyState title="No state data" /> : <BarList tone="copper" items={[...d.cc.statePerformance].sort((a: any, b: any) => b.traineesCount - a.traineesCount).map((s: any) => ({ label: s.state, value: s.traineesCount }))} />}
                </Question></div>
                <div className="span-6"><Question q="Who are we reaching?" hint="Rural youth and cooperative members are the programme's target audiences.">
                  {(d.cc?.targetAudienceDistribution ?? []).length === 0 ? <EmptyState title="No audience data" /> : <Donut items={d.cc.targetAudienceDistribution.map((a: any) => ({ label: a.type, value: a.count }))} />}
                </Question></div>
                <div className="span-6"><Question q="What are we teaching?">
                  {(d.cc?.programmesDistribution ?? []).length === 0 ? <EmptyState title="No programme data" /> : <BarList tone="teal" items={d.cc.programmesDistribution.map((c: any) => ({ label: c.category, value: c.count }))} />}
                </Question></div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
