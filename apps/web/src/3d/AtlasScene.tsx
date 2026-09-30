import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { DeviceTier } from '../lib/device';
import { INTRO_LENGTH, INTRO_SEEN_KEY, sceneStore } from '../scene/sceneStore';
import { AtlasCamera } from './AtlasCamera';
import { Credential } from './Credential';
import { buildHeightMap, buildInstitutions, mulberry32, sampleIndia, toWorld } from './geo';
import { SignalPaths } from './SignalPaths';
import { computeState, newState, type AtlasState } from './state';
import { Structures, type Learner } from './Structures';
import { Terrain } from './Terrain';

const INK = '#070b14';

/** Drops resolution when the frame budget is missed; restores it when there is headroom. */
function PerfGuard({ maxDpr }: { maxDpr: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const st = useRef({ ema: 1 / 60, dpr: maxDpr, since: 0 });
  useFrame((_, dt) => {
    const s = st.current;
    s.ema += (Math.min(dt, 0.2) - s.ema) * 0.05; s.since += dt;
    if (s.since < 1.5) return;
    s.since = 0;
    if (s.ema > 1 / 38 && s.dpr > 0.8) { s.dpr = Math.max(0.8, s.dpr - 0.25); setDpr(s.dpr); }
    else if (s.ema < 1 / 57 && s.dpr < maxDpr) { s.dpr = Math.min(maxDpr, s.dpr + 0.15); setDpr(s.dpr); }
  });
  return null;
}

function AtlasWorld({ tier }: { tier: DeviceTier }) {
  const mobile = tier.mobile || tier.low;
  const world = useMemo(() => {
    const insts = buildInstitutions();
    const map = buildHeightMap();
    const rnd = mulberry32(9090);
    const pts = sampleIndia(mobile ? 320 : 900, rnd);
    const learners: Learner[] = pts.map(([x, y]) => ({ x, z: -y, h: 0.03 + rnd() * 0.09, r: rnd() }));
    return { insts, map, learners };
  }, [mobile]);
  const state = useRef<AtlasState>(newState());
  const hq = useMemo<[number, number]>(() => [world.insts[0].x, world.insts[0].z], [world]);
  const scene = useThree((s) => s.scene);
  useEffect(() => { scene.fog = new THREE.FogExp2(INK, 0.028); return () => { scene.fog = null; }; }, [scene]);

  // One clock for the whole atlas: opening time in real seconds, capped only for hitches.
  useFrame((_, dtRaw) => {
    if (sceneStore.introSkip) sceneStore.introT = Math.max(sceneStore.introT, 99);
    else if (!tier.reduced) sceneStore.introT += Math.min(dtRaw, 0.25);
    sceneStore.scrollVel *= Math.exp(-Math.min(dtRaw, 0.05) * 3);
    computeState(state.current, tier.reduced ? 99 : sceneStore.introT, tier.reduced, hq);
  }, -1);

  return (
    <>
      <AtlasCamera reduced={tier.reduced} allowPointer={!tier.mobile} hq={hq} />
      <hemisphereLight args={['#9db0ff', '#0a1020', 0.9]} />
      <directionalLight position={[-6, 10, 5]} intensity={2.3} color="#f0ede6" />
      <directionalLight position={[9, 4, -5]} intensity={0.9} color="#4e63ff" />
      <Terrain map={world.map} insts={world.insts} state={state} segments={mobile ? [150, 125] : [240, 200]} />
      <Structures map={world.map} insts={world.insts} learners={world.learners} state={state} />
      <SignalPaths kind="hierarchy" map={world.map} insts={world.insts} learners={world.learners} state={state} pulses={!tier.reduced} />
      <SignalPaths kind="employ" map={world.map} insts={world.insts} learners={world.learners} state={state} pulses={!tier.reduced} />
      <Credential state={state} />
    </>
  );
}

export default function AtlasScene({ tier }: { tier: DeviceTier }) {
  const maxDpr = tier.mobile ? 1.5 : 2;

  // Returning visitors skip the opening; a first visit plays it. Reduced motion never plays it.
  useMemo(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(INTRO_SEEN_KEY) === '1'; } catch { /* storage unavailable */ }
    if (sceneStore.introT === 0 && (seen || tier.reduced)) sceneStore.introT = 99;
    return null;
  }, [tier.reduced]);
  useEffect(() => {
    const t = window.setTimeout(() => { try { sessionStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* storage unavailable */ } }, (INTRO_LENGTH + 0.5) * 1000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <Canvas dpr={[1, maxDpr]} camera={{ fov: 40, near: 0.05, far: 140, position: [-11.5, 1.1, 13] }} gl={{ antialias: !tier.mobile, alpha: true, powerPreference: 'high-performance' }} style={{ position: 'absolute', inset: 0 }} aria-hidden>
      <AtlasWorld tier={tier} />
      <PerfGuard maxDpr={maxDpr} />
    </Canvas>
  );
}

export { toWorld };
