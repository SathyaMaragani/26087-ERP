import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Activity, Award, Briefcase, Building2, MapPin, Radio, Sparkles, X } from 'lucide-react';
import { api, tenantApi } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { useDeviceTier } from '../lib/device';
import type { HomeProps } from '../features/home/shared';
import type {
  CredentialInfo, EmploymentInfo, FocusLevel, InstitutionNode, LayerState, ProgrammeNode, SkillNode, TraineeSignal,
} from '../scenes/CommandCenterWorld';
import { institutionPosition, regionPosition } from '../scenes/regionGeo';
import { INDIA_OUTLINE, projectLonLat } from '../scene/india';
import { commandCenterStore } from './commandCenterStore';

// Fallback-only (WebGL unavailable): same real boundary projection the GLB uses, flattened to SVG,
// with institution nodes mapped through the same x/-z projected-space mapping as institutionPosition().
const FALLBACK_PROJECTION = (() => {
  const pts = INDIA_OUTLINE.map(([lon, lat]) => projectLonLat(lon, lat));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 1, h = maxY - minY || 1;
  const scale = Math.min(84 / w, 84 / h);
  const offX = 50 - (w * scale) / 2, offY = 50 - (h * scale) / 2;
  // x/y already in projected (lon/lat-scaled) space, matching institutionPosition()'s x and -z.
  const toSvg = (x: number, y: number): [number, number] => [offX + (x - minX) * scale, offY + (maxY - y) * scale];
  const outline = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${toSvg(x, y).map((n) => n.toFixed(1)).join(',')}`).join(' ') + ' Z';
  return { toSvg };
})();
const FALLBACK_OUTLINE = (() => {
  const pts = INDIA_OUTLINE.map(([lon, lat]) => projectLonLat(lon, lat));
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${FALLBACK_PROJECTION.toSvg(x, y).map((n) => n.toFixed(1)).join(',')}`).join(' ') + ' Z';
})();

const CommandCenterWorld = lazy(() => import('../scenes/CommandCenterWorld'));

interface TraineeRef { id: string; name: string }

interface HistEntry {
  level: FocusLevel; region: string | null; institution: InstitutionNode | null; programme: ProgrammeNode | null;
  trainee: TraineeRef | null; skill: SkillNode | null;
  focus: THREE.Vector3; distance: number;
}

const DEFAULT_LAYERS: LayerState = { institutions: true, training: true, learning: false, credentials: false, employment: false };
// Slightly south of India's true geometric centre: with this camera's near-top-down angle,
// screen-"up" roughly tracks world-north, so nudging the orbit target south shifts the whole
// landmass a bit higher on screen — breathing room between the map and the bottom command
// controls, without shrinking India or touching the drill-down camera logic.
const NATIONAL_FOCUS = new THREE.Vector3(0, 0, 0.6);

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  return now;
}

/**
 * NCCT NATIONAL DIGITAL COMMAND CENTER — the 3D India network IS the dashboard; this component
 * is only the instrumentation layer around it (status, live metrics, layer toggles, spatial
 * inspector). All numbers come from api.analytics.getCommandCenter() and api.organizations.list() —
 * nothing here is invented, and anything the backend doesn't track (e.g. per-institution trainee
 * counts) is simply omitted rather than guessed.
 */
export function CommandCenter({ persona, onNavigate, embedded = false }: HomeProps & { embedded?: boolean }) {
  const tier = useDeviceTier();
  const now = useClock();
  const state = useAsync(() => api.analytics.getCommandCenter(), []);
  const orgsState = useAsync(async () => {
    const orgs = await api.organizations.list();
    const withCounts = await Promise.all(
      orgs.filter((o: any) => o.institutionType !== 'NCCT_HQ').map(async (o: any) => {
        const programmes = await tenantApi(o.id).programmes().catch(() => [] as any[]);
        return { id: o.id, name: o.name, type: o.institutionType, state: o.state ?? null, programmeCount: programmes.length } as InstitutionNode;
      }),
    );
    return withCounts;
  }, []);

  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [selected, setSelected] = useState<InstitutionNode | null>(null);
  const [level, setLevel] = useState<FocusLevel>('national');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [selectedProgramme, setSelectedProgramme] = useState<ProgrammeNode | null>(null);

  // TrainingProgramme has no "modules" relation (LMS courses are a separate, unrelated model) —
  // so the only honest per-programme signal is the programme's own record plus the real
  // registration/certificate counts the API already returns via `_count` on the list endpoint.
  const programmesState = useAsync(async () => {
    if (!selected) return [] as ProgrammeNode[];
    const list = await tenantApi(selected.id).programmes().catch(() => [] as any[]);
    return list.map((p: any): ProgrammeNode => ({
      id: p.id, title: p.title, code: p.code, category: p.category, mode: p.mode, status: p.status,
      registrations: p._count?.registrations ?? 0, certificates: p._count?.certificates ?? 0,
    }));
  }, [selected?.id]);
  const programmes = programmesState.data ?? [];
  const [selectedTrainee, setSelectedTrainee] = useState<TraineeRef | null>(null);

  // Real registered participants for the selected programme — "who's actually in this programme",
  // not who could be. Empty is a true answer, not a loading artifact, once this resolves.
  const registrationsState = useAsync(async () => {
    if (!selected || !selectedProgramme) return [] as any[];
    return tenantApi(selected.id).registrations(selectedProgramme.id).catch(() => [] as any[]);
  }, [selected?.id, selectedProgramme?.id]);
  const registrations = registrationsState.data ?? [];

  // The one trainee's full record — registrations/certificates/skills/outcomes, all real relations
  // (TraineeProfile.skills / .certificates / .outcomes) fetched via the same read-only cross-tenant
  // path already used for programmes and institutions.
  const traineeDetailState = useAsync(async () => {
    if (!selected || !selectedTrainee || !selectedProgramme) return null;
    return tenantApi(selected.id).trainee(selectedTrainee.id).catch(() => null);
  }, [selected?.id, selectedTrainee?.id]);

  const traineeSignal: TraineeSignal | null = (() => {
    const t = traineeDetailState.data;
    if (!t || !selectedProgramme) return null;
    const certified = (t.certificates ?? []).some((c: any) => c.programmeId === selectedProgramme.id && c.status === 'ISSUED');
    return { name: t.user?.name ?? selectedTrainee?.name ?? 'Trainee', certified, skillsCount: (t.skills ?? []).length, employed: (t.outcomes ?? []).length > 0 };
  })();

  // The one credential tied to THIS programme (Certificate.programmeId is real) — not just "a
  // certificate this trainee happens to have from somewhere else.
  const credential: CredentialInfo | null = (() => {
    const t = traineeDetailState.data;
    const c = (t?.certificates ?? []).find((c: any) => c.programmeId === selectedProgramme?.id && c.status === 'ISSUED');
    if (!c) return null;
    return { certificateNumber: c.certificateNumber, title: c.title, issuedDate: c.issuedDate, status: c.status, grade: c.grade ?? null, skillsAcquired: c.skillsAcquired ?? [] };
  })();

  // Real TraineeSkill → Skill → SkillCategory, cross-checked against the credential's own
  // skillsAcquired list (a real field on the same Certificate row) — not an invented relationship.
  const skills: SkillNode[] = (() => {
    const t = traineeDetailState.data;
    return (t?.skills ?? []).map((ts: any): SkillNode => ({
      id: ts.id, name: ts.skill?.name ?? 'Skill', category: ts.skill?.category?.name ?? null,
      onCredential: !!credential?.skillsAcquired?.includes(ts.skill?.name),
    }));
  })();

  const employment: EmploymentInfo | null = (() => {
    const t = traineeDetailState.data;
    const o = (t?.outcomes ?? [])[0];
    if (!o) return null;
    return { employerName: o.employerName, jobTitle: o.jobTitle, annualPackage: o.annualPackage ?? null, placementDate: o.placementDate, verificationStatus: o.verificationStatus };
  })();

  const [selectedSkill, setSelectedSkill] = useState<SkillNode | null>(null);
  const [verifyState, setVerifyState] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [cinematicActive, setCinematicActive] = useState(false);
  const cinematicTimer = useRef<number[]>([]);
  const [showIntel, setShowIntel] = useState(false);

  const [pulseActive, setPulseActive] = useState(false);
  const [pulseStep, setPulseStep] = useState(-1);
  const focus = useRef(NATIONAL_FOCUS.clone());
  const [focusDistance, setFocusDistance] = useState(18.5);
  const pulseTimer = useRef<number[]>([]);
  // NATION → REGION → INSTITUTION camera history, so ESC / breadcrumb clicks step back through
  // exactly the same spatial states the user travelled through, rather than resetting blindly.
  const history = useRef<HistEntry[]>([]);

  const nodes = orgsState.data ?? [];
  const k = state.data?.nationalKpis ?? ({} as any);
  const statePerf: Array<{ state: string; traineesCount: number }> = state.data?.statePerformance ?? [];
  // Both already returned by the same command-center endpoint the KPI strip uses — real
  // groupBy() counts, not derived or estimated. There is no time-series endpoint behind this
  // system, so this stays a live snapshot rather than pretending to chart change over time.
  const programmesDist: Array<{ category: string; count: number }> = state.data?.programmesDistribution ?? [];
  const audienceDist: Array<{ type: string; count: number }> = state.data?.targetAudienceDistribution ?? [];

  const runPulse = () => {
    pulseTimer.current.forEach((t) => window.clearTimeout(t));
    pulseTimer.current = [];
    if (!nodes.length) return;
    setPulseActive(true);
    setSelected(null);
    setSelectedRegion(null);
    setSelectedProgramme(null);
    setSelectedTrainee(null);
    setLevel('national');
    history.current = [];
    focus.current.copy(NATIONAL_FOCUS);
    setFocusDistance(19.5);
    const stepMs = Math.max(220, Math.min(600, 5200 / nodes.length));
    nodes.forEach((_, i) => {
      pulseTimer.current.push(window.setTimeout(() => setPulseStep(i), i * stepMs));
    });
    pulseTimer.current.push(window.setTimeout(() => {
      setLayers((l) => ({ ...l, learning: true, credentials: true, employment: true }));
    }, nodes.length * stepMs + 300));
    pulseTimer.current.push(window.setTimeout(() => {
      setPulseActive(false);
      setPulseStep(-1);
      setLayers(DEFAULT_LAYERS);
    }, nodes.length * stepMs + 3200));
  };

  useEffect(() => () => pulseTimer.current.forEach((t) => window.clearTimeout(t)), []);

  const snapshot = (): HistEntry => ({
    level, region: selectedRegion, institution: selected, programme: selectedProgramme, trainee: selectedTrainee, skill: selectedSkill,
    focus: focus.current.clone(), distance: focusDistance,
  });

  const goNational = () => {
    history.current = [];
    setSelected(null);
    setSelectedRegion(null);
    setSelectedProgramme(null);
    setSelectedTrainee(null);
    setSelectedSkill(null);
    setVerifyState('idle');
    setLevel('national');
    focus.current.copy(NATIONAL_FOCUS);
    setFocusDistance(18.5);
  };

  const enterRegion = (regionState: string, pos: THREE.Vector3) => {
    history.current.push(snapshot());
    setSelected(null);
    setSelectedProgramme(null);
    setSelectedTrainee(null);
    setSelectedRegion(regionState);
    setLevel('region');
    focus.current.copy(pos);
    setFocusDistance(9.2);
  };

  const enterRegionByName = (regionState: string) => enterRegion(regionState, regionPosition(regionState));

  const focusInstitutionById = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    if (!n) return;
    onSelect(n, institutionPosition(n.state, n.id.length + n.id.charCodeAt(0)));
  };

  const onSelect = (n: InstitutionNode, pos: THREE.Vector3) => {
    history.current.push(snapshot());
    setSelected(n);
    setSelectedProgramme(null);
    setSelectedTrainee(null);
    setSelectedRegion(n.state);
    setLevel('institution');
    focus.current.copy(pos);
    setFocusDistance(4.3);
  };

  // Same world, different lens: NCCT_ADMIN lands on the national view (unchanged), but every
  // other persona's Home embeds this same component and should land already focused on their
  // own institution/region rather than the full national map — "the director sees the region."
  // Runs once, as soon as the real institution list resolves; onSelect/enterRegionByName are the
  // exact same functions the national view itself uses to drill down, so this is real navigation,
  // not a separate visualization.
  const autoFocused = useRef(false);
  useEffect(() => {
    if (persona.role === 'NCCT_ADMIN' || autoFocused.current || !nodes.length) return;
    autoFocused.current = true;
    const own = nodes.find((n) => n.id === persona.organizationId);
    if (!own) return;
    if (own.state) enterRegionByName(own.state);
    else onSelect(own, institutionPosition(own.state, own.id.length + own.id.charCodeAt(0)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  // "PROGRAMMES" on the institution twin: institution stays visible, camera pulls back slightly
  // (further than the institution's own 4.3) so its programme ring has room to appear around it.
  const enterProgrammeList = () => {
    if (!selected) return;
    history.current.push(snapshot());
    setSelectedProgramme(null);
    setSelectedTrainee(null);
    setLevel('programme');
    setFocusDistance(5.2);
  };

  const onSelectProgramme = (p: ProgrammeNode, pos: THREE.Vector3) => {
    history.current.push(snapshot());
    setSelectedProgramme(p);
    setSelectedTrainee(null);
    setLevel('programme');
    focus.current.copy(pos);
    setFocusDistance(2.1);
  };

  const backToProgramme = () => {
    if (!selectedProgramme) return;
    history.current.push(snapshot());
    setSelectedTrainee(null);
    setLevel('programme');
    setFocusDistance(2.1);
  };

  // PROGRAMME → TRAINEE: the programme recedes (camera pulls in tighter still) and one person's
  // journey becomes the focal object. Position stays anchored to the same programme node — the
  // trainee's journey renders right where the programme already is, not somewhere new.
  const enterTrainee = (t: TraineeRef) => {
    history.current.push(snapshot());
    setSelectedTrainee(t);
    setSelectedSkill(null);
    setVerifyState('idle');
    setLevel('trainee');
    setFocusDistance(1.3);
  };

  // TRAINEE → SKILL / CREDENTIAL / EMPLOYMENT: one downstream outcome becomes the focal object.
  // Only reachable when that stage is actually lit (real data) — CommandCenterWorld only calls
  // this from a clickable mesh when the corresponding signal is true.
  const onFocusStage = (stage: 'skill' | 'credential' | 'employment', pos: THREE.Vector3) => {
    history.current.push(snapshot());
    setSelectedSkill(null);
    if (stage !== 'credential') setVerifyState('idle');
    setLevel(stage === 'skill' ? 'skill' : stage === 'credential' ? 'credential' : 'employment');
    focus.current.copy(pos);
    setFocusDistance(0.75);
  };

  const onSelectSkill = (skill: SkillNode, pos: THREE.Vector3) => {
    history.current.push(snapshot());
    setSelectedSkill(skill);
    setLevel('skill');
    focus.current.copy(pos);
    setFocusDistance(0.4);
  };

  // Calls the real, existing public verification endpoint (a registry lookup + status check —
  // there is no cryptographic signature in this system, and the UI says so rather than implying one).
  const verifyCredential = async () => {
    if (!credential) return;
    setVerifyState('checking');
    setVerifyMessage(null);
    try {
      const res = await api.certifications.verifyPublic(credential.certificateNumber);
      setVerifyState(res.isValid ? 'valid' : 'invalid');
      setVerifyMessage(res.message ?? null);
    } catch {
      setVerifyState('invalid');
      setVerifyMessage('Verification request failed.');
    }
  };

  // Same anchor point CommandCenterWorld's own Scene computes for this trainee's journey object —
  // duplicated here (not imported, since that file pulls in @react-three/fiber) purely so the
  // cinematic can choreograph real camera targets around it.
  const traineeAnchorPos = (): THREE.Vector3 | null => {
    if (!selected) return null;
    const instPos = institutionPosition(selected.state, selected.id.length + selected.id.charCodeAt(0));
    const idx = programmes.findIndex((p) => p.id === selectedProgramme?.id);
    const angle = (Math.max(0, idx) / Math.max(1, programmes.length)) * Math.PI * 2;
    return instPos.clone().add(new THREE.Vector3(Math.cos(angle) * 0.3, 0.07, Math.sin(angle) * 0.3));
  };

  // THE ONE-PERSON MOMENT: choreographs the camera through stages that already exist and already
  // work individually (this adds no new data path) — it only sequences real state transitions,
  // including a real call to the verification endpoint, with no fabricated step in between.
  const playOutcomeCinematic = () => {
    cinematicTimer.current.forEach((t) => window.clearTimeout(t));
    cinematicTimer.current = [];
    const anchor = traineeAnchorPos();
    if (!anchor || !traineeSignal) return;
    setCinematicActive(true);
    const push = (ms: number, fn: () => void) => cinematicTimer.current.push(window.setTimeout(fn, ms));

    setSelectedSkill(null); setVerifyState('idle'); setLevel('trainee');
    focus.current.copy(anchor); setFocusDistance(1.4);

    let t = 1400;
    if (skills.length > 0) {
      push(t, () => { setLevel('skill'); setSelectedSkill(null); focus.current.copy(anchor.clone().add(new THREE.Vector3(0, 0.68, 0))); setFocusDistance(0.85); });
      t += 2200;
    }
    if (traineeSignal.certified) {
      push(t, () => { setLevel('credential'); focus.current.copy(anchor.clone().add(new THREE.Vector3(0.1, 0.55, 0))); setFocusDistance(0.65); });
      t += 1600;
      push(t, () => verifyCredential());
      t += 2000;
    }
    if (traineeSignal.employed) {
      push(t, () => { setLevel('employment'); focus.current.copy(anchor.clone().add(new THREE.Vector3(0.25, 0.85, 0))); setFocusDistance(1.05); });
      t += 2400;
    }
    push(t, () => { setLevel('trainee'); setVerifyState('idle'); focus.current.copy(anchor); setFocusDistance(2.2); });
    t += 1400;

    // THE NETWORK PULLBACK: the trainee recedes into their institution, the institution recedes
    // into its region, the region recedes into the nation — the exact same real positions and
    // FocusLevel states the manual national → region → institution drill-down already uses, just
    // played in reverse. No new geometry, no invented data — one continuous camera move outward.
    if (selected) {
      const inst = selected;
      const instPos = institutionPosition(inst.state, inst.id.length + inst.id.charCodeAt(0));
      // Clearing programme/trainee here too, not just changing `level` — so the breadcrumb
      // itself recedes in step with the camera instead of still naming a trainee the camera
      // has already pulled back from.
      push(t, () => { setSelectedTrainee(null); setSelectedProgramme(null); setLevel('institution'); focus.current.copy(instPos); setFocusDistance(4.3); });
      t += 1500;
      if (inst.state) {
        const region = inst.state;
        push(t, () => { setSelected(null); setLevel('region'); setSelectedRegion(region); focus.current.copy(regionPosition(region)); setFocusDistance(9.2); });
        t += 1600;
      }
    }
    push(t, () => { goNational(); setCinematicActive(false); });
  };

  useEffect(() => () => cinematicTimer.current.forEach((tm) => window.clearTimeout(tm)), []);

  // One step back through NATION → REGION → INSTITUTION → PROGRAMME → TRAINEE → SKILL/CREDENTIAL/
  // EMPLOYMENT — the same path the user travelled in, not a reset. Used by ESC and panel close buttons.
  const goBack = () => {
    const prev = history.current.pop();
    if (!prev) { goNational(); return; }
    setLevel(prev.level);
    setSelectedRegion(prev.region);
    setSelected(prev.institution);
    setSelectedProgramme(prev.programme);
    setSelectedTrainee(prev.trainee);
    setSelectedSkill(prev.skill);
    setVerifyState('idle');
    focus.current.copy(prev.focus);
    setFocusDistance(prev.distance);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && level !== 'national') goBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, selectedRegion, selected, selectedProgramme, selectedTrainee, focusDistance]);

  // Publish the real, currently-working control functions for the global ⌘K palette to call —
  // cleared on unmount so the palette knows the command center isn't on screen right now.
  useEffect(() => {
    commandCenterStore.current = {
      regions: [...new Set(nodes.map((n) => n.state).filter((s): s is string => !!s))],
      institutions: nodes.map((n) => ({ id: n.id, name: n.name })),
      hasCredentialInView: level === 'credential' && !!credential,
      focusNational: goNational,
      focusRegion: enterRegionByName,
      focusInstitution: focusInstitutionById,
      runPulse,
      returnToNational: goNational,
      setLayer: (key, on) => setLayers((l) => ({ ...l, [key]: on })),
      verifyCredentialInView: () => { if (level === 'credential' && credential) verifyCredential(); },
      showAnalytics: () => setShowIntel(true),
    };
    return () => { commandCenterStore.current = null; };
  });

  const metrics = [
    { label: 'Trainees', value: k.totalTrainees },
    { label: 'Programmes', value: k.totalProgrammes },
    { label: 'Completion', value: k.completionRatePercent, suffix: '%' },
    { label: 'Certified', value: k.certificationRatePercent, suffix: '%' },
    { label: 'Employed', value: k.employmentLinkagePercent, suffix: '%' },
  ];

  return (
    <div className={`cc-root ${embedded ? 'cc-root--embedded' : 'cc-root--full'}`}>
      <div className="cc-stage">
        {tier.webgl ? (
          <Suspense fallback={<div className="cc-loading">Initialising the national network…</div>}>
            <CommandCenterWorld
              nodes={nodes}
              layers={layers}
              kpis={{ completion: k.completionRatePercent ?? 0, certification: k.certificationRatePercent ?? 0, employment: k.employmentLinkagePercent ?? 0 }}
              pulseActive={pulseActive}
              pulseStep={pulseStep}
              onSelect={onSelect}
              onSelectRegion={enterRegion}
              onHoverRegion={setHoveredRegion}
              level={level}
              focusedRegion={selectedRegion}
              focusedInstitutionId={selected?.id ?? null}
              programmes={programmes}
              selectedProgrammeId={selectedProgramme?.id ?? null}
              onSelectProgramme={onSelectProgramme}
              traineeSignal={traineeSignal}
              skills={skills}
              credential={credential}
              employment={employment}
              onFocusStage={onFocusStage}
              onSelectSkill={onSelectSkill}
              focus={focus.current}
              focusDistance={focusDistance}
              reduced={!!tier.reduced}
            />
          </Suspense>
        ) : (
          /* WebGL unavailable: show the same India visual with DOM-positioned institution nodes.
             Interaction is limited but the national network remains legible. */
          <div className="cc-fallback" role="img" aria-label="NCCT national institution network — static map">
            <svg viewBox="0 0 100 100" fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <path d={FALLBACK_OUTLINE} fill="rgba(145, 179, 165, 0.08)" stroke="rgba(145, 179, 165, 0.35)" strokeWidth="0.4" />
              {nodes.map((n) => {
                const pos = institutionPosition(n.state, n.id.length + n.id.charCodeAt(0));
                const [cx, cy] = FALLBACK_PROJECTION.toSvg(pos.x, -pos.z);
                return (
                  <g key={n.id} onClick={() => onSelect(n, pos)} style={{ cursor: 'pointer' }}>
                    <circle cx={cx} cy={cy} r="1.3" fill={n.type === 'RICM' ? '#3E7C6A' : '#A9613B'} opacity="0.9" />
                    <circle cx={cx} cy={cy} r="2.6" fill={n.type === 'RICM' ? '#3E7C6A' : '#A9613B'} opacity="0.18" />
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* — instrumentation layer: minimal, corners only, never covers the scene — */}
      <div className="cc-hud cc-hud--tl">
        <span className="cc-brand">NCCT</span>
        <span className="cc-brand-sub">{persona.role === 'NCCT_ADMIN' ? 'National Digital Infrastructure' : persona.instituteName}</span>
      </div>

      <div className="cc-hud cc-hud--tc">
        <span className="cc-live"><i /> {persona.role === 'NCCT_ADMIN' ? 'Live national system' : 'Live institutional system'}</span>
        {level === 'national' && hoveredRegion && <span className="cc-hover-region"><MapPin size={11} aria-hidden /> {hoveredRegion}</span>}
      </div>

      {level !== 'national' && (
        <nav className="cc-hud cc-hud--breadcrumb" aria-label="Spatial location">
          <button onClick={goNational}>NATIONAL</button>
          {selectedRegion && (
            <>
              <span>/</span>
              <button className={level === 'region' ? 'is-current' : undefined} onClick={() => enterRegionByName(selectedRegion)}>{selectedRegion.toUpperCase()}</button>
            </>
          )}
          {selected && (
            <>
              <span>/</span>
              <button className={level === 'programme' && !selectedProgramme ? 'is-current' : undefined} onClick={enterProgrammeList}>{selected.name.toUpperCase()}</button>
            </>
          )}
          {selectedProgramme && (
            <>
              <span>/</span>
              <button className={level === 'programme' ? 'is-current' : undefined} onClick={backToProgramme}>{selectedProgramme.title.toUpperCase()}</button>
            </>
          )}
          {selectedTrainee && (
            <>
              <span>/</span>
              <button className={level === 'trainee' ? 'is-current' : undefined} onClick={() => { history.current.push(snapshot()); setSelectedSkill(null); setLevel('trainee'); setFocusDistance(1.3); }}>{selectedTrainee.name.toUpperCase()}</button>
            </>
          )}
          {(level === 'skill' || level === 'credential' || level === 'employment') && (
            <><span>/</span><span className="is-current">{level.toUpperCase()}{selectedSkill ? ` · ${selectedSkill.name.toUpperCase()}` : ''}</span></>
          )}
        </nav>
      )}

      <div className="cc-hud cc-hud--tr">
        <span className="cc-clock">{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} IST</span>
        <span className="cc-date">{now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>

      <div className="cc-hud cc-hud--bl">
        <span className="cc-hud-label">Live metrics</span>
        <div className="cc-metrics">
          {metrics.map((m) => (
            <div key={m.label}>
              <b>{m.value ?? '—'}{m.value != null ? m.suffix ?? '' : ''}</b>
              <small>{m.label}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="cc-hud cc-hud--bc">
        <button className="cc-pulse-btn" onClick={runPulse} disabled={pulseActive || !nodes.length}>
          <Radio size={13} aria-hidden /> {pulseActive ? 'Network pulse running…' : persona.role === 'NCCT_ADMIN' ? 'National network pulse' : 'Institution network pulse'}
        </button>
        <button className="cc-pulse-btn" aria-pressed={showIntel} onClick={() => setShowIntel((v) => !v)}>
          <Activity size={13} aria-hidden /> {showIntel ? 'Hide national intelligence' : 'National intelligence'}
        </button>
      </div>

      <div className="cc-hud cc-hud--br">
        <span className="cc-hud-label">Layers</span>
        <ul className="cc-layers">
          {(Object.keys(layers) as (keyof LayerState)[]).map((key) => (
            <li key={key}>
              <button aria-pressed={layers[key]} onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}>
                <i className={layers[key] ? 'is-on' : undefined} />{key}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selected && level === 'institution' && (
        <aside className="cc-inspector" role="dialog" aria-label={`${selected.name} details`}>
          <button className="cc-inspector-close" onClick={goBack} aria-label="Back"><X size={14} /></button>
          <span className="cc-hud-label"><Building2 size={12} aria-hidden /> {selected.type}</span>
          <h3>{selected.name}</h3>
          <p>{selected.state ?? 'State not recorded'}</p>
          <div className="cc-inspector-metric">
            <b>{selected.programmeCount}</b>
            <small>Programme{selected.programmeCount === 1 ? '' : 's'} on record</small>
          </div>
          <p className="cc-inspector-note">Trainers, trainees, attendance and employment outcomes aren't tracked per institution yet.</p>
          <button className="cc-inspector-link" onClick={enterProgrammeList} disabled={!selected.programmeCount}>Explore programmes →</button>
        </aside>
      )}

      {selected && level === 'programme' && !selectedProgramme && (
        <aside className="cc-inspector" role="dialog" aria-label={`${selected.name} programmes`}>
          <button className="cc-inspector-close" onClick={goBack} aria-label="Back"><X size={14} /></button>
          <span className="cc-hud-label"><Building2 size={12} aria-hidden /> {selected.name}</span>
          <h3>{programmesState.loading ? 'Loading programmes…' : programmes.length ? 'Select a programme' : 'No programmes yet'}</h3>
          <p>{programmes.length ? `${programmes.length} programme${programmes.length === 1 ? '' : 's'} orbiting this institution — click one.` : 'This institution has no programmes on record.'}</p>
        </aside>
      )}

      {selectedProgramme && level === 'programme' && (
        <aside className="cc-inspector" role="dialog" aria-label={`${selectedProgramme.title} details`}>
          <button className="cc-inspector-close" onClick={goBack} aria-label="Back"><X size={14} /></button>
          <span className="cc-hud-label">{selectedProgramme.code} · {selectedProgramme.category}</span>
          <h3>{selectedProgramme.title}</h3>
          <p>{selectedProgramme.mode} · {selectedProgramme.status}</p>
          <div className="cc-inspector-metric"><b>{selectedProgramme.registrations}</b><small>Registration{selectedProgramme.registrations === 1 ? '' : 's'}</small></div>
          <div className="cc-inspector-metric"><b>{selectedProgramme.certificates}</b><small>Certificate{selectedProgramme.certificates === 1 ? '' : 's'} issued</small></div>
          <p className="cc-inspector-note">Modules aren't modelled for training programmes yet — the pathway above reflects this programme's real status and counts.</p>
          {selectedProgramme.registrations > 0 && (
            <div className="cc-inspector-people">
              <span className="cc-hud-label">Registered</span>
              <ul>
                {registrationsState.loading && <li className="cc-inspector-note">Loading…</li>}
                {registrations.map((r: any) => (
                  <li key={r.id}>
                    <button onClick={() => enterTrainee({ id: r.trainee.id, name: r.trainee.user?.name ?? r.trainee.traineeCode })}>
                      {r.trainee.user?.name ?? r.trainee.traineeCode} <span>{r.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button className="cc-inspector-link" onClick={() => onNavigate('programmes')}>Open in Programmes module →</button>
        </aside>
      )}

      {selectedTrainee && level === 'trainee' && (
        <aside className="cc-inspector" role="dialog" aria-label={`${selectedTrainee.name} journey`}>
          <button className="cc-inspector-close" onClick={goBack} aria-label="Back"><X size={14} /></button>
          <span className="cc-hud-label">Trainee · {selectedProgramme?.title}</span>
          <h3>{selectedTrainee.name}</h3>
          {!traineeSignal ? (
            <p>{traineeDetailState.loading ? 'Loading journey…' : 'This record is unavailable.'}</p>
          ) : (
            <>
              <ul className="cc-journey-stages">
                <li className="is-on">Programme <span>Registered</span></li>
                <li>Learning <span>Not linked to this training registration</span></li>
                <li>Assessment <span>Not linked to this training registration</span></li>
                <li className={traineeSignal.certified ? 'is-on' : undefined}>Credential <span>{traineeSignal.certified ? 'Issued' : 'Not issued'}</span></li>
                <li className={traineeSignal.skillsCount > 0 ? 'is-on' : undefined}>Skills <span>{traineeSignal.skillsCount > 0 ? `${traineeSignal.skillsCount} on record` : 'None on record'}</span></li>
                <li className={traineeSignal.employed ? 'is-on' : undefined}>Employment <span>{traineeSignal.employed ? 'Outcome recorded' : 'Not recorded'}</span></li>
              </ul>
              <p className="cc-inspector-note">Learning and assessment have no relation to training registrations in the current schema — shown honestly, not fabricated. Click a lit stage in the 3D view to open it.</p>
              {(traineeSignal.certified || traineeSignal.skillsCount > 0 || traineeSignal.employed) && (
                <button className="cc-inspector-link" onClick={playOutcomeCinematic} disabled={cinematicActive}>
                  {cinematicActive ? 'Playing…' : '▶ Play the network pullback'}
                </button>
              )}
            </>
          )}
        </aside>
      )}

      {level === 'skill' && !selectedSkill && (
        <aside className="cc-inspector" role="dialog" aria-label="Skills">
          <button className="cc-inspector-close" onClick={goBack} aria-label="Back"><X size={14} /></button>
          <span className="cc-hud-label"><Sparkles size={12} aria-hidden /> Skills</span>
          <h3>{skills.length ? `${skills.length} skill${skills.length === 1 ? '' : 's'} on record` : 'No skills on record'}</h3>
          <p>{skills.length ? 'Click a node to open one.' : `${selectedTrainee?.name ?? 'This trainee'} has no verified skills recorded yet.`}</p>
          {skills.length > 0 && (
            <div className="cc-inspector-people">
              <ul>
                {skills.map((s) => (
                  <li key={s.id}><button onClick={() => { history.current.push(snapshot()); setSelectedSkill(s); setFocusDistance(0.4); }}>{s.name} {s.onCredential && <span>On credential</span>}</button></li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      )}

      {level === 'skill' && selectedSkill && (
        <aside className="cc-inspector" role="dialog" aria-label={`${selectedSkill.name} details`}>
          <button className="cc-inspector-close" onClick={goBack} aria-label="Back"><X size={14} /></button>
          <span className="cc-hud-label"><Sparkles size={12} aria-hidden /> {selectedSkill.category ?? 'Uncategorised'}</span>
          <h3>{selectedSkill.name}</h3>
          <p>{selectedTrainee?.name} · {selectedProgramme?.title}</p>
          <div className="cc-inspector-metric">
            <b>{selectedSkill.onCredential ? 'Yes' : 'Not listed'}</b>
            <small>On the issued credential's skillsAcquired record</small>
          </div>
          <p className="cc-inspector-note">{employment ? 'This trainee also has a recorded employment outcome — the schema does not link specific skills to specific placements.' : 'No employment outcome recorded for this trainee.'}</p>
        </aside>
      )}

      {level === 'credential' && (
        <aside className="cc-inspector" role="dialog" aria-label="Credential">
          <button className="cc-inspector-close" onClick={goBack} aria-label="Back"><X size={14} /></button>
          {!credential ? (
            <><span className="cc-hud-label"><Award size={12} aria-hidden /> Credential</span><h3>Not issued</h3><p>No certificate has been issued for this registration.</p></>
          ) : (
            <>
              <span className="cc-hud-label"><Award size={12} aria-hidden /> {credential.certificateNumber}</span>
              <h3>{credential.title}</h3>
              <p>{selectedTrainee?.name} · {selectedProgramme?.title}</p>
              <div className="cc-inspector-metric"><b>{credential.grade ?? '—'}</b><small>Grade</small></div>
              <div className="cc-inspector-metric"><b>{new Date(credential.issuedDate).toLocaleDateString('en-IN')}</b><small>Issued</small></div>
              {credential.skillsAcquired.length > 0 && (
                <p className="cc-inspector-note">Skills on this credential: {credential.skillsAcquired.join(', ')}.</p>
              )}
              <button className="cc-inspector-link" onClick={verifyCredential} disabled={verifyState === 'checking'}>
                {verifyState === 'idle' && 'Verify this credential →'}
                {verifyState === 'checking' && 'Checking the national registry…'}
                {verifyState === 'valid' && '✓ Verified — check again'}
                {verifyState === 'invalid' && 'Verification failed — retry'}
              </button>
              {verifyMessage && <p className="cc-inspector-note">{verifyMessage} This is a registry lookup and status check, not a cryptographic signature verification.</p>}
            </>
          )}
        </aside>
      )}

      {level === 'employment' && (
        <aside className="cc-inspector" role="dialog" aria-label="Employment outcome">
          <button className="cc-inspector-close" onClick={goBack} aria-label="Back"><X size={14} /></button>
          {!employment ? (
            <><span className="cc-hud-label"><Briefcase size={12} aria-hidden /> Employment</span><h3>No outcome recorded</h3><p>{selectedTrainee?.name ?? 'This trainee'} has no employment outcome on record.</p></>
          ) : (
            <>
              <span className="cc-hud-label"><Briefcase size={12} aria-hidden /> {employment.verificationStatus}</span>
              <h3>{employment.employerName}</h3>
              <p>{employment.jobTitle}</p>
              {employment.annualPackage != null && <div className="cc-inspector-metric"><b>₹{Math.round(employment.annualPackage).toLocaleString('en-IN')}</b><small>Annual package</small></div>}
              <div className="cc-inspector-metric"><b>{new Date(employment.placementDate).toLocaleDateString('en-IN')}</b><small>Placement date</small></div>
            </>
          )}
        </aside>
      )}

      {level === 'region' && selectedRegion && !selected && (() => {
        const inRegion = nodes.filter((n) => n.state === selectedRegion);
        const programmes = inRegion.reduce((sum, n) => sum + n.programmeCount, 0);
        const trainees = statePerf.find((s) => s.state === selectedRegion)?.traineesCount;
        return (
          <aside className="cc-inspector" role="dialog" aria-label={`${selectedRegion} details`}>
            <button className="cc-inspector-close" onClick={goBack} aria-label="Back"><X size={14} /></button>
            <span className="cc-hud-label"><MapPin size={12} aria-hidden /> Region</span>
            <h3>{selectedRegion}</h3>
            <div className="cc-inspector-metric"><b>{inRegion.length}</b><small>Institution{inRegion.length === 1 ? '' : 's'}</small></div>
            <div className="cc-inspector-metric"><b>{programmes}</b><small>Programme{programmes === 1 ? '' : 's'} on record</small></div>
            <div className="cc-inspector-metric"><b>{trainees ?? 'Data not available'}</b><small>Trainees</small></div>
            <p className="cc-inspector-note">Learning, certification and employment activity aren't broken down per region yet.</p>
          </aside>
        );
      })()}

      {showIntel && level === 'national' && (
        <aside className="cc-inspector cc-inspector--intel" role="dialog" aria-label="National intelligence">
          <button className="cc-inspector-close" onClick={() => setShowIntel(false)} aria-label="Close"><X size={14} /></button>
          <span className="cc-hud-label"><Activity size={12} aria-hidden /> National intelligence</span>
          <h3>Live snapshot</h3>
          <p className="cc-inspector-note">These are real counts from the national registry as of right now. There is no historical or time-series endpoint behind this system yet, so this is a live snapshot only — not a playback of change over time.</p>

          <span className="cc-hud-label">Programmes by category</span>
          {programmesDist.length === 0 ? <p className="cc-inspector-note">No programmes on record.</p> : (
            <ul className="cc-intel-bars">
              {programmesDist.map((p) => (
                <li key={p.category}>
                  <span>{p.category}</span>
                  <i style={{ width: `${Math.round((p.count / Math.max(...programmesDist.map((x) => x.count), 1)) * 100)}%` }} />
                  <b>{p.count}</b>
                </li>
              ))}
            </ul>
          )}

          <span className="cc-hud-label">Trainees by target audience</span>
          {audienceDist.length === 0 ? <p className="cc-inspector-note">No trainees on record.</p> : (
            <ul className="cc-intel-bars">
              {audienceDist.map((a) => (
                <li key={a.type}>
                  <span>{a.type}</span>
                  <i style={{ width: `${Math.round((a.count / Math.max(...audienceDist.map((x) => x.count), 1)) * 100)}%` }} />
                  <b>{a.count}</b>
                </li>
              ))}
            </ul>
          )}

          <span className="cc-hud-label">Trainees by state</span>
          {statePerf.length === 0 ? <p className="cc-inspector-note">No state-linked trainee records yet.</p> : (
            <ul className="cc-intel-bars">
              {statePerf.map((s) => (
                <li key={s.state}>
                  <button onClick={() => { setShowIntel(false); enterRegionByName(s.state); }}>{s.state}</button>
                  <i style={{ width: `${Math.round((s.traineesCount / Math.max(...statePerf.map((x) => x.traineesCount), 1)) * 100)}%` }} />
                  <b>{s.traineesCount}</b>
                </li>
              ))}
            </ul>
          )}

          {k.digitalLearningAdoptionPercent == null && (
            <p className="cc-inspector-note">Digital learning adoption: data not available — no usage signal is tracked for this yet.</p>
          )}
        </aside>
      )}

      {state.error != null && <div className="cc-error">National indicators are unavailable right now.</div>}
    </div>
  );
}
