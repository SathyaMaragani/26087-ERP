import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HeightMap, Inst } from './geo';
import { mulberry32 } from './geo';
import { groundAt } from './Terrain';
import { BEACONS, type Learner } from './Structures';
import { pathFrag, pathVert } from './shaders';
import type { AtlasState } from './state';

const SEG = 44;

function buildArcs(pairs: Array<{ a: THREE.Vector3; b: THREE.Vector3; lift: number }>, seed: number) {
  const rnd = mulberry32(seed);
  const pos = new Float32Array(pairs.length * SEG * 6), aT = new Float32Array(pairs.length * SEG * 2), aR = new Float32Array(pairs.length * SEG * 2);
  const p = new THREE.Vector3();
  pairs.forEach((pr, i) => {
    const r = rnd();
    for (let s = 0; s < SEG; s++) {
      for (let e = 0; e < 2; e++) {
        const t = (s + e) / SEG;
        p.lerpVectors(pr.a, pr.b, t); p.y += Math.sin(Math.PI * t) * pr.lift;
        const o = (i * SEG + s) * 6 + e * 3, v = (i * SEG + s) * 2 + e;
        pos[o] = p.x; pos[o + 1] = p.y; pos[o + 2] = p.z; aT[v] = t; aR[v] = r;
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  g.setAttribute('aRand', new THREE.BufferAttribute(aR, 1));
  return g;
}

interface Props { kind: 'hierarchy' | 'employ'; map: HeightMap; insts: Inst[]; learners: Learner[]; state: { current: AtlasState }; pulses: boolean }

/**
 * Information moving through the system. Hierarchy: NCCT → VAMNICOM → RICMs → ICMs.
 * Employment: learners → employers beyond the landmass. Pulses are the only thing that travels.
 */
export function SignalPaths({ kind, map, insts, learners, state, pulses }: Props) {
  const { geo, mat } = useMemo(() => {
    const pairs: Array<{ a: THREE.Vector3; b: THREE.Vector3; lift: number }> = [];
    if (kind === 'hierarchy') {
      insts.forEach((it, i) => {
        if (it.parent < 0) return;
        const par = insts[it.parent];
        const a = new THREE.Vector3(par.x, groundAt(map, insts, par.x, par.z) + 0.75, par.z);
        const b = new THREE.Vector3(it.x, groundAt(map, insts, it.x, it.z) + 0.4, it.z);
        pairs.push({ a, b, lift: 0.5 + a.distanceTo(b) * 0.12 });
        void i;
      });
    } else {
      const rnd = mulberry32(88);
      for (let i = 0; i < 64; i++) {
        const l = learners[Math.floor(rnd() * learners.length)];
        const [bx, bz] = BEACONS[i % BEACONS.length];
        const a = new THREE.Vector3(l.x, groundAt(map, insts, l.x, l.z) + l.h, l.z);
        const b = new THREE.Vector3(bx, 1.5, bz);
        pairs.push({ a, b, lift: 1.1 + a.distanceTo(b) * 0.09 });
      }
    }
    const g = buildArcs(pairs, kind === 'hierarchy' ? 3 : 4);
    const m = new THREE.ShaderMaterial({
      vertexShader: pathVert, fragmentShader: pathFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uDraw: { value: 0 }, uTime: { value: 0 }, uFade: { value: 1 }, uSpeed: { value: kind === 'hierarchy' ? 0.16 : 0.22 }, uPulse: { value: pulses ? 1 : 0 },
        uBase: { value: new THREE.Color(kind === 'hierarchy' ? '#4e63ff' : '#6fd3db') }, uHot: { value: new THREE.Color(kind === 'hierarchy' ? '#c9d0ff' : '#e6fbfc') },
      },
    });
    return { geo: g, mat: m };
  }, [kind, map, insts, learners, pulses]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  useFrame((st) => {
    const s = state.current, u = mat.uniforms;
    u.uTime.value = st.clock.elapsedTime;
    u.uDraw.value = kind === 'hierarchy' ? s.arcs : s.employ;
    u.uFade.value = s.fade * (kind === 'hierarchy' ? 1 - 0.55 * s.employ : 1);
  });

  return <lineSegments geometry={geo} material={mat} frustumCulled={false} />;
}
