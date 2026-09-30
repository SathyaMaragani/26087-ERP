import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TERRAIN, type HeightMap, type Inst } from './geo';
import { NI, terrainFrag, terrainVert } from './shaders';
import type { AtlasState } from './state';

/**
 * The ground of the atlas: one displaced mesh, one draw call. Contours, lighting, the opening signals
 * and the reveal front are all computed in the shader from height.
 */
export function Terrain({ map, insts, state, segments }: { map: HeightMap; insts: Inst[]; state: { current: AtlasState }; segments: [number, number] }) {
  const { geo, mat, tex } = useMemo(() => {
    const t = new THREE.DataTexture(map.data, TERRAIN.tw, TERRAIN.th, THREE.RedFormat, THREE.UnsignedByteType);
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
    const g = new THREE.PlaneGeometry(TERRAIN.w, TERRAIN.d, segments[0], segments[1]);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.ShaderMaterial({
      vertexShader: terrainVert, fragmentShader: terrainFrag, transparent: true, depthWrite: true, side: THREE.DoubleSide,
      uniforms: {
        uHeightTex: { value: t }, uSize: { value: new THREE.Vector2(TERRAIN.w, TERRAIN.d) }, uHScale: { value: TERRAIN.hScale },
        uInst: { value: Array.from({ length: NI }, () => new THREE.Vector4(0, 0, 0, 1)) },
        uInk: { value: new THREE.Color('#070b14') }, uPaper: { value: new THREE.Color('#f0ede6') },
        uNet: { value: new THREE.Color('#4e63ff') }, uLive: { value: new THREE.Color('#6fd3db') },
        uOrigin: { value: new THREE.Vector2(insts[0].x, insts[0].z) }, uRad: { value: 0 },
        uSweepA: { value: -14 }, uSweepB: { value: 12 }, uLineFade: { value: 1 }, uFog: { value: 0.045 },
        uContrast: { value: 0 }, uFade: { value: 1 },
      },
    });
    return { geo: g, mat: m, tex: t };
  }, [map, insts, segments]);

  useEffect(() => () => { geo.dispose(); mat.dispose(); tex.dispose(); }, [geo, mat, tex]);

  useFrame(() => {
    const s = state.current, u = mat.uniforms;
    u.uRad.value = s.rad; u.uSweepA.value = s.sweepA; u.uSweepB.value = s.sweepB; u.uLineFade.value = s.lineFade;
    u.uContrast.value = s.contrast; u.uFade.value = s.fade;
    const arr = u.uInst.value as THREE.Vector4[];
    insts.forEach((it, i) => {
      // Plateaus rise as the reveal front reaches them, farthest last.
      const d = Math.hypot(it.x - insts[0].x, it.z - insts[0].z);
      const k = Math.min(1, Math.max(0, (s.instC - d * 0.11) / 1.1));
      arr[i].set(it.x, it.z, it.lift * k * k * (3 - 2 * k), it.r);
    });
  });

  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={0} />;
}

/** Height of the ground with plateaus at full lift (used to seat structures). */
export function groundAt(map: HeightMap, insts: Inst[], x: number, z: number, lift = 1) {
  let h = map.heightAt(x, z);
  for (const it of insts) {
    const d = Math.hypot(x - it.x, z - it.z);
    const t = Math.min(1, Math.max(0, (d - it.r * 0.55) / (it.r * 0.45)));
    h += (1 - t * t * (3 - 2 * t)) * it.lift * lift;
  }
  return h;
}
