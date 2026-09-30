import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useReducedMotion } from 'framer-motion';

export type QrPhase = 'generating' | 'verified' | 'invalidating';
const SIZE = 196, PAD = 14;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * The token, drawn as a living object: modules assemble outward from the centre (GENERATING),
 * hold steady while valid (VERIFIED), then dissolve as the code expires (INVALIDATING).
 */
export function QrFormation({ token, dissolve, onPhase }: { token: string; dissolve: boolean; onPhase?: (p: QrPhase) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<QrPhase>('generating');
  const state = useRef({ p: 0, dissolve });
  state.current.dissolve = dissolve;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = SIZE * dpr; canvas.height = SIZE * dpr;
    const qr = QRCode.create(token, { errorCorrectionLevel: 'L' });
    const n = qr.modules.size, data = qr.modules.data;
    const cell = (SIZE - PAD * 2) / n;
    // Each module gets an activation threshold: near the centre first, with a little noise.
    const th = new Float32Array(n * n);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) th[y * n + x] = Math.min(0.85, (Math.hypot(x - n / 2, y - n / 2) / (n * 0.72)) * 0.7 + rnd() * 0.3);

    state.current.p = reduce ? 1 : 0;
    let last = performance.now(), raf = 0, shown: QrPhase = 'generating';
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const s = state.current;
      if (reduce) s.p = s.dissolve ? 0.999 : 1;
      else if (s.dissolve) s.p = Math.max(0, s.p - dt / 1.15);
      else s.p = Math.min(1, s.p + dt / 0.95);
      const next: QrPhase = s.dissolve ? 'invalidating' : s.p < 1 ? 'generating' : 'verified';
      if (next !== shown) { shown = next; setPhase(next); onPhase?.(next); }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = '#ece8df'; ctx.beginPath(); ctx.roundRect(0, 0, SIZE, SIZE, 10); ctx.fill();
      const p = easeOut(s.p);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        if (!data[y * n + x]) continue;
        const k = (p - th[y * n + x]) / 0.18;
        if (k <= 0) continue;
        const a = Math.min(1, k);
        const inset = (1 - a) * cell * 0.5;
        // Freshly placed modules glow teal, then settle to ink.
        const hot = Math.max(0, 1 - k / 1.6);
        ctx.fillStyle = hot > 0.02 ? `rgb(${Math.round(11 + hot * 20)},${Math.round(13 + hot * 150)},${Math.round(16 + hot * 130)})` : '#0b0d10';
        ctx.fillRect(PAD + x * cell + inset, PAD + y * cell + inset, Math.max(0.5, cell - inset * 2 + 0.4), Math.max(0.5, cell - inset * 2 + 0.4));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, reduce]);

  return (
    <div className={`qr-formation qr-${phase}`}>
      <canvas ref={ref} style={{ width: SIZE, height: SIZE }} role="img" aria-label="Attendance QR code. Trainees scan this to check in." />
      {phase === 'verified' && <span className="qr-scanline" aria-hidden />}
      <span className={`qr-state ${phase}`} role="status">{phase.toUpperCase()}</span>
    </div>
  );
}
