import { motion, useReducedMotion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { EASE } from '../motion/primitives';
import { LIFECYCLE, moduleForStage, stagesOf, type LifecycleStage, type ModuleId } from '../shell/modules';
import type { UiRole } from '../types';

/* ------------------------------------------------------------------ master bar */
/**
 * The product's spine, present on every screen: REACH → REGISTER → … → IMPROVE.
 * The active stage(s) light up; each stage is a real link to the module that serves it.
 */
export function MasterLifecycle({ role, current, onNavigate }: { role: UiRole; current: ModuleId; onNavigate: (id: ModuleId) => void }) {
  const active = new Set(stagesOf(current));
  const first = LIFECYCLE.findIndex((s) => active.has(s.id));
  return (
    <nav className="lifebar" aria-label="Product lifecycle">
      <ol>
        {LIFECYCLE.map((s, i) => {
          const target = moduleForStage(role, s.id);
          const isActive = active.has(s.id);
          const passed = first >= 0 && i < first;
          return (
            <li key={s.id} className={`lifebar-step${isActive ? ' is-active' : ''}${passed ? ' is-passed' : ''}${target ? '' : ' is-locked'}`}>
              <button disabled={!target} onClick={() => target && onNavigate(target.id)} aria-current={isActive ? 'step' : undefined}
                title={target ? `${s.label}: ${s.blurb}` : `${s.label}: not part of your role`}>
                {isActive && <motion.span layoutId="lifebar-pill" className="lifebar-pill" transition={{ type: 'spring', stiffness: 460, damping: 38 }} />}
                <span className="lifebar-dot" aria-hidden />
                <span className="lifebar-name">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------- programme lifecycle */
export const PROGRAMME_STAGES = ['DISCOVER', 'NOMINATE', 'APPROVE', 'ENROLL', 'TRAIN', 'ASSESS', 'CERTIFY'] as const;
export type ProgrammeStage = (typeof PROGRAMME_STAGES)[number];

export interface StageState {
  count?: number | null;
  /** 'live' has backing data; 'unavailable' is shown but explicitly not wired to the API. */
  state?: 'live' | 'unavailable';
  hint?: string;
}

/**
 * DISCOVER → NOMINATE → APPROVE → ENROLL → TRAIN → ASSESS → CERTIFY.
 * A reusable pattern: pass real counts per stage; a pulse travels the line to show flow.
 */
export function ProgrammeLifecycle({ stages, current, compact = false }: { stages: Partial<Record<ProgrammeStage, StageState>>; current?: ProgrammeStage; compact?: boolean }) {
  const reduce = useReducedMotion();
  const idx = current ? PROGRAMME_STAGES.indexOf(current) : -1;
  return (
    <ol className={`plife${compact ? ' plife-compact' : ''}`} aria-label="Programme lifecycle">
      {PROGRAMME_STAGES.map((s, i) => {
        const st = stages[s] ?? {};
        const done = idx > i;
        const active = idx === i;
        return (
          <li key={s} className={`plife-step${done ? ' is-done' : ''}${active ? ' is-active' : ''}${st.state === 'unavailable' ? ' is-off' : ''}`}>
            <span className="plife-node" aria-hidden>
              {st.state === 'unavailable' ? <Lock size={11} /> : done ? <Check size={12} /> : <i />}
            </span>
            <span className="plife-name">{s}</span>
            {typeof st.count === 'number' && <span className="plife-count num">{st.count}</span>}
            {st.hint && !compact && <span className="plife-hint">{st.hint}</span>}
            {i < PROGRAMME_STAGES.length - 1 && (
              <span className="plife-link" aria-hidden>
                {!reduce && <motion.b initial={{ x: '-20%', opacity: 0 }} animate={{ x: '120%', opacity: [0, 1, 1, 0] }} transition={{ duration: 2.4, ease: EASE, repeat: Infinity, delay: i * 0.35, repeatDelay: 1.2 }} />}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export type { LifecycleStage };

/* ------------------------------------------------------------------- journey */
export interface JourneyStep { name: string; state: 'live' | 'unavailable'; count?: number; hint?: string }

/** A short labelled journey (e.g. LEARN → PRACTICE → ASSESS → PASS → CERTIFY) where unavailable steps are marked as such. */
export function JourneyStrip({ steps }: { steps: JourneyStep[] }) {
  const reduce = useReducedMotion();
  return (
    <ol className="plife" aria-label="Journey">
      {steps.map((s, i) => (
        <li key={s.name} className={`plife-step${s.state === 'unavailable' ? ' is-off' : ' is-done'}`}>
          <span className="plife-node" aria-hidden>{s.state === 'unavailable' ? <Lock size={11} /> : <Check size={12} />}</span>
          <span className="plife-name">{s.name}</span>
          {typeof s.count === 'number' && <span className="plife-count num">{s.count}</span>}
          {s.hint && <span className="plife-hint">{s.hint}</span>}
          {i < steps.length - 1 && (
            <span className="plife-link" aria-hidden>
              {!reduce && s.state === 'live' && steps[i + 1].state === 'live' && <motion.b initial={{ x: '-20%', opacity: 0 }} animate={{ x: '120%', opacity: [0, 1, 1, 0] }} transition={{ duration: 2.4, ease: EASE, repeat: Infinity, delay: i * 0.35, repeatDelay: 1.2 }} />}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
