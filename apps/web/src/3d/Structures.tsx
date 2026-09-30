import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HeightMap, Inst } from './geo';
import { mulberry32 } from './geo';
import { groundAt } from './Terrain';
import type { AtlasState } from './state';

export interface Learner { x: number; z: number; h: number; r: number }
export const BEACONS: Array<[number, number]> = [[10.2, -4.6], [10.6, -2.8], [10.1, -1], [10.7, 0.9], [10.2, 2.7], [10.6, 4.4]];

const dummy = new THREE.Object3D();
const ease = (t: number) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };
const hex = (r = 1) => new THREE.CylinderGeometry(r, r, 1, 6);

interface Props { map: HeightMap; insts: Inst[]; learners: Learner[]; state: { current: AtlasState } }

/**
 * The built layer of the atlas. Every mark is a prism standing on real ground:
 *  institutions (hex prisms on plateaus) · programmes (small prisms around them) ·
 *  learners (slim markers, concentrating around one institution in the "learn" chapter) · employers (tall beacons).
 */
export function Structures({ map, insts, learners, state }: Props) {
  const instRef = useRef<THREE.InstancedMesh>(null);
  const progRef = useRef<THREE.InstancedMesh>(null);
  const learnRef = useRef<THREE.InstancedMesh>(null);
  const beaconRef = useRef<THREE.InstancedMesh>(null);

  const data = useMemo(() => {
    const rnd = mulberry32(5150);
    const progs: Array<{ x: number; z: number; r: number; h: number; inst: number }> = [];
    insts.forEach((it, i) => {
      const n = it.kind === 'hq' ? 4 : it.kind === 'vam' ? 3 : 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rnd() * 0.8;
        const rr = it.r * (1.05 + rnd() * 0.35);
        progs.push({ x: it.x + Math.cos(a) * rr, z: it.z + Math.sin(a) * rr, r: 0.05 + rnd() * 0.03, h: 0.14 + rnd() * 0.3, inst: i });
      }
    });
    const hq = insts[0];
    const dist = (x: number, z: number) => Math.hypot(x - hq.x, z - hq.z);
    const focus = insts[3] ?? insts[1]; // a southern RICM: where the "learn" chapter looks
    return { progs, dist, focus, hq };
  }, [insts]);

  const colours = useMemo(() => {
    const paper = new THREE.Color('#f0ede6'), net = new THREE.Color('#7f8fff'), live = new THREE.Color('#6fd3db'), ok = new THREE.Color('#84b9a6'), dim = new THREE.Color('#aab0c2');
    return { paper, net, live, ok, dim };
  }, []);

  useEffect(() => {
    const c = colours;
    insts.forEach((it, i) => instRef.current?.setColorAt(i, it.kind === 'hq' ? c.paper : c.net));
    data.progs.forEach((p, i) => progRef.current?.setColorAt(i, i % 3 === 0 ? c.live : c.dim));
    learners.forEach((_, i) => learnRef.current?.setColorAt(i, i % 9 === 0 ? c.live : i % 7 === 0 ? c.ok : c.paper));
    BEACONS.forEach((_, i) => beaconRef.current?.setColorAt(i, c.paper));
    [instRef, progRef, learnRef, beaconRef].forEach((r) => { if (r.current?.instanceColor) r.current.instanceColor.needsUpdate = true; });
  }, [colours, insts, data.progs, learners]);

  useFrame(() => {
    const s = state.current;
    const inst = instRef.current, prog = progRef.current, learn = learnRef.current, beacon = beaconRef.current;
    if (inst) {
      insts.forEach((it, i) => {
        const d = data.dist(it.x, it.z);
        const k = ease((s.instC - d * 0.11) / 1.1);
        const grow = i === 0 ? Math.max(ease((s.instC - 0) / 1.1), s.pin * 0.55) : ease((s.instC - d * 0.11 - 0.5) / 0.9);
        const ph = (it.kind === 'hq' ? 0.55 : it.kind === "vam" ? 0.4 : 0.26) * grow;
        const y = groundAt(map, insts, it.x, it.z, k) ;
        dummy.position.set(it.x, y + ph / 2, it.z);
        dummy.scale.set(it.r * 0.2, Math.max(0.0001, ph), it.r * 0.2);
        dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
      });
      inst.instanceMatrix.needsUpdate = true;
    }
    if (prog) {
      data.progs.forEach((p, i) => {
        const d = data.dist(p.x, p.z);
        const g = ease((s.progC - d * 0.08) / 0.9);
        const k = ease((s.instC - data.dist(insts[p.inst].x, insts[p.inst].z) * 0.11) / 1.1);
        const y = groundAt(map, insts, p.x, p.z, k);
        dummy.position.set(p.x, y + (p.h * g) / 2, p.z); dummy.scale.set(p.r, Math.max(0.0001, p.h * g), p.r);
        dummy.rotation.set(0, 0.5, 0); dummy.updateMatrix(); prog.setMatrixAt(i, dummy.matrix);
      });
      prog.instanceMatrix.needsUpdate = true;
    }
    if (learn) {
      learners.forEach((l, i) => {
        const g = ease((s.learnC - data.dist(l.x, l.z) * 0.06 - l.r * 1.2) / 0.9);
        const df = Math.hypot(l.x - data.focus.x, l.z - data.focus.z);
        const boost = 1 + s.focusW * 1.6 * Math.exp(-Math.pow(df / 1.5, 2));
        const y = groundAt(map, insts, l.x, l.z, ease((s.instC - data.dist(l.x, l.z) * 0.11) / 1.1));
        const h = l.h * boost * g;
        dummy.position.set(l.x, y + h / 2, l.z); dummy.scale.set(0.022, Math.max(0.0001, h), 0.022);
        dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); learn.setMatrixAt(i, dummy.matrix);
      });
      learn.instanceMatrix.needsUpdate = true;
    }
    if (beacon) {
      BEACONS.forEach(([x, z], i) => {
        const g = s.employ;
        dummy.position.set(x, (1.5 * g) / 2, z); dummy.scale.set(0.08, Math.max(0.0001, 1.5 * g), 0.08);
        dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); beacon.setMatrixAt(i, dummy.matrix);
      });
      beacon.instanceMatrix.needsUpdate = true;
    }
  });

  const hexGeo = useMemo(() => hex(1), []);
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => () => { hexGeo.dispose(); boxGeo.dispose(); }, [hexGeo, boxGeo]);

  return (
    <group>
      <instancedMesh ref={instRef} args={[hexGeo, undefined, insts.length]} frustumCulled={false}><meshStandardMaterial roughness={0.45} metalness={0.2} emissive="#2b3aa8" emissiveIntensity={0.35} /></instancedMesh>
      <instancedMesh ref={progRef} args={[hexGeo, undefined, data.progs.length]} frustumCulled={false}><meshStandardMaterial roughness={0.6} metalness={0.1} /></instancedMesh>
      <instancedMesh ref={learnRef} args={[boxGeo, undefined, learners.length]} frustumCulled={false}><meshStandardMaterial roughness={0.7} metalness={0} /></instancedMesh>
      <instancedMesh ref={beaconRef} args={[boxGeo, undefined, BEACONS.length]} frustumCulled={false}><meshStandardMaterial roughness={0.5} metalness={0.1} emissive="#3a3f55" emissiveIntensity={0.4} /></instancedMesh>
    </group>
  );
}
