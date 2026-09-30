import { useEffect, useState } from 'react';

export function detectWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface DeviceTier {
  mobile: boolean;
  /** Low-power hint: few cores or small memory. */
  low: boolean;
  reduced: boolean;
  webgl: boolean;
}

function read(): DeviceTier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mobile = window.matchMedia('(max-width: 820px)').matches || window.matchMedia('(pointer: coarse)').matches;
  const low = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
  return { mobile, low, reduced: prefersReducedMotion(), webgl: detectWebGL() };
}

let cached: DeviceTier | null = null;

/** Tier is computed once (particle counts must not change mid-session). Reduced-motion stays live. */
export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>(() => (cached ??= read()));
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setTier((t) => ({ ...t, reduced: mq.matches }));
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return tier;
}
