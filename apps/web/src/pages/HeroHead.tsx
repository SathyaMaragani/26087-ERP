import { useEffect, useRef } from 'react';
import { mulberry32 } from '../3d/geo';

const BUCKETS = 10;

/**
 * The opening image: a human presence built from ~30,000 points of light in a field of stars.
 * Every point has a home on the figure and a velocity. The pointer pushes points aside like a hand through
 * water, a click sends a shockwave through the figure, and the whole field leans toward the cursor in depth.
 * Purely visual — it carries no data.
 */
export function HeroHead({ reduced, overlay = false }: { reduced: boolean; overlay?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    let W = 0, H = 0, dpr = 1, raf = 0, alive = true, U = 1;
    let bg: HTMLCanvasElement | null = null, glow: HTMLCanvasElement | null = null;
    // particle state (structure of arrays)
    let n = 0, hx = new Float32Array(0), hy = new Float32Array(0), x = new Float32Array(0), y = new Float32Array(0);
    let vx = new Float32Array(0), vy = new Float32Array(0), depth = new Float32Array(0), bucket = new Uint8Array(0), big = new Uint8Array(0);
    let stars: Array<{ x: number; y: number; r: number; p: number; s: number }> = [];
    const ptr = { x: -9999, y: -9999, nx: 0, ny: 0, sx: 0, sy: 0, active: false, energy: 0 };
    const waves: Array<{ x: number; y: number; t: number }> = [];

    const build = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const rnd = mulberry32(7);
      U = W < 700 ? Math.min(H * 0.7, W * 1.1) : Math.min(H, W * 0.62);
      const cx = W * 0.5, cy = H * (W < 700 ? 0.5 : 0.46);
      const a = U * 0.255, b = U * 0.335, e = 2.25;

      // background layer: ink, ultramarine bloom from below, a cool light behind the head, static stars
      const B = document.createElement('canvas'); B.width = cv.width; B.height = cv.height;
      const g = B.getContext('2d')!; g.scale(dpr, dpr);
      if (!overlay) { g.fillStyle = '#03050b'; g.fillRect(0, 0, W, H); }
      const bloom = g.createRadialGradient(cx, H * 1.02, 0, cx, H * 1.02, Math.max(W, H) * 0.62);
      bloom.addColorStop(0, 'rgba(38,58,190,0.55)'); bloom.addColorStop(0.45, 'rgba(22,34,120,0.22)'); bloom.addColorStop(1, 'rgba(3,5,11,0)');
      if (!overlay) { g.fillStyle = bloom; g.fillRect(0, 0, W, H); }
      const back = g.createRadialGradient(cx, cy, 0, cx, cy, U * 0.7);
      back.addColorStop(0, 'rgba(20,40,110,0.28)'); back.addColorStop(1, 'rgba(3,5,11,0)');
      if (!overlay) { g.fillStyle = back; g.fillRect(0, 0, W, H); }
      const count = overlay ? 0 : Math.round((W * H) / 1800);
      for (let i = 0; i < count; i++) { const r = 0.35 + Math.pow(rnd(), 4) * 1.3; g.fillStyle = `rgba(214,226,255,${0.15 + rnd() * 0.65})`; g.fillRect(rnd() * W, rnd() * H, r, r); }
      bg = B;
      stars = Array.from({ length: 110 }, () => ({ x: rnd() * W, y: rnd() * H, r: 0.6 + rnd() * 1.1, p: rnd() * 6.28, s: 0.6 + rnd() * 1.8 }));

      // figure outline: head (superellipse), neck, shoulders — each point with an inward normal
      type P = { x: number; y: number; nx: number; ny: number; neck?: boolean };
      const outline: P[] = [];
      for (let i = 0; i < 620; i++) {
        const t = (i / 620) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
        const qx = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
        const qy = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / e) * (s > 0 ? 1.04 : 1);
        if (qy > b * 0.72 && Math.abs(qx) < a * 0.42) continue;
        const l = Math.hypot(qx / (a * a), qy / (b * b)) || 1;
        outline.push({ x: cx + qx, y: cy + qy, nx: -(qx / (a * a)) / l, ny: -(qy / (b * b)) / l });
      }
      const chinY = cy + b * 0.72, bodyTop = cy + b * 0.98;
      const halfW = (yy: number) => { const s = Math.max(0, (yy - bodyTop) / (H * 1.08 - bodyTop)); return U * 0.115 + U * 0.36 * Math.pow(s, 1.7); };
      for (const side of [-1, 1]) for (let yy = chinY - U * 0.02; yy < H * 1.08; yy += 4) outline.push({ x: cx + side * (yy < bodyTop ? U * 0.115 : halfW(yy)), y: yy, nx: -side, ny: 0, neck: true });

      const px: number[] = [], py: number[] = [], pd: number[] = [], pb: number[] = [], pg: number[] = [];
      const add = (X: number, Y: number, alpha: number, d: number, sz: number) => { px.push(X); py.push(Y); pd.push(d); pb.push(Math.max(0, Math.min(BUCKETS - 1, Math.floor(alpha * BUCKETS)))); pg.push(sz); };
      for (const p of outline) {
        const K = p.neck ? 5 : 11;
        for (let k = 0; k < K; k++) { const d = Math.pow(k, 1.45) * U * 0.0021 + rnd() * U * 0.0012; add(p.x + p.nx * d, p.y + p.ny * d, Math.pow(1 - k / K, 1.6), 0.6 + k * 0.03, k < 5 ? 1 : 0); }
        if (rnd() < 0.55) { const d = -Math.pow(rnd(), 2.2) * U * 0.085; add(p.x + p.nx * d, p.y + p.ny * d, 0.15 + rnd() * 0.5, 1.2, 0); }
      }
      const y0 = bodyTop - U * 0.05, y1 = H * 1.05;
      for (let i = 0; i < 26000; i++) {
        const yy = y0 + Math.pow(rnd(), 0.8) * (y1 - y0), hw = yy < bodyTop ? U * 0.115 : halfW(yy), xx = (rnd() * 2 - 1) * hw, edge = 1 - Math.abs(xx) / hw;
        const dens = Math.exp(-edge * 9) + 0.06 + 0.12 * Math.max(0, 1 - (yy - y0) / (U * 0.3));
        if (rnd() > dens) continue;
        add(cx + xx, yy, Math.min(1, 0.2 + dens * 0.8) * (0.4 + rnd() * 0.6), 0.5 + edge * 0.5, 0);
      }
      for (let ring = 1; ring < 15; ring++) {
        const k = ring / 15, cnt = Math.round(40 + ring * 8);
        for (let j = 0; j < cnt; j++) { const t = (j / cnt) * Math.PI * 2 + ring; add(cx + Math.cos(t) * a * 0.9 * k, cy - b * 0.05 + Math.sin(t) * b * 0.85 * k, 0.15 + (1 - k) * 0.25, 0.3, 0); }
      }
      n = px.length;
      hx = Float32Array.from(px); hy = Float32Array.from(py); x = Float32Array.from(px); y = Float32Array.from(py);
      vx = new Float32Array(n); vy = new Float32Array(n); depth = Float32Array.from(pd); bucket = Uint8Array.from(pb); big = Uint8Array.from(pg);

      // a soft bloom of the resting figure, drawn once
      const G = document.createElement('canvas'); G.width = Math.round(W / 2); G.height = Math.round(H / 2);
      const gg = G.getContext('2d')!; gg.scale(0.5, 0.5);
      for (let i = 0; i < n; i++) { if (bucket[i] < 4) continue; gg.fillStyle = `rgba(150,205,255,${(bucket[i] / BUCKETS) * 0.7})`; gg.fillRect(hx[i] - 1, hy[i] - 1, 3, 3); }
      const G2 = document.createElement('canvas'); G2.width = cv.width; G2.height = cv.height;
      const g2 = G2.getContext('2d')!; g2.filter = `blur(${Math.max(8, U * 0.018) * dpr}px)`; g2.drawImage(G, 0, 0, cv.width, cv.height);
      glow = G2;
    };

    let visible = true;
    let last = performance.now();
    const paths: Path2D[] = [];
    const frame = (now: number) => {
      if (!alive || !bg) return;
      const dt = Math.min(0.033, (now - last) / 1000) * 60; last = now;
      ptr.sx += (ptr.nx - ptr.sx) * 0.05; ptr.sy += (ptr.ny - ptr.sy) * 0.05;
      ptr.energy *= 0.94;
      const R = U * 0.16, R2 = R * R;
      const damp = Math.pow(0.86, dt), spring = 0.055 * dt;
      for (let w = waves.length - 1; w >= 0; w--) { waves[w].t += dt; if (waves[w].t > 70) waves.splice(w, 1); }
      const lx = ptr.sx * U * 0.035, ly = ptr.sy * U * 0.02; // the figure leans toward the cursor
      for (let i = 0; i < n; i++) {
        let fx = 0, fy = 0;
        if (ptr.active) {
          const dx = x[i] - ptr.x, dy = y[i] - ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) { const d = Math.sqrt(d2), f = Math.pow(1 - d / R, 2) * (1.6 + ptr.energy * 4); fx += (dx / d) * f; fy += (dy / d) * f; }
        }
        for (let w = 0; w < waves.length; w++) {
          const wv = waves[w], dx = x[i] - wv.x, dy = y[i] - wv.y, d = Math.hypot(dx, dy) || 1, rad = wv.t * U * 0.016, dist = Math.abs(d - rad);
          if (dist < U * 0.05) { const f = (1 - dist / (U * 0.05)) * (1 - wv.t / 70) * 5; fx += (dx / d) * f; fy += (dy / d) * f; }
        }
        vx[i] = (vx[i] + fx + (hx[i] + lx * depth[i] - x[i]) * spring) * damp;
        vy[i] = (vy[i] + fy + (hy[i] + ly * depth[i] - y[i]) * spring) * damp;
        x[i] += vx[i] * dt; y[i] += vy[i] * dt;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      if (overlay) ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(bg, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      if (glow) { ctx.globalAlpha = 0.9; ctx.drawImage(glow, 0, 0); ctx.globalAlpha = 1; }
      ctx.scale(dpr, dpr);
      if (ptr.active) {
        const gr = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, R * 1.7);
        gr.addColorStop(0, 'rgba(120,190,255,0.16)'); gr.addColorStop(1, 'rgba(120,190,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(ptr.x - R * 2, ptr.y - R * 2, R * 4, R * 4);
      }
      for (let k = 0; k < BUCKETS * 2; k++) paths[k] = new Path2D();
      for (let i = 0; i < n; i++) {
        const s = (big[i] ? 1.7 : 1.05) + Math.min(1.5, (Math.abs(vx[i]) + Math.abs(vy[i])) * 0.25);
        paths[bucket[i] * 2 + big[i]].rect(x[i], y[i], s, s);
      }
      for (let k = 0; k < BUCKETS * 2; k++) { ctx.fillStyle = `rgba(${185 + (k >> 1) * 5},222,255,${Math.min(1, ((k >> 1) + 0.6) / BUCKETS)})`; ctx.fill(paths[k]); }
      ctx.globalCompositeOperation = 'source-over';
      if (!reduced) for (const s of stars) { ctx.fillStyle = `rgba(225,236,255,${0.25 + 0.75 * Math.abs(Math.sin(now * 0.001 * s.s + s.p))})`; ctx.fillRect(s.x - ptr.sx * s.r * 4, s.y - ptr.sy * s.r * 4, s.r, s.r); }
      raf = visible ? requestAnimationFrame(frame) : 0;
    };

    const start = () => { build(); cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); };
    start();
    const ro = new ResizeObserver(() => start()); ro.observe(cv);
    // the hero stops simulating once it has scrolled away
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }); io.observe(cv);

    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.active = true;
      ptr.nx = (ptr.x / W) * 2 - 1; ptr.ny = (ptr.y / H) * 2 - 1; ptr.energy = Math.min(1, ptr.energy + 0.25);
    };
    const onLeave = () => { ptr.active = false; ptr.nx = 0; ptr.ny = 0; };
    const onDown = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); waves.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: 0 }); };
    cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerleave', onLeave);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointerleave', onLeave); };
  }, [reduced, overlay]);

  return <canvas ref={ref} className="hero-head" aria-hidden />;
}
