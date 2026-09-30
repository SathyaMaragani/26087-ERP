import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32, projectLonLat, sampleIndia, STATE_LONLAT, terrain } from './india';
import { useDeviceTier } from '../lib/device';

export interface StateDatum { state: string; traineesCount: number }
/** Recolours the same India form for a light (Monsoon Porcelain) host instead of the dark Atlas one. */
export interface IndiaPalette { low: [number, number, number]; high: [number, number, number]; node: string; glow: string; ring: string; bg?: string }
const ATLAS_PALETTE: IndiaPalette = { low: [0.45, 0.62, 0.66], high: [0.8, 0.72, 0.56], node: '#c9d0ff', glow: '#8a98ff', ring: '#8a98ff' };

function sprite(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function Form({ states, reduced, count, palette }: { states: StateDatum[]; reduced: boolean; count: number; palette: IndiaPalette }) {
  const group = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    camera.zoom = Math.min(1, aspect * 1.15);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  const rings = useRef<THREE.Mesh[]>([]);
  const tex = useMemo(sprite, []);
  useEffect(() => () => tex.dispose(), [tex]);

  const base = useMemo(() => {
    const pts = sampleIndia(count, mulberry32(77));
    const pos = new Float32Array(pts.length * 3);
    const col = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      pos.set(p, i * 3);
      const h = Math.min(1, Math.max(0, (p[2] + 0.4) / 1.4));
      const [lr, lg, lb] = palette.low, [hr, hg, hb] = palette.high;
      col[i * 3] = lr + (hr - lr) * h; col[i * 3 + 1] = lg + (hg - lg) * h; col[i * 3 + 2] = lb + (hb - lb) * h;
    });
    return { pos, col };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, palette.low, palette.high]);

  const nodes = useMemo(() => {
    const max = Math.max(1, ...states.map((s) => s.traineesCount));
    return states
      .map((s) => ({ ...s, ll: STATE_LONLAT[s.state] }))
      .filter((s) => s.ll)
      .map((s) => {
        const [x, y] = projectLonLat(s.ll![0], s.ll![1]);
        return { key: s.state, x, y, z: terrain(x, y) + 0.3, r: 0.07 + 0.2 * Math.sqrt(s.traineesCount / max) };
      });
  }, [states]);

  useFrame((st) => {
    const t = reduced ? 0 : st.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.z = -0.02;
      group.current.rotation.x = -0.72 + Math.sin(t * 0.25) * 0.02;
      group.current.rotation.y = Math.sin(t * 0.2) * 0.1;
    }
    rings.current.forEach((m, i) => {
      if (!m) return;
      const p = reduced ? 0.5 : (t * 0.5 + i * 0.37) % 1;
      m.scale.setScalar(1 + p * 2.2);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.5;
    });
  });

  return (
    <group ref={group} position={[size.width > 700 ? 1.6 : 0, size.width > 700 ? -0.5 : -0.9, 0]}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[base.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[base.col, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.09} sizeAttenuation vertexColors map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.9} />
      </points>
      {nodes.map((n, i) => (
        <group key={n.key} position={[n.x, n.y, n.z]}>
          <mesh>
            <sphereGeometry args={[n.r * 0.55, 16, 16]} />
            <meshBasicMaterial color={palette.node} />
          </mesh>
          <sprite scale={[n.r * 7, n.r * 7, 1]}>
            <spriteMaterial map={tex} color={palette.glow} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
          <mesh ref={(m) => { if (m) rings.current[i] = m; }} scale={1}>
            <ringGeometry args={[n.r * 1.15, n.r * 1.3, 40]} />
            <meshBasicMaterial color={palette.ring} transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * The national form with real per-state trainee counts placed on it.
 * Node size is proportional to the square root of trainees in that state.
 */
export default function IndiaPulse({ states, palette = ATLAS_PALETTE }: { states: StateDatum[]; palette?: IndiaPalette }) {
  const tier = useDeviceTier();
  return (
    <Canvas dpr={[1, tier.mobile ? 1.5 : 2]} camera={{ fov: 42, position: [0, 0, 9.4] }} gl={{ antialias: true, alpha: palette.bg === undefined }} aria-hidden>
      {palette.bg && <color attach="background" args={[palette.bg]} />}
      <Form states={states} reduced={tier.reduced} count={tier.mobile ? 1400 : 2600} palette={palette} />
    </Canvas>
  );
}

export const MONSOON_INDIA_PALETTE: IndiaPalette = { low: [0.91, 0.9, 0.87], high: [0.57, 0.68, 0.63], node: '#A9613B', glow: '#D4A04D', ring: '#3E7C6A' };
