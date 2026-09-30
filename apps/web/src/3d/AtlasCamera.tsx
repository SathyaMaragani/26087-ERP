import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { INTRO_LENGTH, sceneStore } from '../scene/sceneStore';
import { Spring, Spring3, clamp01, easeInOutCubic, smoothstep } from '../scene/springs';

type V3 = [number, number, number];
interface Pose { pos: V3; look: V3; fov: number; roll: number }

/**
 * The camera has a destination at every moment. States follow the story:
 * ATLAS → NETWORK → LEARNING → CREDENTIAL → EMPLOYMENT → OUTCOME → COMMAND. Movement is spring-driven; nothing teleports.
 */
export const POSES: Pose[] = [
  { pos: [-1.4, 8.2, 11.6], look: [0.3, 0, 0.6], fov: 44, roll: 0 },      // ATLAS (end of the opening)
  { pos: [1.6, 6.4, 9.2], look: [0, 0, 0], fov: 42, roll: -0.02 },        // NETWORK
  { pos: [-0.2, 2.5, 4.6], look: [-1.0, 0.1, 1.3], fov: 46, roll: 0.02 }, // LEARNING (over a southern institution)
  { pos: [0, 1.5, 6.3], look: [0, 1.3, 0.2], fov: 38, roll: 0 },          // CREDENTIAL
  { pos: [-4.8, 4.8, 8.4], look: [2.6, 0.7, 0], fov: 44, roll: -0.02 },   // EMPLOYMENT
  { pos: [0, 13.5, 6.8], look: [0.4, 0, 0.3], fov: 40, roll: 0.01 },      // OUTCOME
  { pos: [-1.5, 1.1, -0.2], look: [-1.5, 0.2, -3.4], fov: 58, roll: 0 },  // COMMAND (a dive toward the capital)
];
const OFFSET_X = [0, 2.2, -2.3, 1.7, -2.6, 2.6, 0];
const FROM: { pos: V3; look: V3; fov: number } = { pos: [-11.5, 1.1, 13], look: [-3, 0.3, 0.5], fov: 40 };

function poseAt(f: number) {
  const ff = Math.min(6, Math.max(0, f));
  const a = Math.min(5, Math.floor(ff)), t = smoothstep(ff - a);
  const A = POSES[a], B = POSES[a + 1];
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    pos: [mix(A.pos[0], B.pos[0]), mix(A.pos[1], B.pos[1]), mix(A.pos[2], B.pos[2])] as V3,
    look: [mix(A.look[0], B.look[0]), mix(A.look[1], B.look[1]), mix(A.look[2], B.look[2])] as V3,
    fov: mix(A.fov, B.fov), roll: mix(A.roll, B.roll), ox: mix(OFFSET_X[a], OFFSET_X[a + 1]),
  };
}

const pointer = { x: 0, y: 0 };

export function AtlasCamera({ reduced, allowPointer, hq }: { reduced: boolean; allowPointer: boolean; hq: [number, number] }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const sp = useMemo(() => ({
    pos: new Spring3(FROM.pos[0], FROM.pos[1], FROM.pos[2], 3.6, 0.92),
    look: new Spring3(FROM.look[0], FROM.look[1], FROM.look[2], 4.4, 0.92),
    fov: new Spring(FROM.fov, 3.5, 0.95), roll: new Spring(0, 3, 0.6),
  }), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const first = useRef(true);

  useEffect(() => {
    if (!allowPointer || reduced) return;
    const on = (e: PointerEvent) => { pointer.x = (e.clientX / window.innerWidth) * 2 - 1; pointer.y = -((e.clientY / window.innerHeight) * 2 - 1); };
    window.addEventListener('pointermove', on, { passive: true });
    return () => window.removeEventListener('pointermove', on);
  }, [allowPointer, reduced]);

  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const T = reduced ? 99 : sceneStore.introT;
    const f = sceneStore.target * 6;
    const S = poseAt(f);
    let tp: V3 = [...S.pos], tl: V3 = [...S.look], tf = S.fov;

    // Opening: a low, grazing pass across the dark, then a rise over the revealed atlas. Scrolling takes over.
    const u = clamp01((T - 0.4) / (INTRO_LENGTH - 0.6));
    if (u < 1) {
      const own = 1 - clamp01(f * 3);
      const e = easeInOutCubic(u);
      const low = 1 - smoothstep(clamp01((u - 0.1) / 0.55)); // how "grazing" we still are
      const ip: V3 = [FROM.pos[0] + (POSES[0].pos[0] - FROM.pos[0]) * e, FROM.pos[1] + (POSES[0].pos[1] - FROM.pos[1]) * Math.pow(e, 1.6) + low * 0.0, FROM.pos[2] + (POSES[0].pos[2] - FROM.pos[2]) * e];
      // aim at the first point while the signals are drawn, then release toward the atlas
      const aim = smoothstep(clamp01((T - 2.2) / 1.6)) * (1 - smoothstep(clamp01((T - 5.0) / 2.4)));
      const il: V3 = [FROM.look[0] + (POSES[0].look[0] - FROM.look[0]) * e + (hq[0] - FROM.look[0]) * aim * 0.55, FROM.look[1] + (POSES[0].look[1] - FROM.look[1]) * e, FROM.look[2] + (POSES[0].look[2] - FROM.look[2]) * e + (hq[1] - FROM.look[2]) * aim * 0.55];
      tp = tp.map((x, i) => x + (ip[i] - x) * own) as V3;
      tl = tl.map((x, i) => x + (il[i] - x) * own) as V3;
      tf += (FROM.fov + (POSES[0].fov - FROM.fov) * e - tf) * own;
    }

    const par = sceneStore.parallax * (reduced || !allowPointer ? 0 : 1);
    const time = reduced ? 0 : st.clock.elapsedTime;
    const ox = S.ox * sceneStore.composition + sceneStore.shiftX;
    tp[0] += ox + pointer.x * 0.7 * par + Math.sin(time * 0.11) * 0.12 * (reduced ? 0 : 1);
    tp[1] += pointer.y * 0.35 * par;
    tl[0] += ox;
    const aspect = size.width / size.height;
    if (aspect < 0.8) { const lift = (0.8 - aspect) * 16; tp[2] += lift; tl[2] += lift; tp[0] -= lift * 0.22; tl[0] -= lift * 0.22; } // portrait: seat the landmass in the upper half, above the copy
    const back = Math.min(1.5, Math.max(1, 1.0 / aspect)); // portrait: pull back to keep the landmass in frame
    tp = [tl[0] + (tp[0] - tl[0]) * back, tl[1] + (tp[1] - tl[1]) * back, tl[2] + (tp[2] - tl[2]) * back];
    const roll = S.roll + (reduced ? 0 : pointer.x * -0.008) + sceneStore.scrollVel * 0.015;

    if (first.current || reduced) {
      sp.pos.x.snap(tp[0]); sp.pos.y.snap(tp[1]); sp.pos.z.snap(tp[2]);
      sp.look.x.snap(tl[0]); sp.look.y.snap(tl[1]); sp.look.z.snap(tl[2]); sp.fov.snap(tf);
      if (!reduced && T < 0.2) { sp.pos.x.snap(FROM.pos[0]); sp.pos.y.snap(FROM.pos[1]); sp.pos.z.snap(FROM.pos[2]); }
      first.current = false;
    }
    const [px, py, pz] = sp.pos.step(tp[0], tp[1], tp[2], dt);
    const [lx, ly, lz] = sp.look.step(tl[0], tl[1], tl[2], dt);
    const r = sp.roll.step(roll, dt);
    camera.position.set(px, py, pz); camera.up.set(Math.sin(r), Math.cos(r), 0);
    v.set(lx, ly, lz); camera.lookAt(v);
    const fov = sp.fov.step(tf, dt);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    sceneStore.focus = camera.position.distanceTo(v);
  });
  return null;
}
