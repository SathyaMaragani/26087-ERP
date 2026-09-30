import { INTRO_LENGTH, sceneStore } from '../scene/sceneStore';
import { clamp01, easeInOutCubic, smoothstep } from '../scene/springs';

/**
 * Everything the atlas needs to know about "where the story is", computed once per frame from
 * the opening clock (T) and the scroll position (f, 0..6). Children only read from it.
 */
export interface AtlasState {
  T: number; f: number;
  rad: number;          // radius of the revealed region, in world units
  sweepA: number; sweepB: number; lineFade: number;
  pin: number;          // 0..1 the first point
  instC: number; progC: number; learnC: number; arcC: number; // per-layer clocks (seconds since that layer began)
  arcs: number;         // hierarchy signals 0..1
  employ: number;       // employment paths 0..1
  cred: number;         // credential focus 0..1
  contrast: number;     // outcome view: contours emphasised
  focusW: number;       // 0..1 weight of the "learn" stage (learners concentrate)
  fade: number;
}

export const newState = (): AtlasState => ({ T: 0, f: 0, rad: 0, sweepA: -14, sweepB: 12, lineFade: 1, pin: 0, instC: 0, progC: 0, learnC: 0, arcC: 0, arcs: 0, employ: 0, cred: 0, contrast: 0, focusW: 0, fade: 1 });

const w = (f: number, s: number) => smoothstep(clamp01(1 - Math.abs(f - s)));

export function computeState(out: AtlasState, T: number, reduced: boolean, hq: [number, number]) {
  const f = Math.min(6, Math.max(0, sceneStore.target * 6));
  out.T = T; out.f = f; out.fade = sceneStore.fade;
  const done = reduced || T >= INTRO_LENGTH + 0.2;
  if (done) {
    Object.assign(out, { rad: 60, sweepA: hq[0], sweepB: hq[1], lineFade: 0, pin: 1, instC: 99, progC: 99, learnC: 99, arcC: 99, arcs: 1 });
  } else {
    // 0–0.9 black · 0.9–2.6 signal A · 2.6–4.0 signal B · 3.9–7.2 the atlas propagates · 4.4+ layers arrive
    out.sweepA = -14 + (hq[0] + 14) * easeInOutCubic(clamp01((T - 0.9) / 1.7));
    out.sweepB = 12 + (hq[1] - 12) * easeInOutCubic(clamp01((T - 2.6) / 1.4));
    out.pin = smoothstep(clamp01((T - 2.5) / 0.5));
    out.lineFade = T < 5.2 ? 1 : 1 - smoothstep(clamp01((T - 5.2) / 1.2));
    out.rad = 0.02 + 26 * easeInOutCubic(clamp01((T - 3.9) / 3.3));
    out.instC = Math.max(0, T - 4.4); out.progC = Math.max(0, T - 5.1); out.learnC = Math.max(0, T - 5.8); out.arcC = Math.max(0, T - 5.6);
    out.arcs = smoothstep(clamp01((T - 5.6) / 1.8));
  }
  out.employ = smoothstep(clamp01((f - 3.2) / 1.0)) * (1 - 0.6 * smoothstep(clamp01((f - 5.2) / 0.8)));
  out.cred = w(f, 3);
  out.contrast = w(f, 5);
  out.focusW = w(f, 2);
  if (!done) out.employ = 0;
}
