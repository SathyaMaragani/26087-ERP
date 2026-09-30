import { motion, useReducedMotion } from 'framer-motion';
import { Award, Building2, GraduationCap, Landmark, Network, Sprout, Users } from 'lucide-react';
import { EASE } from '../motion/primitives';
import { CountUp } from './Metric';

export interface LadderStep { id: string; name: string; count?: number; suffix?: string; sub?: string }
const ICONS: Record<string, typeof Users> = { ncct: Landmark, vamnicom: Building2, ricm: Network, icm: Building2, programmes: GraduationCap, trainees: Users, outcomes: Award };

/** NCCT → VAMNICOM → RICMs → ICMs → PROGRAMMES → TRAINEES → OUTCOMES, each with the live number behind it. */
export function HierarchyLadder({ steps }: { steps: LadderStep[] }) {
  const reduce = useReducedMotion();
  return (
    <ol className="ladder" aria-label="National hierarchy">
      {steps.map((s, i) => {
        const Icon = ICONS[s.id] ?? Sprout;
        return (
          <li key={s.id} className={s.count === undefined || s.count === 0 ? 'is-off' : ''}>
            <span className="ladder-node"><Icon size={19} aria-hidden /></span>
            <span className="ladder-count num">{s.count === undefined ? '—' : <CountUp value={s.count} suffix={s.suffix} />}</span>
            <span className="ladder-name">{s.name}</span>
            {s.sub && <span className="ladder-sub">{s.sub}</span>}
            {i < steps.length - 1 && (
              <span className="ladder-link" aria-hidden>
                {!reduce && <motion.b initial={{ x: '-30%' }} animate={{ x: '130%' }} transition={{ duration: 2.2, ease: EASE, repeat: Infinity, delay: i * 0.28, repeatDelay: 1.6 }} />}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
