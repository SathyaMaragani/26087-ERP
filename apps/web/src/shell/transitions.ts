import type { Variants } from 'framer-motion';
import { EASE } from '../motion/primitives';
import type { ModuleId } from './modules';

export type TransitionKind = 'transfer' | 'expand' | 'collapse' | 'focus';
export interface TransitionCtx { kind: TransitionKind; dir: 1 | -1 }

const FOCUS_TARGETS: ModuleId[] = ['attendance', 'certificates', 'ecosystem', 'skills', 'career'];

/**
 * One choreography engine for every route. The context (where you came from, where you're going)
 * picks the family, so moving down the rail feels different from returning to the overview.
 */
export function transitionFor(from: ModuleId | null, to: ModuleId, order: ModuleId[]): TransitionCtx {
  const dir: 1 | -1 = order.indexOf(to) >= order.indexOf(from ?? to) ? 1 : -1;
  if (to === 'home') return { kind: 'collapse', dir };
  if (from === 'home' || from === null) return { kind: 'expand', dir };
  if (FOCUS_TARGETS.includes(to)) return { kind: 'focus', dir };
  return { kind: 'transfer', dir };
}

export const pageVariants: Variants = {
  // Spatial: pages slide along the rail axis, or zoom in/out of the overview. No blur — fast and decisive.
  initial: ({ kind, dir }: TransitionCtx) => {
    switch (kind) {
      case 'expand': return { opacity: 0, scale: 0.97, y: 8 };
      case 'collapse': return { opacity: 0, scale: 1.02 };
      case 'focus': return { opacity: 0, x: 24 * dir };
      default: return { opacity: 0, y: 16 * dir };
    }
  },
  animate: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.32, ease: EASE } },
  exit: ({ dir }: TransitionCtx) => ({ opacity: 0, y: -10 * dir, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } }),
};
