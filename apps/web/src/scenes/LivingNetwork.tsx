import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * THE NCCT LIVING NETWORK — the site's one recurring 3D metaphor: nodes are
 * institutions/trainees, edges are pathways, and the same object evolves
 * through the six stages of the journey rather than cutting between scenes.
 *
 * `stage` is a continuous 0..5 float (whole = the named stage, fractional =
 * blend into the next one), driven by scroll position in NetworkSection.
 */
export type NetworkStage = 0 | 1 | 2 | 3 | 4 | 5;

interface NodeDatum { pos: THREE.Vector3; kind: 'institution' | 'pathway' | 'learner'; seed: number }

function seededNodes(count: number, seed: number): NodeDatum[] {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const nodes: NodeDatum[] = [];
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - 2 * rnd());
    const theta = 2 * Math.PI * rnd();
    const r = 2.1 + rnd() * 0.6;
    nodes.push({
      pos: new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta) * 0.62, r * Math.cos(phi) * 0.62),
      kind: i % 7 === 0 ? 'institution' : i % 3 === 0 ? 'learner' : 'pathway',
      seed: rnd(),
    });
  }
  return nodes;
}

const PALETTE = { jade: new THREE.Color('#3E7C6A'), copper: new THREE.Color('#A9613B'), marigold: new THREE.Color('#D4A04D'), rain: new THREE.Color('#7897A0'), ink: new THREE.Color('#18201D') };

function Scene({ stageF, reduced }: { stageF: React.MutableRefObject<number>; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(() => seededNodes(120, 42), []);
  const edges = useMemo(() => {
    // A small set of deliberate pathway connections — trainee → institution → credential → employer —
    // not a fully-connected mesh; the network should read as paths, not noise.
    const pairs: [number, number][] = [];
    const institutions = nodes.map((n, i) => (n.kind === 'institution' ? i : -1)).filter((i) => i >= 0);
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].kind !== 'institution' && institutions.length) {
        const target = institutions[i % institutions.length];
        pairs.push([i, target]);
      }
    }
    return pairs;
  }, [nodes]);

  const nodeGeom = useMemo(() => new THREE.SphereGeometry(1, 10, 10), []);
  const credentialGeom = useMemo(() => new THREE.IcosahedronGeometry(0.34, 0), []);
  const instRefs = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lineGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(edges.length * 2 * 3);
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [edges]);
  const credentialRef = useRef<THREE.Mesh>(null);
  const employerRef = useRef<THREE.Mesh>(null);
  const lineMat = useRef<THREE.LineBasicMaterial>(null);

  useFrame((st) => {
    const t = reduced ? 0 : st.clock.elapsedTime;
    const stage = stageF.current; // 0..5 continuous
    if (group.current) {
      group.current.rotation.y = (reduced ? 0 : t * 0.03) + stage * 0.18;
      group.current.rotation.x = -0.08 + Math.sin(stage * 0.6) * 0.05;
    }

    // CONNECT (0→1): nodes fade in from a collapsed core outward.
    const connectT = THREE.MathUtils.clamp(stage / 1, 0, 1);
    // TRAIN (1→2): edges draw in.
    const trainT = THREE.MathUtils.clamp(stage - 1, 0, 1);
    // LEARN (2→3): secondary learner nodes brighten and pulse.
    const learnT = THREE.MathUtils.clamp(stage - 2, 0, 1);
    // DEVELOP (3→4): everything's scale/emissive grows.
    const developT = THREE.MathUtils.clamp(stage - 3, 0, 1);
    // CERTIFY (4→5): one node crystallizes into the credential icosahedron.
    const certifyT = THREE.MathUtils.clamp(stage - 4, 0, 1);
    // CONNECT/EMPLOY (5): an outer employer ring activates.
    const employT = THREE.MathUtils.clamp(stage - 5, 0, 1);

    if (instRefs.current) {
      nodes.forEach((n, i) => {
        const grow = 0.35 + connectT * 0.65 + developT * 0.35;
        const pulse = n.kind === 'learner' ? 1 + Math.sin(t * 2 + n.seed * 10) * 0.12 * learnT : 1;
        dummy.position.copy(n.pos).multiplyScalar(0.55 + connectT * 0.45);
        dummy.scale.setScalar((n.kind === 'institution' ? 0.09 : 0.045) * grow * pulse);
        dummy.updateMatrix();
        instRefs.current!.setMatrixAt(i, dummy.matrix);
      });
      instRefs.current.instanceMatrix.needsUpdate = true;
    }

    const pos = lineGeom.getAttribute('position') as THREE.BufferAttribute;
    edges.forEach(([a, b], i) => {
      const pa = nodes[a].pos.clone().multiplyScalar(0.55 + connectT * 0.45);
      const pb = nodes[b].pos.clone().multiplyScalar(0.55 + connectT * 0.45);
      const reveal = THREE.MathUtils.clamp(trainT * edges.length - i * 0.4, 0, 1);
      const mid = pa.clone().lerp(pb, reveal);
      pos.setXYZ(i * 2, pa.x, pa.y, pa.z);
      pos.setXYZ(i * 2 + 1, mid.x, mid.y, mid.z);
    });
    pos.needsUpdate = true;
    if (lineMat.current) lineMat.current.opacity = 0.16 + trainT * 0.3;

    if (credentialRef.current) {
      const s = certifyT;
      credentialRef.current.scale.setScalar(0.001 + s * 1);
      credentialRef.current.rotation.y = t * 0.6;
      credentialRef.current.rotation.x = t * 0.3;
      (credentialRef.current.material as THREE.MeshBasicMaterial).opacity = s;
    }
    if (employerRef.current) {
      const s = employT;
      employerRef.current.scale.setScalar(0.4 + s * 0.9);
      (employerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + s * 0.7;
    }
  });

  return (
    <group ref={group}>
      <instancedMesh ref={instRefs} args={[nodeGeom, undefined, nodes.length]}>
        <meshBasicMaterial color={PALETTE.copper} transparent opacity={0.85} />
      </instancedMesh>
      <lineSegments geometry={lineGeom}>
        <lineBasicMaterial ref={lineMat} color={PALETTE.jade} transparent opacity={0.2} />
      </lineSegments>
      <mesh ref={credentialRef} position={[0, 0.1, 0.3]}>
        <primitive object={credentialGeom} attach="geometry" />
        <meshBasicMaterial color={PALETTE.marigold} wireframe transparent opacity={0} />
      </mesh>
      <mesh ref={employerRef} position={[3.3, -0.3, 0.4]}>
        <ringGeometry args={[0.42, 0.5, 40]} />
        <meshBasicMaterial color={PALETTE.rain} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Renders the living network at a given continuous stage (0..5); `bg` lets it sit on Porcelain. */
export default function LivingNetwork({ stageRef, reduced, bg }: { stageRef: React.MutableRefObject<number>; reduced: boolean; bg?: string }) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ fov: 38, position: [0, 0, 7.2] }} gl={{ antialias: true, alpha: bg === undefined }} aria-hidden>
      {bg && <color attach="background" args={[bg]} />}
      <Scene stageF={stageRef} reduced={reduced} />
    </Canvas>
  );
}
