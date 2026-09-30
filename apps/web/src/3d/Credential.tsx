import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import QRCode from 'qrcode';
import { smoothstep } from '../scene/springs';
import { sceneStore } from '../scene/sceneStore';
import type { AtlasState } from './state';

/** Specimen credential, drawn with the atlas's own language: contour lines, ink, porcelain, ultramarine. */
function draw(): HTMLCanvasElement {
  const W = 1536, H = 1024;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b1120'; g.fillRect(0, 0, W, H);
  // contour field
  g.lineWidth = 1.2;
  for (let k = 0; k < 26; k++) {
    g.strokeStyle = `rgba(138,152,255,${k % 5 === 0 ? 0.34 : 0.14})`;
    g.beginPath();
    for (let i = 0; i <= 160; i++) {
      const th = (i / 160) * Math.PI * 2;
      const rr = 40 + k * 26 + 22 * Math.sin(th * 3 + k * 0.5) + 14 * Math.sin(th * 7 - k);
      const x = W * 0.78 + Math.cos(th) * rr * 1.25, y = H * 0.32 + Math.sin(th) * rr * 0.8;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.strokeStyle = 'rgba(240,237,230,0.7)'; g.lineWidth = 2; g.strokeRect(40, 40, W - 80, H - 80);
  const font = (w: number, px: number, f = 'Geist, sans-serif') => { g.font = `${w} ${px}px ${f}`; };
  const track = (v: string) => { (g as unknown as { letterSpacing: string }).letterSpacing = v; };
  g.textAlign = 'left';
  g.fillStyle = '#8d95a6'; font(500, 22); track('6px'); g.fillText('NATIONAL COUNCIL FOR COOPERATIVE TRAINING', 100, 128); track('0px');
  g.fillStyle = '#f0ede6'; font(600, 132, '"Bricolage Grotesque", Geist, sans-serif'); track('-4px'); g.fillText('Certificate', 100, 300); g.fillText('of completion', 100, 424); track('0px');
  g.fillStyle = '#8a98ff'; font(500, 58, '"Bricolage Grotesque", Geist, sans-serif'); g.fillText('Trainee Name', 100, 540);
  g.fillStyle = '#b7bcc6'; font(400, 32); g.fillText('Digital Cooperative Management', 100, 600);
  // real QR (points at the public verifier)
  const qr = QRCode.create(`${location.origin}${location.pathname}#/verify`, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size, cs = 7, qx = W - 100 - n * cs - 20, qy = H - 100 - n * cs - 20;
  g.fillStyle = '#f0ede6'; g.fillRect(qx - 14, qy - 14, n * cs + 28, n * cs + 28);
  g.fillStyle = '#0b1120';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.data[y * n + x]) g.fillRect(qx + x * cs, qy + y * cs, cs, cs);
  g.fillStyle = '#8d95a6'; font(500, 18); track('4px');
  g.fillText('CREDENTIAL ID', 100, 800); g.fillText('VERIFY', 100, 880); track('0px');
  g.fillStyle = '#f0ede6'; font(500, 34, 'Geist Mono, monospace'); g.fillText('NCCT-YYYY-XXXXX', 100, 842);
  g.fillStyle = '#6fd3db'; font(400, 24, 'Geist Mono, monospace'); g.fillText('public registry · anyone can check', 100, 918);
  g.fillStyle = 'rgba(141,149,166,0.9)'; font(500, 15); track('4px'); g.textAlign = 'right'; g.fillText('ILLUSTRATIVE SPECIMEN · NOT A REAL CREDENTIAL', W - 100, H - 62);
  return c;
}

export function Credential({ state }: { state: { current: AtlasState } }) {
  const ref = useRef<THREE.Mesh>(null);
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    let dead = false;
    (async () => {
      try { await document.fonts.ready; } catch { /* fonts API unavailable */ }
      if (dead) return;
      const t = new THREE.CanvasTexture(draw()); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; setTex(t);
    })();
    return () => { dead = true; };
  }, []);
  useEffect(() => () => tex?.dispose(), [tex]);

  useFrame((st) => {
    const m = ref.current; if (!m) return;
    const w = smoothstep(Math.min(1, Math.max(0, state.current.cred * 1.4 - 0.2)));
    m.visible = w > 0.01 && sceneStore.showCertificate;
    (m.material as THREE.MeshBasicMaterial).opacity = w * state.current.fade;
    m.position.set(0, 1.35 + Math.sin(st.clock.elapsedTime * 0.5) * 0.02 + (1 - w) * -0.4, 0.2);
    m.rotation.set(0, (1 - w) * 0.6 + Math.sin(st.clock.elapsedTime * 0.3) * 0.03, 0);
    const s = 0.9 + 0.1 * w; m.scale.set(s, s, 1);
  });
  if (!tex) return null;
  return (
    <mesh ref={ref} visible={false}>
      <planeGeometry args={[3.3, 2.2]} />
      <meshBasicMaterial map={tex} transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}
