import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Spring, Spring3, smoothstep } from './springs';

export interface ExNode { id: string; label: string; color: string; local: [number, number, number]; size: number }
export interface ExLevel {
  key: string;
  center: [number, number, number];
  radius: number;
  camDist: number;
  nodes: ExNode[];
  selectedId: string | null;
  /** false while a level is retracting into its parent (collapse). */
  open: boolean;
}

interface Props {
  levels: ExLevel[];
  active: number;
  hoverId: string | null;
  reduced: boolean;
  onHover: (id: string | null, clientX?: number, clientY?: number) => void;
  onPick: (level: number, id: string) => void;
}

let glowTex: THREE.CanvasTexture | null = null;
function glow() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.3, 'rgba(255,255,255,0.5)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

/** One constellation. Its nodes emerge from the centre (the parent node) and retract into it on collapse. */
function Cluster({ level, index, active, hoverId, reduced, onHover, onPick }: { level: ExLevel; index: number } & Omit<Props, 'levels'>) {
  const appear = useRef(0);
  const dim = useRef(1);
  const groups = useRef<Array<THREE.Group | null>>([]);
  const scales = useRef<number[]>([]);
  const tex = glow();

  const { lineGeo, lineMat, packetGeo, packetMat, ringGeo } = useMemo(() => {
    const n = level.nodes.length;
    const lg = new THREE.BufferGeometry();
    const lp = new THREE.BufferAttribute(new Float32Array(n * 6), 3); lp.setUsage(THREE.DynamicDrawUsage);
    lg.setAttribute('position', lp);
    const lm = new THREE.LineBasicMaterial({ color: '#91B3A5', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const P = Math.min(n, 28);
    const pg = new THREE.BufferGeometry();
    const pp = new THREE.BufferAttribute(new Float32Array(P * 3), 3); pp.setUsage(THREE.DynamicDrawUsage);
    pg.setAttribute('position', pp);
    const pm = new THREE.PointsMaterial({ color: '#D4A04D', size: Math.max(0.02, level.radius * 0.06), map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    return { lineGeo: lg, lineMat: lm, packetGeo: pg, packetMat: pm, ringGeo: new THREE.RingGeometry(level.radius * 0.985, level.radius, 128) };
  }, [level.nodes.length, level.radius, tex]);
  useEffect(() => () => { lineGeo.dispose(); lineMat.dispose(); packetGeo.dispose(); packetMat.dispose(); ringGeo.dispose(); }, [lineGeo, lineMat, packetGeo, packetMat, ringGeo]);

  const phases = useMemo(() => level.nodes.map((_, i) => (i * 0.61803) % 1), [level.nodes]);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const k = 1 - Math.exp(-dt * (reduced ? 40 : level.open ? 2.6 : 3.4));
    appear.current += ((level.open ? 1 : 0) - appear.current) * k;
    const a = smoothstep(Math.min(1, Math.max(0, appear.current)));
    const isActive = index === active && level.open;
    dim.current += ((index === active ? 1 : 0.2) - dim.current) * (1 - Math.exp(-dt * 4));
    const [cx, cy, cz] = level.center;
    const lp = lineGeo.getAttribute('position') as THREE.BufferAttribute;
    const pp = packetGeo.getAttribute('position') as THREE.BufferAttribute;
    const time = reduced ? 0 : st.clock.elapsedTime;

    level.nodes.forEach((nd, i) => {
      const g = groups.current[i];
      if (!g) return;
      const x = cx + nd.local[0] * a, y = cy + nd.local[1] * 0.12 * a, z = cz + nd.local[2] * a;
      g.position.set(x, y, z);
      const selected = level.selectedId === nd.id;
      const hovered = hoverId === nd.id && isActive;
      const want = (hovered ? 1.45 : 1) * (selected && index < active ? 1.4 : 1) * Math.max(0.001, a);
      scales.current[i] = (scales.current[i] ?? 0.001) + (want - (scales.current[i] ?? 0.001)) * (1 - Math.exp(-dt * 10));
      g.scale.setScalar(scales.current[i]);
      const fade = index < active ? (selected ? 0.95 : 0.16) : 1;
      g.children.forEach((c) => {
        const m = (c as THREE.Mesh).material as THREE.Material & { opacity: number };
        if (!m) return;
        if (c.userData.kind === 'core') m.opacity = fade * a;
        else if (c.userData.kind === 'ring') m.opacity = ((c.userData.base as number) * 0.9 + (hovered ? 0.3 : 0)) * fade * a;
      });
      lp.setXYZ(i * 2, cx, cy, cz); lp.setXYZ(i * 2 + 1, x, y, z);
      if (i < pp.count) {
        const f = ((time * 0.35 + phases[i]) % 1);
        pp.setXYZ(i, cx + (x - cx) * f, cy + (y - cy) * f, cz + (z - cz) * f);
      }
    });
    lp.needsUpdate = true; pp.needsUpdate = true;
    lineMat.opacity = 0.32 * a * dim.current;
    packetMat.opacity = 0.95 * a * dim.current * (reduced ? 0 : 1);
    if (ringMat.current) ringMat.current.opacity = 0.4 * a * dim.current;
  });

  const interactive = index === active && level.open;
  return (
    <group>
      <lineSegments geometry={lineGeo} material={lineMat} frustumCulled={false} />
      <points geometry={packetGeo} material={packetMat} frustumCulled={false} />
      <mesh geometry={ringGeo} position={level.center} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial ref={ringMat} color="#ece8df" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {level.nodes.map((nd, i) => (
        <group key={nd.id} ref={(g) => { groups.current[i] = g; }}>
          <mesh userData={{ kind: 'core' }} position={[0, nd.size * 1.6, 0]}>
            <cylinderGeometry args={[nd.size * 0.75, nd.size * 0.75, nd.size * 3.2, 6]} />
            <meshStandardMaterial color={nd.color} roughness={0.5} metalness={0.15} emissive={nd.color} emissiveIntensity={0.18} transparent opacity={0} />
          </mesh>
          {[1.5, 2.3, 3.2].map((k) => (
            <mesh key={k} userData={{ kind: 'ring', base: 0.5 / k }} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[nd.size * k, nd.size * k * 1.03, 6 * 8]} />
              <meshBasicMaterial color={nd.color} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          ))}
          {/* Generous hit target so small nodes stay easy to pick */}
          <mesh
            raycast={interactive ? undefined : () => null}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(nd.id, e.nativeEvent.clientX, e.nativeEvent.clientY); document.body.style.cursor = 'pointer'; }}
            onPointerMove={(e: ThreeEvent<PointerEvent>) => onHover(nd.id, e.nativeEvent.clientX, e.nativeEvent.clientY)}
            onPointerOut={() => { onHover(null); document.body.style.cursor = ''; }}
            onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPick(index, nd.id); }}
          >
            <sphereGeometry args={[nd.size * 2.6, 12, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Slow, deliberate flight toward whichever cluster is active. Zooming out flies the same path back. */
function ExplorerCamera({ levels, active, reduced }: { levels: ExLevel[]; active: number; reduced: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const sp = useMemo(() => ({ pos: new Spring3(0, 0.8, 16, 3.1, 0.95), look: new Spring3(0, 0, 0, 3.6, 0.95), fov: new Spring(46, 2.5, 1), roll: new Spring(0, 2, 0.7) }), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const first = useRef(true);
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const on = (e: PointerEvent) => { pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1; pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1); };
    window.addEventListener('pointermove', on, { passive: true });
    return () => window.removeEventListener('pointermove', on);
  }, []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const L = levels[Math.min(active, levels.length - 1)];
    if (!L) return;
    const par = reduced ? 0 : 1;
    const tp: [number, number, number] = [L.center[0] + pointer.current.x * L.camDist * 0.06 * par, L.center[1] + L.camDist * 0.52 + pointer.current.y * L.camDist * 0.04 * par, L.center[2] + L.camDist * 0.86];
    if (first.current) { sp.pos.x.snap(tp[0]); sp.pos.y.snap(tp[1] + 1.5); sp.pos.z.snap(tp[2] + 7); sp.look.x.snap(L.center[0]); sp.look.y.snap(L.center[1]); sp.look.z.snap(L.center[2]); first.current = false; }
    const [px, py, pz] = sp.pos.step(tp[0], tp[1], tp[2], dt);
    const [lx, ly, lz] = sp.look.step(L.center[0], L.center[1], L.center[2], dt);
    const r = sp.roll.step(reduced ? 0 : (active % 2 ? -0.04 : 0.03), dt);
    camera.position.set(px, py, pz);
    camera.up.set(Math.sin(r), Math.cos(r), 0);
    v.set(lx, ly, lz); camera.lookAt(v);
    const fov = sp.fov.step(46 + active * 2, dt);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  });
  return null;
}

export default function ExplorerScene(props: Props) {
  const { levels, ...rest } = props;
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 46, near: 0.01, far: 200, position: [0, 3, 30] }} gl={{ antialias: true, alpha: true }} aria-hidden onPointerMissed={() => props.onHover(null)}>
      <hemisphereLight args={['#F5F1E8', '#18201D', 1]} />
      <directionalLight position={[-6, 10, 5]} intensity={2} color="#f0ede6" />
      <ExplorerCamera levels={levels} active={props.active} reduced={props.reduced} />
      {levels.map((lv, i) => <Cluster key={lv.key} level={lv} index={i} {...rest} />)}
    </Canvas>
  );
}
