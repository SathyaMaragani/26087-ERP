import { useMemo, useState } from 'react';
import { BadgeCheck, Sprout } from 'lucide-react';
import { api } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { loadTraineeProfile, useTraineePool } from '../lib/useTraineePool';
import type { UserPersona } from '../types';
import { SkillGraph, type GraphGroup, type GraphSkill } from '../ui/SkillGraph';
import { Metric } from '../ui/Metric';
import { Badge, EmptyState, ErrorState, LoadingBlock, PageHeader, Surface } from '../ui/primitives';
import { fmtDate } from '../features/home/shared';

const LEVEL_MAX = 3;
const fullName = (t: any) => `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || t.traineeCode;

interface Loaded { groups: GraphGroup[]; certificates: number; nextUp: string[]; scope: 'self' | 'staff'; sourceNote?: string }

/** A learner's own record: skills from the dashboard, evidence from the public verification of each credential. */
async function loadSelf(): Promise<Loaded> {
  const dash = await api.analytics.getTrainee();
  const certs: Array<{ certificateNumber: string; title: string }> = dash.recentCertificates ?? [];
  const verified = await Promise.all(certs.map((c) => api.certifications.verifyPublic(c.certificateNumber).catch(() => null)));
  const evidenceFor = (skill: string) => verified.flatMap((v) => {
    const c = v?.certificate;
    if (!c || !(c.skillsAcquired ?? []).some((s: string) => s.toLowerCase() === skill.toLowerCase())) return [];
    return [{ kind: 'certificate' as const, label: c.title, sub: c.programme?.title }];
  });
  const skills: GraphSkill[] = (dash.skills ?? []).map((s: any) => ({ id: s.name, name: s.name, level: s.level, evidence: evidenceFor(s.name) }));
  let nextUp: string[] = [];
  try {
    if (dash.traineeId) { const rec = await api.career.recommendations(dash.traineeId); nextUp = rec.recommendedSkillsToLearn ?? []; }
  } catch { /* recommendations are optional here */ }
  return { groups: skills.length ? [{ category: 'Verified skills', skills }] : [], certificates: certs.length, nextUp, scope: 'self', sourceNote: 'Categories are shown to staff; learners see their skills as one verified set.' };
}

/** Staff view of any trainee, with catalogue categories and the certificates that evidence each skill. */
async function loadTrainee(orgId: string, ownOrgId: string, traineeId: string, canReadCatalogue: boolean): Promise<Loaded> {
  const [t, catalogue] = await Promise.all([loadTraineeProfile(orgId, ownOrgId, traineeId), canReadCatalogue ? api.skills.list().catch(() => [] as any[]) : Promise.resolve([] as any[])]);
  const catOf = new Map<string, string>(catalogue.map((s: any) => [String(s.name).toLowerCase(), s.category?.name ?? 'Other']));
  const skills: Array<GraphSkill & { cat: string }> = (t.skills ?? []).map((s: any) => {
    const name = s.skill?.name ?? 'Skill';
    const evidence = (t.certificates ?? [])
      .filter((c: any) => (c.skillsAcquired ?? []).some((x: string) => x.toLowerCase() === name.toLowerCase()))
      .map((c: any) => ({ kind: 'certificate' as const, label: c.title, sub: c.programme?.title ?? c.certificateNumber }));
    return { id: s.id, name, level: s.level, verifiedAt: s.verifiedAt, evidence, cat: s.skill?.category?.name ?? catOf.get(name.toLowerCase()) ?? 'Other' };
  });
  const byCat = new Map<string, GraphSkill[]>();
  skills.forEach(({ cat, ...s }) => byCat.set(cat, [...(byCat.get(cat) ?? []), s]));
  return { groups: [...byCat].map(([category, list]) => ({ category, skills: list })), certificates: (t.certificates ?? []).length, nextUp: [], scope: 'staff' };
}

export function SkillsView({ persona }: { persona: UserPersona }) {
  const isSelf = persona.role === 'TRAINEE';
  const pool = useTraineePool(persona, !isSelf);
  const [pick, setPick] = useState<string>('');
  const trainees = { data: isSelf ? [] : pool.data ?? [], loading: !isSelf && pool.loading, error: isSelf ? null : pool.error, reload: pool.reload };
  const chosen = isSelf ? null : (trainees.data.find((p) => `${p.orgId}:${p.id}` === pick) ?? trainees.data[0] ?? null);
  const traineeId = isSelf ? 'self' : chosen ? `${chosen.orgId}:${chosen.id}` : '';
  const data = useAsync<Loaded | null>(() => (isSelf ? loadSelf() : chosen ? loadTrainee(chosen.orgId, persona.organizationId, chosen.id, persona.role !== 'RICM_COORDINATOR') : Promise.resolve(null)), [isSelf, traineeId]);
  const [selected, setSelected] = useState<string | null>(null);

  const all = useMemo(() => (data.data?.groups ?? []).flatMap((g) => g.skills.map((s) => ({ ...s, category: g.category }))), [data.data]);
  const sel = all.find((s) => s.id === selected) ?? null;
  const avg = all.length ? all.reduce((n, s) => n + s.level, 0) / all.length : 0;

  return (
    <>
      <PageHeader eyebrow="Skill certification repository" title={<>Skills, with their <em className="serif-em">proof</em></>}
        description="Every skill is tied to the training and credential that verified it. Select a skill to light its chain."
        actions={!isSelf && trainees.data.length > 0 ? (
          <select className="toolbar-select" aria-label="Trainee" value={traineeId} onChange={(e) => { setPick(e.target.value); setSelected(null); }}>
            {trainees.data.map((p) => <option key={`${p.orgId}:${p.id}`} value={`${p.orgId}:${p.id}`}>{fullName(p.raw)} · {p.raw.traineeCode}{persona.role === 'NCCT_ADMIN' ? ` · ${p.orgName}` : ''}</option>)}
          </select>
        ) : undefined} />

      {(isSelf ? false : trainees.loading && !trainees.data) || (data.loading && !data.data) ? <LoadingBlock label="Reading the skill record" /> :
        trainees.error ? <ErrorState detail={trainees.error} onRetry={trainees.reload} /> :
        data.error ? <ErrorState detail={data.error} onRetry={data.reload} /> :
        !data.data || all.length === 0 ? (
          <Surface><EmptyState icon={<Sprout size={22} />} title={!isSelf && trainees.data.length === 0 ? 'No trainees to show yet' : 'No verified skills yet'} detail={isSelf ? 'Skills appear when an institution certifies them after training.' : trainees.data.length === 0 ? 'Trainees appear here once an institution has onboarded them.' : 'This trainee has no verified skills.'} /></Surface>
        ) : (
          <div className="skills-layout">
            <div className="kpi-row skills-kpis">
              <Metric label="Verified skills" value={all.length} tone="teal" />
              <Metric label="Average level" value={Number(avg.toFixed(1))} decimals={1} suffix={` / ${LEVEL_MAX}`} tone="copper" />
              <Metric label="Credentials" value={data.data.certificates} tone="indigo" />
            </div>
            <Surface eyebrow="Skill graph" title="Category → skill → evidence" className="skills-graph" pad={false}>
              <SkillGraph groups={data.data.groups} maxLevel={LEVEL_MAX} selectedId={selected} onSelect={(id) => setSelected((cur) => (cur === id ? null : id))} />
            </Surface>
            <Surface eyebrow={sel ? sel.category : 'Detail'} title={sel ? sel.name : 'Select a skill'} className="skills-detail">
              {!sel ? <p className="cell-sub">Choose a skill in the graph to see its level, evidence and the training behind it.</p> : (
                <div className="skill-detail">
                  <div className="skill-level"><span className="pips" role="img" aria-label={`Level ${sel.level} of ${LEVEL_MAX}`}>{Array.from({ length: LEVEL_MAX }, (_, i) => <i key={i} className={i < sel.level ? 'on' : ''} />)}</span><Badge tone="green" dot>Verified</Badge></div>
                  {sel.verifiedAt && <p className="cell-sub">Verified {fmtDate(sel.verifiedAt)}</p>}
                  <h4 className="eyebrow">Evidence</h4>
                  {sel.evidence.length === 0 ? <p className="cell-sub">No credential on record lists this skill.</p> : (
                    <ul className="rows rows-flush">{sel.evidence.map((e, i) => <li key={i}><div><strong className="cell-strong"><BadgeCheck size={13} className="inline-icon" aria-hidden /> {e.label}</strong>{e.sub && <div className="cell-sub">Training: {e.sub}</div>}</div></li>)}</ul>
                  )}
                </div>
              )}
              {data.data.nextUp.length > 0 && (<><h4 className="eyebrow next-h">Recommended next</h4><ul className="skill-chips">{data.data.nextUp.map((n) => <li key={n}>{n}</li>)}</ul></>)}
              {data.data.sourceNote && <p className="cell-sub note-foot">{data.data.sourceNote}</p>}
            </Surface>
          </div>
        )}
    </>
  );
}
