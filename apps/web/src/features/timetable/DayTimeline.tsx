import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE } from '../../motion/primitives';
import { CONFLICT_LABEL, type ConflictKind } from '../../lib/conflicts';

export type LaneBy = 'room' | 'trainer' | 'batch';
interface Block { id: string; lane: string; laneSub?: string; start: string; end: string; title: string; sub?: string; draft?: boolean; conflicts?: ConflictKind[] }

const START = 7, END = 20;
const min = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };

/** Sessions on a time axis, one lane per room / trainer / batch. Conflicts glow; a draft block previews a proposal. */
export function DayTimeline({ blocks, lanes }: { blocks: Block[]; lanes?: string[] }) {
  const reduce = useReducedMotion();
  const hours = END - START;
  const laneNames = useMemo(() => Array.from(new Set([...(lanes ?? []), ...blocks.map((b) => b.lane)])), [blocks, lanes]);
  const pos = (t: string) => Math.max(0, Math.min(100, ((min(t) - START * 60) / (hours * 60)) * 100));
  return (
    <div className="dayline"><div className="dayline-scroll"><div className="dayline-grid" style={{ ['--hours' as string]: hours }}>
      <div className="dayline-axis"><div /><div className="dayline-hours" aria-hidden>{Array.from({ length: hours + 1 }, (_, i) => <span key={i} style={{ left: `${(i / hours) * 100}%` }}>{String(START + i).padStart(2, '0')}:00</span>)}</div></div>
      {laneNames.length === 0 && <div className="dayline-lane"><div className="dayline-label">No sessions</div><div className="dayline-track" /></div>}
      {laneNames.map((lane) => {
        const inLane = blocks.filter((b) => b.lane === lane);
        return (
          <div key={lane} className="dayline-lane">
            <div className="dayline-label">{lane}{inLane[0]?.laneSub && <small>{inLane[0].laneSub}</small>}</div>
            <div className="dayline-track">
              {inLane.map((b, i) => (
                <motion.div key={b.id} className={`dayline-block${b.draft ? ' is-draft' : ''}${b.conflicts?.length ? ' is-conflict' : ''}`}
                  style={{ left: `${pos(b.start)}%`, width: `${Math.max(2, pos(b.end) - pos(b.start))}%` }}
                  initial={reduce ? false : { opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 0.5, ease: EASE, delay: i * 0.05 }}
                  title={`${b.title} · ${b.start}–${b.end}${b.conflicts?.length ? ` · ${b.conflicts.map((c) => CONFLICT_LABEL[c]).join(', ')}` : ''}`}>
                  <strong>{b.draft ? 'Proposed: ' : ''}{b.title}</strong><span>{b.start}–{b.end}{b.sub ? ` · ${b.sub}` : ''}</span>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div></div></div>
  );
}
