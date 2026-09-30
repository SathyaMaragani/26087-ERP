import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE } from '../motion/primitives';

export interface GraphSkill {
  id: string;
  name: string;
  level: number;
  verifiedAt?: string;
  evidence: Array<{ kind: 'certificate' | 'programme'; label: string; sub?: string }>;
}
export interface GraphGroup { category: string; skills: GraphSkill[] }

const ROW = 92, COL_X = [150, 500, 850], W = 1000;
const curve = (x1: number, y1: number, x2: number, y2: number) => `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;

/**
 * Category → skill → evidence, drawn as a structured graph. Connections draw themselves in;
 * selecting a skill lights its whole chain and dims the rest (focus).
 */
export function SkillGraph({ groups, maxLevel = 3, selectedId, onSelect }: { groups: GraphGroup[]; maxLevel?: number; selectedId: string | null; onSelect: (id: string) => void }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const focus = selectedId ?? hover;

  let row = 0;
  const layout = groups.map((g) => {
    const skills = g.skills.map((s) => ({ s, y: 50 + row++ * ROW }));
    const yMid = skills.length ? (skills[0].y + skills[skills.length - 1].y) / 2 : 50;
    return { g, skills, yMid };
  });
  const height = Math.max(160, 50 + row * ROW);
  let delay = 0;

  return (
    <div className="sgraph-wrap">
      <svg className="sgraph" viewBox={`0 0 ${W} ${height}`} role="group" aria-label="Skill graph: categories, skills and the evidence behind them">
        {layout.map(({ g, skills, yMid }) => (
          <g key={g.category}>
            {skills.map(({ s, y }) => {
              const lit = !focus || focus === s.id;
              const d0 = (delay += 0.07);
              const ev = s.evidence.length ? s.evidence : null;
              return (
                <g key={s.id} opacity={lit ? 1 : 0.22} style={{ transition: 'opacity .35s' }}>
                  <motion.path d={curve(COL_X[0] + 90, yMid, COL_X[1] - 110, y)} className="sg-edge" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: EASE, delay: d0 }} />
                  {(ev ?? [null]).map((e, k) => {
                    const ey = y + (ev ? (k - (ev.length - 1) / 2) * 34 : 0);
                    return (
                      <g key={k}>
                        <motion.path d={curve(COL_X[1] + 110, y, COL_X[2] - 118, ey)} className={`sg-edge${e ? '' : ' sg-edge-off'}`} initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: EASE, delay: d0 + 0.25 }} />
                        <g transform={`translate(${COL_X[2] - 118} ${ey - 15})`}>
                          <rect width="236" height="30" rx="9" className={`sg-ev${e ? '' : ' sg-ev-off'}`} />
                          <text x="12" y="19" className="sg-ev-text">{e ? clip(e.label, 30) : 'No evidence on record'}</text>
                        </g>
                      </g>
                    );
                  })}
                  <g transform={`translate(${COL_X[1] - 110} ${y - 26})`} className="sg-skill" role="button" tabIndex={0} aria-pressed={selectedId === s.id}
                    aria-label={`${s.name}, level ${s.level} of ${maxLevel}`}
                    onClick={() => onSelect(s.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.id); } }}
                    onPointerEnter={() => setHover(s.id)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(s.id)} onBlur={() => setHover(null)}>
                    <rect width="220" height="52" rx="14" className={`sg-skill-box${selectedId === s.id ? ' is-selected' : ''}`} />
                    <text x="14" y="22" className="sg-skill-name">{clip(s.name, 26)}</text>
                    {Array.from({ length: maxLevel }, (_, i) => <rect key={i} x={14 + i * 26} y="32" width="20" height="5" rx="2.5" className={i < s.level ? 'sg-pip on' : 'sg-pip'} />)}
                    <text x={14 + maxLevel * 26 + 4} y="38" className="sg-level">L{s.level}</text>
                  </g>
                </g>
              );
            })}
            <g transform={`translate(${COL_X[0] - 90} ${yMid - 24})`}>
              <rect width="180" height="48" rx="24" className="sg-cat" />
              <text x="90" y="29" textAnchor="middle" className="sg-cat-text">{clip(g.category, 22)}</text>
            </g>
          </g>
        ))}
      </svg>
      <ul className="sr-only">{groups.flatMap((g) => g.skills.map((s) => <li key={s.id}>{g.category}: {s.name}, level {s.level} of {maxLevel}, {s.evidence.length} evidence item(s)</li>))}</ul>
    </div>
  );
}

const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
