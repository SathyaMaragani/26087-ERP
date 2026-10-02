import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Search, ZoomOut } from 'lucide-react';
import { api, tenantApi } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { useDeviceTier } from '../../lib/device';
import type { UserPersona } from '../../types';
import type { ExLevel, ExNode } from '../../scene/ExplorerScene';
import { EmptyState, ErrorState, LoadingBlock } from '../../ui/primitives';
import { EASE } from '../../motion/primitives';
import { fmtDate } from '../home/shared';

const ExplorerScene = lazy(() => import('../../scene/ExplorerScene'));

interface PathItem { level: number; id: string; label: string }
type Raw = any;

const RADII = [4.6, 1.5, 0.5, 0.17];
const DIST = [12.5, 4.2, 1.45, 0.62];
const pretty = (s?: string) => (s ?? '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

/** Deterministic points on a flattened shell, so the same entity always sits in the same place. */
function shell(n: number, radius: number, seed: number): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - ((i + 0.5) / n) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = Math.PI * (3 - Math.sqrt(5)) * (i + seed);
    const jitter = 0.86 + ((i * 7 + seed * 3) % 10) / 10 * 0.28;
    out.push([Math.cos(th) * r * radius * 1.25 * jitter, y * radius * 0.72 * jitter, Math.sin(th) * r * radius * 0.6 * jitter]);
  }
  return out;
}

// Monsoon Porcelain, not the old Atlas dark-theme indigo/cyan — this scene now renders on a
// porcelain page, so its node colours need to belong to the same brand language as everything
// around it: jade (apex/active), pale jade (standard institution), copper (secondary type),
// marigold (pending), vermilion (cancelled).
const TYPE_COLOR: Record<string, string> = { NCCT_HQ: '#3E7C6A', VAMNICOM: '#3E7C6A', RICM: '#91B3A5', ICM: '#A9613B' };
const PROG_COLOR: Record<string, string> = { ONGOING: '#3E7C6A', UPCOMING: '#D4A04D', COMPLETED: '#91B3A5', CANCELLED: '#C95748' };

export function ExplorerView({ persona, onOpenPeople }: { persona: UserPersona; onOpenPeople: () => void }) {
  const reduce = useReducedMotion();
  const tier = useDeviceTier();
  const isAdmin = persona.role === 'NCCT_ADMIN';
  const [path, setPath] = useState<PathItem[]>([]);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [query, setQuery] = useState('');
  const [ghosts, setGhosts] = useState<ExLevel[]>([]);
  const prevLevels = useRef<ExLevel[]>([]);

  const orgId = path[0]?.id;
  const orgsState = useAsync<Raw[]>(async () => (isAdmin ? api.organizations.list() : [{ id: persona.organizationId, name: persona.instituteName, institutionType: 'RICM', state: undefined }]), [isAdmin]);
  const orgs = orgsState.data ?? [];
  const programmes = useAsync<Raw[]>(() => (orgId ? tenantApi(orgId).programmes() : Promise.resolve([])), [orgId]);
  const programmeId = path[1]?.id;
  const regs = useAsync<Raw[]>(() => (orgId && programmeId ? tenantApi(orgId).registrations(programmeId) : Promise.resolve([])), [orgId, programmeId]);
  const traineeId = path[2]?.id;
  const profile = useAsync<Raw | null>(() => (orgId && traineeId ? tenantApi(orgId).trainee(traineeId) : Promise.resolve(null)), [orgId, traineeId]);

  /* ---- entities per level, as ExNodes ---- */
  const orgNodes = useMemo(() => {
    const hq = orgs.filter((o) => o.institutionType === 'NCCT_HQ');
    const rest = orgs.filter((o) => o.institutionType !== 'NCCT_HQ');
    const pos = shell(rest.length, RADII[0], 3);
    return [...hq.map((o) => ({ raw: o, local: [0, 0, 0] as [number, number, number] })), ...rest.map((o, i) => ({ raw: o, local: pos[i] }))];
  }, [orgs]);
  const progList = useMemo(() => programmes.data ?? [], [programmes.data]);
  const regList = useMemo(() => (regs.data ?? []).filter((r) => r.trainee), [regs.data]);

  const levels = useMemo<ExLevel[]>(() => {
    const out: ExLevel[] = [];
    const n0: ExNode[] = orgNodes.map((o) => ({ id: o.raw.id, label: o.raw.name, color: TYPE_COLOR[o.raw.institutionType] ?? '#91B3A5', size: RADII[0] * (o.raw.institutionType === 'NCCT_HQ' ? 0.11 : 0.07), local: o.local }));
    out.push({ key: 'L0', center: [0, 0, 0], radius: RADII[0], camDist: DIST[0], nodes: n0, selectedId: path[0]?.id ?? null, open: true });
    let center: [number, number, number] = [0, 0, 0];
    if (path.length >= 1) {
      const sel = n0.find((n) => n.id === path[0].id);
      center = [center[0] + (sel?.local[0] ?? 0), center[1] + (sel?.local[1] ?? 0), center[2] + (sel?.local[2] ?? 0)];
      const pos = shell(progList.length, RADII[1], 5);
      const nodes: ExNode[] = progList.map((p, i) => ({ id: p.id, label: p.title, color: PROG_COLOR[p.status] ?? '#91B3A5', size: RADII[1] * 0.075, local: pos[i] }));
      out.push({ key: `L1-${path[0].id}`, center, radius: RADII[1], camDist: DIST[1], nodes, selectedId: path[1]?.id ?? null, open: true });
      if (path.length >= 2) {
        const s1 = nodes.find((n) => n.id === path[1].id);
        center = [center[0] + (s1?.local[0] ?? 0), center[1] + (s1?.local[1] ?? 0), center[2] + (s1?.local[2] ?? 0)];
        const tpos = shell(regList.length, RADII[2], 7);
        const tn: ExNode[] = regList.map((r, i) => ({ id: r.traineeId ?? r.trainee.id, label: `${r.trainee.user?.firstName ?? ''} ${r.trainee.user?.lastName ?? ''}`.trim() || r.trainee.traineeCode, color: r.status === 'ENROLLED' ? '#3E7C6A' : r.status === 'APPROVED' ? '#91B3A5' : r.status === 'REJECTED' ? '#C95748' : '#D4A04D', size: RADII[2] * 0.08, local: tpos[i] }));
        out.push({ key: `L2-${path[1].id}`, center, radius: RADII[2], camDist: DIST[2], nodes: tn, selectedId: path[2]?.id ?? null, open: true });
        if (path.length >= 3) {
          const s2 = tn.find((n) => n.id === path[2].id);
          center = [center[0] + (s2?.local[0] ?? 0), center[1] + (s2?.local[1] ?? 0), center[2] + (s2?.local[2] ?? 0)];
          const skills = profile.data?.skills ?? [], certs = profile.data?.certificates ?? [];
          const items = [...skills.map((s: Raw) => ({ id: `s-${s.id}`, label: s.skill?.name, color: '#3E7C6A' })), ...certs.map((c: Raw) => ({ id: `c-${c.id}`, label: c.title, color: '#A9613B' }))];
          const ipos = shell(items.length, RADII[3], 9);
          out.push({ key: `L3-${path[2].id}`, center, radius: RADII[3], camDist: DIST[3], nodes: items.map((it, i) => ({ ...it, size: RADII[3] * 0.09, local: ipos[i] })), selectedId: null, open: true });
        }
      }
    }
    return out;
  }, [orgNodes, progList, regList, path, profile.data]);

  /* ---- collapse: deeper levels retract into their parent before unmounting ---- */
  useEffect(() => {
    const prev = prevLevels.current;
    if (prev.length > levels.length) {
      const dying = prev.slice(levels.length).map((l) => ({ ...l, open: false }));
      setGhosts(dying);
      const t = window.setTimeout(() => setGhosts([]), 1400);
      prevLevels.current = levels;
      return () => window.clearTimeout(t);
    }
    if (levels.length > prev.length) setGhosts([]);
    prevLevels.current = levels;
  }, [levels]);

  const active = path.length;
  const sceneLevels = useMemo(() => [...levels, ...ghosts.filter((g) => !levels.some((l) => l.key === g.key))], [levels, ghosts]);

  const pick = useCallback((level: number, id: string) => {
    if (level !== path.length) return; // only the active constellation is interactive
    const node = levels[level]?.nodes.find((n) => n.id === id);
    if (!node) return;
    if (level >= 3) return;
    setPath((p) => [...p.slice(0, level), { level, id, label: node.label }]);
    setQuery(''); setHover(null);
  }, [levels, path.length]);

  const zoomTo = useCallback((depth: number) => { setPath((p) => p.slice(0, depth)); setQuery(''); setHover(null); }, []);
  const zoomOut = useCallback(() => setPath((p) => p.slice(0, -1)), []);

  useEffect(() => {
    const on = (e: KeyboardEvent) => { if ((e.key === 'Escape' || e.key === 'Backspace') && !(e.target instanceof HTMLInputElement) && path.length) { e.preventDefault(); zoomOut(); } };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [path.length, zoomOut]);

  // Non-admins start inside their own institution.
  useEffect(() => {
    if (!isAdmin && orgs.length === 1 && path.length === 0) setPath([{ level: 0, id: orgs[0].id, label: orgs[0].name }]);
  }, [isAdmin, orgs, path.length]);

  /* ---- the panel for the level the camera is at ---- */
  const cur = levels[Math.min(active, levels.length - 1)];
  const states = [orgsState, programmes, regs, profile][Math.min(active, 3)];
  const items = (cur?.nodes ?? []).filter((n) => n.label?.toLowerCase().includes(query.toLowerCase()));
  const titles = ['Institutions', `Programmes · ${path[0]?.label ?? ''}`, `Trainees · ${path[1]?.label ?? ''}`, `${path[2]?.label ?? ''} — learning environment`];
  const hoverLabel = hover ? sceneLevels.flatMap((l) => l.nodes).find((n) => n.id === hover.id)?.label : null;
  const hoverId = hover?.id ?? null;

  const org = orgs.find((o) => o.id === path[0]?.id);
  const prog = progList.find((p) => p.id === path[1]?.id);

  return (
    <div className="explorer">
      <div className="explorer-stage">
        {tier.webgl ? (
          <Suspense fallback={<LoadingBlock label="Preparing the network" />}>
            <ExplorerScene levels={sceneLevels} active={Math.min(active, levels.length - 1)} hoverId={hoverId} reduced={!!reduce}
              onHover={(id, x, y) => setHover(id ? { id, x: x ?? 0, y: y ?? 0 } : null)} onPick={pick} />
          </Suspense>
        ) : <EmptyState title="3D isn't available on this device" detail="Use the list on the right to move through institutions, programmes and trainees." />}

        <nav className="explorer-crumbs" aria-label="Zoom level">
          <button onClick={() => zoomTo(0)} className={active === 0 ? 'is-current' : ''} disabled={!isAdmin && path.length <= 1}>National</button>
          {path.map((p, i) => (
            <span key={p.id} className="crumb-frag">
              <ChevronRight size={13} aria-hidden />
              <button onClick={() => zoomTo(i + 1)} className={active === i + 1 ? 'is-current' : ''}>{p.label}</button>
            </span>
          ))}
        </nav>
        {path.length > (isAdmin ? 0 : 1) && <button className="explorer-out" onClick={zoomOut}><ZoomOut size={15} aria-hidden /> Zoom out <kbd>Esc</kbd></button>}
        {hover && hoverLabel && <div className="explorer-tip" style={{ left: hover.x + 14, top: hover.y + 14 }} role="status">{hoverLabel}</div>}
        <div className="explorer-hint" aria-hidden>{active === 0 ? 'Select an institution to fly into it' : active === 1 ? 'Select a programme' : active === 2 ? 'Select a trainee' : 'Skills and credentials orbit the learner'}</div>
      </div>

      <aside className="explorer-panel" aria-label={titles[Math.min(active, 3)]}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={active} initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.4, ease: EASE }}>
            <div className="eyebrow">{['National network', 'Institution', 'Programme', 'Trainee'][Math.min(active, 3)]}</div>
            <h2 className="explorer-title">{titles[Math.min(active, 3)]}</h2>

            {active === 1 && org && <dl className="facts explorer-facts"><div><dt>Type</dt><dd>{pretty(org.institutionType)}</dd></div><div><dt>State</dt><dd>{org.state ?? '—'}</dd></div></dl>}
            {active === 2 && prog && <dl className="facts explorer-facts"><div><dt>Dates</dt><dd className="num">{fmtDate(prog.startDate)} – {fmtDate(prog.endDate)}</dd></div><div><dt>Capacity</dt><dd className="num">{prog._count?.registrations ?? 0} / {prog.capacity}</dd></div></dl>}

            {active < 3 ? (
              <>
                <div className="search-row"><Search size={15} aria-hidden /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter" aria-label="Filter this level" /></div>
                {states.loading && !states.data ? <LoadingBlock label="Reading the network" /> : states.error ? <ErrorState detail={states.error} onRetry={states.reload} /> : items.length === 0 ? (
                  <EmptyState title={active === 1 ? 'No programmes here yet' : active === 2 ? 'No trainees registered yet' : 'Nothing to show'} detail={active === 1 ? 'This institution has not created a programme.' : undefined} />
                ) : (
                  <ul className="explorer-list">
                    {items.map((n) => (
                      <li key={n.id}>
                        <button className={hoverId === n.id ? 'is-hover' : ''} onPointerEnter={() => setHover({ id: n.id, x: 0, y: 0 })} onPointerLeave={() => setHover(null)} onFocus={() => setHover({ id: n.id, x: 0, y: 0 })} onBlur={() => setHover(null)} onClick={() => pick(active, n.id)}>
                          <i style={{ background: n.color }} aria-hidden /><span>{n.label}</span><ChevronRight size={14} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : profile.loading ? <LoadingBlock label="Opening the learner's record" /> : profile.error ? <ErrorState detail={profile.error} onRetry={profile.reload} /> : profile.data && (
              <div className="explorer-identity">
                <p className="cell-sub">{profile.data.traineeCode} · {pretty(profile.data.traineeType)} · {[profile.data.district, profile.data.state].filter(Boolean).join(', ')}</p>
                <h3>Skills</h3>
                {(profile.data.skills ?? []).length === 0 ? <p className="cell-sub">None verified yet.</p> : <ul className="skills">{profile.data.skills.map((s: Raw) => <li key={s.id}><span>{s.skill?.name}</span><span className="pips" role="img" aria-label={`Level ${s.level} of 3`}>{[0, 1, 2].map((i) => <i key={i} className={i < s.level ? 'on' : ''} />)}</span></li>)}</ul>}
                <h3>Credentials</h3>
                {(profile.data.certificates ?? []).length === 0 ? <p className="cell-sub">None issued.</p> : <ul className="rows rows-flush">{profile.data.certificates.map((c: Raw) => <li key={c.id}><div><strong className="cell-strong">{c.title}</strong><div className="cell-sub num">{c.certificateNumber}</div></div></li>)}</ul>}
                <button className="btn btn-secondary btn-sm" onClick={onOpenPeople}>Open the full record</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </aside>
    </div>
  );
}
