import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { mulberry32, projectLonLat, STATE_LONLAT, terrain } from '../scene/india';
import { regionPosition } from './regionGeo';

export interface InstitutionNode {
  id: string;
  name: string;
  type: string;
  state: string | null;
  programmeCount: number;
}

export interface LayerState { institutions: boolean; training: boolean; learning: boolean; credentials: boolean; employment: boolean }
export type FocusLevel = 'national' | 'region' | 'institution' | 'programme' | 'trainee' | 'skill' | 'credential' | 'employment';

/** What's real for this one trainee's journey through this one programme — computed in
 * CommandCenter.tsx from api.trainees.get()/tenantApi().trainee(), never guessed here. */
export interface TraineeSignal {
  name: string;
  certified: boolean;
  skillsCount: number;
  employed: boolean;
}

export interface SkillNode { id: string; name: string; category: string | null; onCredential: boolean }
export interface CredentialInfo { certificateNumber: string; title: string; issuedDate: string; status: string; grade: string | null; skillsAcquired: string[] }
export interface EmploymentInfo { employerName: string; jobTitle: string; annualPackage: number | null; placementDate: string; verificationStatus: string }

export interface ProgrammeNode {
  id: string;
  title: string;
  code: string;
  category: string;
  mode: string;
  status: string;
  registrations: number;
  certificates: number;
}

const JADE = new THREE.Color('#3E7C6A');
const COPPER = new THREE.Color('#A9613B');
const MARIGOLD = new THREE.Color('#D4A04D');
const RAIN = new THREE.Color('#7897A0');
const INK = new THREE.Color('#18201D');

function nodePosition(state: string | null, seed: number): THREE.Vector3 {
  const ll = (state && STATE_LONLAT[state]) || STATE_LONLAT['Madhya Pradesh'];
  const jitter = mulberry32(seed || 1);
  const [x, y] = projectLonLat(ll[0] + (jitter() - 0.5) * 0.6, ll[1] + (jitter() - 0.5) * 0.6);
  return new THREE.Vector3(x, terrain(x, y) + 0.06, -y);
}


/**
 * Damped, bounded orbit — a "digital model" camera, not a free-spinning globe.
 * `focusDistance` is a one-shot travel target, not a leash: on every prop change we animate the
 * camera in to it, then hand zoom back to the user's own scroll/pinch. Locking distance every
 * frame (the previous approach) silently overrode any manual zoom the instant the user tried it,
 * since it kept re-lerping back toward the last programmatic value forever.
 */
function CameraRig({ focus, focusDistance }: { focus: THREE.Vector3; focusDistance: number }) {
  const { camera, gl, invalidate } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const travelling = useRef(false);
  const prevFocusDistance = useRef(focusDistance);

  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.07;
    c.enablePan = false;
    c.minDistance = 3.6;
    c.maxDistance = 28;
    // India's long axis runs roughly north-south (mapped to world Z); a shallow polar angle keeps
    // the camera looking down its length across the whole landmass instead of along it edge-on.
    c.minPolarAngle = Math.PI * 0.1;
    c.maxPolarAngle = Math.PI * 0.42;
    c.rotateSpeed = 0.5;
    c.zoomSpeed = 0.6;
    c.addEventListener('change', () => invalidate());
    controlsRef.current = c;
    return () => c.dispose();
  }, [camera, gl, invalidate]);

  useEffect(() => {
    if (focusDistance !== prevFocusDistance.current) {
      travelling.current = true;
      prevFocusDistance.current = focusDistance;
    }
  }, [focusDistance]);

  useFrame(() => {
    const c = controlsRef.current;
    if (!c) return;
    c.target.lerp(focus, 0.055);
    if (travelling.current) {
      const offset = camera.position.clone().sub(c.target);
      const dist = offset.length() || 1;
      const next = THREE.MathUtils.lerp(dist, focusDistance, 0.06);
      offset.setLength(next);
      camera.position.copy(c.target).add(offset);
      if (Math.abs(next - focusDistance) < 0.03) travelling.current = false;
    }
    c.update();
  });
  return null;
}

/* The India landmass is a genuine Blender-built GLB (public/models/ncct-india.glb) — a real
   extruded/bevelled mesh derived from current administrative-boundary data (state borders
   including Telangana/Ladakh/Odisha/Uttarakhand), not a procedural approximation or a flat
   image. Built by scripts/blender-india/build_india.py using the SAME equirectangular
   projection (LON0=82.5, LAT0=22.0, SCALE=0.3) as nodePosition()/regionPosition() below, so
   institution markers land on the correct geography without any change to that logic. Export
   used Blender's Y-up glTF convention (Blender Z→glTF Y, Blender Y→glTF -Z), which already
   matches this file's `z = -y` convention — no coordinate remapping needed at runtime. */
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

function IndiaModel() {
  const gltf = useLoader(GLTFLoader, '/models/ncct-india.glb', (loader) => {
    (loader as GLTFLoader).setDRACOLoader(dracoLoader);
  });
  const scene = useMemo(() => gltf.scene.clone(true), [gltf]);
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        // Defensive: the base mesh merges ~800 ring polygons from real GIS boundary data whose
        // winding order isn't guaranteed consistent; render both sides so the landmass is never
        // invisible from the default camera angle regardless of any remaining normal flips.
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => { if (m) (m as THREE.Material).side = THREE.DoubleSide; });
      }
    });
  }, [scene]);
  return <primitive object={scene} />;
}

function InstitutionMarker({ node, active, selected, dim, pulse, onSelect }: { node: InstitutionNode; active: boolean; selected: boolean; dim: boolean; pulse: number; onSelect: (n: InstitutionNode, pos: THREE.Vector3) => void }) {
  const pos = useMemo(() => nodePosition(node.state, node.id.length + node.id.charCodeAt(0)), [node]);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const color = node.type === 'RICM' ? JADE : node.type === 'ICM' ? RAIN : COPPER;
  const baseOpacity = dim ? 0.22 : 1;

  useFrame((st) => {
    if (ringRef.current) {
      const s = 1 + (Math.sin(st.clock.elapsedTime * 1.6 + node.id.length) * 0.5 + 0.5) * 0.4 * pulse;
      ringRef.current.scale.setScalar(s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (0.35 * pulse + (hover || active ? 0.4 : 0)) * baseOpacity;
    }
  });

  return (
    <group position={pos}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(node, pos); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[hover || active || selected ? 0.13 : 0.095, 12, 12]} />
        <meshBasicMaterial color={active ? MARIGOLD : color} transparent opacity={baseOpacity} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.4, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.5 * baseOpacity} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.17, 0.21, 28]} />
        <meshBasicMaterial color={color} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {selected && <InstitutionTwin programmeCount={node.programmeCount} />}
    </group>
  );
}

const TWIN_LAYERS = ['Programmes', 'Trainees', 'Learning', 'Certification', 'Employment'] as const;

/** The "miniature digital twin": a stack the institution's own record can actually light up.
 * Only Programmes has a real per-institution signal today — the rest stay quiet rather than
 * pretend to know something the API doesn't report yet. */
function InstitutionTwin({ programmeCount }: { programmeCount: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame((st) => { if (group.current) group.current.rotation.y = st.clock.elapsedTime * 0.25; });
  return (
    <group ref={group} position={[0, 0.35, 0]}>
      {TWIN_LAYERS.map((label, i) => {
        const lit = label === 'Programmes' && programmeCount > 0;
        return (
          <mesh key={label} position={[0, i * 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.06 + i * 0.012, 0.075 + i * 0.012, 24]} />
            <meshBasicMaterial color={lit ? MARIGOLD : INK} transparent opacity={lit ? 0.75 : 0.12} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

const PATHWAY_STAGES = ['Registered', 'Training', 'Completed', 'Certified'] as const;

/** The programme's real lifecycle, not invented "modules" — TrainingProgramme has no modules
 * relation in the schema (LMS courses are a separate, unrelated model), so the honest spatial
 * pathway is the programme's own status + registration/certificate counts, not fabricated content. */
function ProgrammePathway({ programme }: { programme: ProgrammeNode }) {
  const lit = {
    Registered: programme.registrations > 0,
    Training: programme.status === 'ONGOING' || programme.status === 'COMPLETED',
    Completed: programme.status === 'COMPLETED',
    Certified: programme.certificates > 0,
  };
  return (
    <group position={[0, 0.22, 0]}>
      {PATHWAY_STAGES.map((label, i) => (
        <mesh key={label} position={[0, i * 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.05 + i * 0.01, 0.062 + i * 0.01, 20]} />
          <meshBasicMaterial color={lit[label] ? JADE : INK} transparent opacity={lit[label] ? 0.7 : 0.1} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** A programme node — orbits the institution it belongs to, not placed on the national map. */
function ProgrammeMarker({ programme, index, count, anchor, selected, onSelect }: { programme: ProgrammeNode; index: number; count: number; anchor: THREE.Vector3; selected: boolean; onSelect: (p: ProgrammeNode, pos: THREE.Vector3) => void }) {
  const angle = (index / Math.max(1, count)) * Math.PI * 2;
  const pos = useMemo(() => new THREE.Vector3(Math.cos(angle) * 0.3, 0.02, Math.sin(angle) * 0.3), [angle]);
  const [hover, setHover] = useState(false);
  const color = programme.status === 'ONGOING' ? JADE : programme.status === 'COMPLETED' ? RAIN : MARIGOLD;
  return (
    <group position={pos}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(programme, anchor.clone().add(pos)); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => setHover(false)}
      >
        <octahedronGeometry args={[hover || selected ? 0.075 : 0.055, 0]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 1 : 0.75} />
      </mesh>
      {selected && <ProgrammePathway programme={programme} />}
    </group>
  );
}

const TRAINEE_STAGES = ['Programme', 'Learning', 'Assessment', 'Credential', 'Skills', 'Employment'] as const;
const STAGE_Y: Record<string, number> = { Programme: 0.1, Learning: 0.25, Assessment: 0.4, Credential: 0.55, Skills: 0.7, Employment: 0.85 };

/**
 * ONE PERSON. Assessment and LMS progress have no relation to TraineeProfile/TrainingProgramme in
 * the schema (Assessment hangs off the separate Course model), so those two stages stay honestly
 * unlit rather than borrowing a signal that isn't actually theirs — only Programme (the anchor),
 * Credential and Employment are real per-trainee facts here, plus real skills.
 * `anchor` is this whole object's world position, needed only so a stage click can report back a
 * world-space camera-focus target (the mesh itself renders purely in local space, as everywhere
 * else in this file).
 */
function TraineeJourney({
  signal, skills, credential, employment, stageLevel, anchor, onFocusStage, onSelectSkill,
}: {
  signal: TraineeSignal; skills: SkillNode[]; credential: CredentialInfo | null; employment: EmploymentInfo | null;
  stageLevel: FocusLevel; anchor: THREE.Vector3;
  onFocusStage: (stage: 'skill' | 'credential' | 'employment', pos: THREE.Vector3) => void;
  onSelectSkill: (skill: SkillNode, pos: THREE.Vector3) => void;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((st) => { if (group.current) group.current.rotation.y = st.clock.elapsedTime * 0.18; });
  const lit: Record<(typeof TRAINEE_STAGES)[number], boolean> = {
    Programme: true,
    Learning: false,
    Assessment: false,
    Credential: signal.certified,
    Skills: signal.skillsCount > 0,
    Employment: signal.employed,
  };
  const worldAt = (y: number, x = 0, z = 0) => anchor.clone().add(new THREE.Vector3(x, y, z));
  return (
    <group position={[0, 0.05, 0]}>
      {/* The core — a single vertical porcelain shaft standing in for the person themself. */}
      <mesh position={[0, 0.42, 0]}>
        <capsuleGeometry args={[0.03, 0.68, 4, 8]} />
        <meshStandardMaterial color="#FBF9F4" roughness={0.5} emissive={new THREE.Color('#D4A04D')} emissiveIntensity={0.15} />
      </mesh>
      <group ref={group}>
        {TRAINEE_STAGES.map((label, i) => {
          const y = STAGE_Y[label];
          const on = lit[label];
          if (label === 'Credential') {
            const focused = stageLevel === 'credential';
            return (
              <mesh
                key={label} position={[0.1, y, 0]} rotation={[0, 0.4, 0]} scale={focused ? 1.6 : 1}
                onClick={on ? (e) => { e.stopPropagation(); onFocusStage('credential', worldAt(y, 0.1)); } : undefined}
                onPointerOver={on ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; } : undefined}
                onPointerOut={() => { document.body.style.cursor = 'auto'; }}
              >
                <boxGeometry args={[0.12, 0.008, 0.08]} />
                <meshStandardMaterial color={on ? '#D4A04D' : '#EDE9DE'} roughness={0.6} transparent opacity={on ? 1 : 0.25} />
              </mesh>
            );
          }
          if (label === 'Skills') {
            const focused = stageLevel === 'skill';
            const count = Math.max(skills.length, 1);
            return (
              <group key={label}>
                <mesh
                  position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}
                  onClick={on ? (e) => { e.stopPropagation(); onFocusStage('skill', worldAt(y)); } : undefined}
                  onPointerOver={on ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; } : undefined}
                  onPointerOut={() => { document.body.style.cursor = 'auto'; }}
                >
                  <ringGeometry args={[0.045 + i * 0.006, 0.058 + i * 0.006, 22]} />
                  <meshBasicMaterial color={on ? JADE : INK} transparent opacity={on ? 0.75 : 0.1} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                {on && skills.map((sk, s) => {
                  const r = focused ? 0.22 : 0.09;
                  const a = (s / count) * Math.PI * 2;
                  const pos: [number, number, number] = [Math.cos(a) * r, y, Math.sin(a) * r];
                  return (
                    <mesh
                      key={sk.id} position={pos} scale={focused ? 1.8 : 1}
                      onClick={(e) => { e.stopPropagation(); onSelectSkill(sk, worldAt(y, pos[0], pos[2])); }}
                      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
                      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
                    >
                      <sphereGeometry args={[0.012, 8, 8]} />
                      <meshBasicMaterial color={sk.onCredential ? MARIGOLD : RAIN} />
                    </mesh>
                  );
                })}
              </group>
            );
          }
          if (label === 'Employment') {
            const focused = stageLevel === 'employment';
            return (
              <group key={label}>
                <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.045 + i * 0.006, 0.058 + i * 0.006, 22]} />
                  <meshBasicMaterial color={on ? JADE : INK} transparent opacity={on ? 0.75 : 0.1} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                {on && (
                  <group position={[0.13, y, 0]}>
                    {/* An invisible, generously sized hit-target: the visible ring below it is
                        deliberately small/precise, but a 0.02-radius disc is an unreliable click
                        target at this camera distance — this widens it without changing the look. */}
                    <mesh
                      rotation={[-Math.PI / 2, 0, 0]}
                      onClick={(e) => { e.stopPropagation(); onFocusStage('employment', worldAt(y, 0.13)); }}
                      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
                      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
                    >
                      <circleGeometry args={[0.06, 16]} />
                      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={focused ? 1.8 : 1}>
                      <ringGeometry args={[0.018, 0.024, 16]} />
                      <meshBasicMaterial color={COPPER} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />
                    </mesh>
                  </group>
                )}
              </group>
            );
          }
          return (
            <mesh key={label} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.045 + i * 0.006, 0.058 + i * 0.006, 22]} />
              <meshBasicMaterial color={on ? JADE : INK} transparent opacity={on ? 0.75 : 0.1} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          );
        })}
        {/* The employer — a destination, deliberately set apart from the ring stack, reached along a route. */}
        {stageLevel === 'employment' && employment && (
          <group position={[0.55, STAGE_Y.Employment, 0]}>
            <mesh>
              <boxGeometry args={[0.16, 0.16, 0.16]} />
              <meshStandardMaterial color="#EDE9DE" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[0.1, 0.04, 0.1]} />
              <meshStandardMaterial color={COPPER} roughness={0.6} />
            </mesh>
          </group>
        )}
        {stageLevel === 'employment' && employment && (() => {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0.13, STAGE_Y.Employment, 0, 0.55, STAGE_Y.Employment, 0]), 3));
          return <lineSegments geometry={g}><lineBasicMaterial color={COPPER} transparent opacity={0.5} /></lineSegments>;
        })()}
      </group>
    </group>
  );
}

/** A region anchor — distinct from an institution node: a wider halo you focus into, not a place. */
function RegionMarker({ state, count, focused, onSelect, onHover }: { state: string; count: number; focused: boolean; onSelect: (state: string, pos: THREE.Vector3) => void; onHover: (state: string | null) => void }) {
  const pos = useMemo(() => regionPosition(state), [state]);
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    if (ringRef.current) {
      const p = (st.clock.elapsedTime * 0.2 + state.length * 0.1) % 1;
      ringRef.current.scale.setScalar(0.6 + p * 0.7);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = focused ? 0 : (1 - p) * 0.3;
    }
  });
  if (focused) return null;
  return (
    <group position={[pos.x, pos.y + 0.01, pos.z]}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(state, pos); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(state); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => onHover(null)}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.28, 0.34, 6]} />
        <meshBasicMaterial color={RAIN} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.3, 32]} />
        <meshBasicMaterial color={RAIN} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function AggregateSignal({ radius, intensity, color, y }: { radius: number; intensity: number; color: THREE.Color; y: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    if (!ref.current) return;
    const p = (st.clock.elapsedTime * 0.15) % 1;
    ref.current.scale.setScalar(0.3 + p * radius);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = intensity * (1 - p) * 0.5;
  });
  if (intensity <= 0) return null;
  return (
    <mesh ref={ref} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.4, 2.5, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function TrainingEdges({ nodes, visible, pulseIdx }: { nodes: InstitutionNode[]; visible: boolean; pulseIdx: number }) {
  const active = useMemo(() => nodes.filter((n) => n.programmeCount > 0), [nodes]);
  const geom = useMemo(() => {
    const positions = new Float32Array(active.length * 2 * 3);
    active.forEach((n, i) => {
      const p = nodePosition(n.state, n.id.length + n.id.charCodeAt(0));
      const hub = new THREE.Vector3(0, 0.5, 0);
      positions.set([hub.x, hub.y, hub.z], i * 6);
      positions.set([p.x, p.y, p.z], i * 6 + 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [active]);
  if (!visible || !active.length) return null;
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color={JADE} transparent opacity={pulseIdx >= 0 ? 0.4 : 0.16} />
    </lineSegments>
  );
}

interface WorldProps {
  nodes: InstitutionNode[]; layers: LayerState;
  kpis: { completion: number; certification: number; employment: number };
  pulseActive: boolean; pulseStep: number;
  onSelect: (n: InstitutionNode, pos: THREE.Vector3) => void;
  onSelectRegion: (state: string, pos: THREE.Vector3) => void;
  onHoverRegion: (state: string | null) => void;
  level: FocusLevel; focusedRegion: string | null; focusedInstitutionId: string | null;
  programmes: ProgrammeNode[]; selectedProgrammeId: string | null;
  onSelectProgramme: (p: ProgrammeNode, worldPos: THREE.Vector3) => void;
  traineeSignal: TraineeSignal | null;
  skills: SkillNode[]; credential: CredentialInfo | null; employment: EmploymentInfo | null;
  onFocusStage: (stage: 'skill' | 'credential' | 'employment', pos: THREE.Vector3) => void;
  onSelectSkill: (skill: SkillNode, pos: THREE.Vector3) => void;
  focus: THREE.Vector3; focusDistance: number; reduced: boolean;
}

function Scene({
  nodes, layers, kpis, pulseActive, pulseStep, onSelect, onSelectRegion, onHoverRegion,
  level, focusedRegion, focusedInstitutionId, programmes, selectedProgrammeId, onSelectProgramme,
  traineeSignal, skills, credential, employment, onFocusStage, onSelectSkill,
  focus, focusDistance, reduced,
}: WorldProps) {
  const group = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (group.current && !reduced) {
      // A breath, not a spin: an almost-imperceptible drift until the user takes the wheel.
      group.current.rotation.y = Math.sin(st.clock.elapsedTime * 0.05) * 0.035;
    }
  });
  const regions = useMemo(() => {
    const counts = new Map<string, number>();
    nodes.forEach((n) => { if (n.state) counts.set(n.state, (counts.get(n.state) ?? 0) + 1); });
    return [...counts.entries()].map(([state, count]) => ({ state, count }));
  }, [nodes]);

  const focusedInstitution = nodes.find((n) => n.id === focusedInstitutionId) ?? null;
  const focusedInstitutionPos = useMemo(
    () => (focusedInstitution ? nodePosition(focusedInstitution.state, focusedInstitution.id.length + focusedInstitution.id.charCodeAt(0)) : null),
    [focusedInstitution],
  );

  return (
    <>
      <CameraRig focus={focus} focusDistance={focusDistance} />
      <ambientLight intensity={0.8} color="#91B3A5" />
      <directionalLight position={[4, 7, 3]} intensity={1.1} color="#F5F1E8" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-5, 4, -3]} intensity={0.35} color="#3E7C6A" />
      <group ref={group}>
        <Suspense fallback={null}>
          <IndiaModel />
        </Suspense>
        {level === 'national' && regions.map((r) => (
          <RegionMarker key={r.state} state={r.state} count={r.count} focused={false} onSelect={onSelectRegion} onHover={onHoverRegion} />
        ))}
        {layers.institutions && nodes.map((n, i) => (
          <InstitutionMarker
            key={n.id}
            node={n}
            active={pulseActive && pulseStep === i}
            selected={level !== 'national' && level !== 'region' && focusedInstitutionId === n.id}
            dim={(level === 'region' && n.state !== focusedRegion) || (level !== 'national' && level !== 'region' && n.id !== focusedInstitutionId)}
            pulse={pulseActive ? (pulseStep === i ? 1 : pulseStep > i ? 0.35 : 0) : 0.15}
            onSelect={onSelect}
          />
        ))}
        {level !== 'national' && level !== 'region' && level !== 'institution' && focusedInstitutionPos && programmes.map((p, i) => (
          <group key={p.id} position={focusedInstitutionPos}>
            <ProgrammeMarker programme={p} index={i} count={programmes.length} anchor={focusedInstitutionPos} selected={selectedProgrammeId === p.id} onSelect={onSelectProgramme} />
          </group>
        ))}
        {(level === 'trainee' || level === 'skill' || level === 'credential' || level === 'employment') && traineeSignal && focusedInstitutionPos && (() => {
          const idx = programmes.findIndex((p) => p.id === selectedProgrammeId);
          const angle = (Math.max(0, idx) / Math.max(1, programmes.length)) * Math.PI * 2;
          const local = new THREE.Vector3(Math.cos(angle) * 0.3, 0.02, Math.sin(angle) * 0.3);
          const anchor = new THREE.Vector3(focusedInstitutionPos.x + local.x, focusedInstitutionPos.y + local.y, focusedInstitutionPos.z + local.z);
          return (
            <group position={anchor}>
              <TraineeJourney
                signal={traineeSignal} skills={skills} credential={credential} employment={employment}
                stageLevel={level} anchor={anchor} onFocusStage={onFocusStage} onSelectSkill={onSelectSkill}
              />
            </group>
          );
        })()}
        <TrainingEdges nodes={nodes} visible={layers.training} pulseIdx={pulseActive ? pulseStep : -1} />
        {layers.learning && <AggregateSignal radius={2.6} intensity={0.5} color={RAIN} y={0.02} />}
        {layers.credentials && <AggregateSignal radius={2.2} intensity={Math.max(0.15, kpis.certification / 100)} color={MARIGOLD} y={0.04} />}
        {layers.employment && <AggregateSignal radius={3} intensity={Math.max(0.15, kpis.employment / 100)} color={COPPER} y={0.06} />}
      </group>
    </>
  );
}

export default function CommandCenterWorld(props: WorldProps) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ fov: 38, position: [0.6, 16.8, 8.5] }} gl={{ antialias: true, alpha: true }} shadows aria-label="Interactive 3D map of the NCCT national network" style={{ background: 'transparent' }}>
      <Scene {...props} />
    </Canvas>
  );
}
