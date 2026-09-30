import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE } from '../motion/primitives';

export interface MatchCandidate { id: string; name: string; score: number; matched: string[]; certified: boolean }

const W = 900;
const XJ = 96, XS = 440, XC = 790;
const curve = (x1: number, y1: number, x2: number, y2: number) => `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const norm = (s: string) => s.trim().toLowerCase();

/**
 * TALENT MATCHING NETWORK — JOB → REQUIRED SKILLS → VERIFIED CANDIDATES.
 * A candidate connects only through skills they actually hold; hover a candidate to trace why they match.
 */
export function MatchNetwork({ jobTitle, required, candidates }: { jobTitle: string; required: string[]; candidates: MatchCandidate[] }) {
  const reduce = useReducedMotion();
  const [focus, setFocus] = useState<string | null>(null);
  const cands = candidates.slice(0, 8);
  const rows = Math.max(required.length, cands.length, 3);
  const H = 70 + rows * 58;
  const yOf = (i: number, n: number) => (n <= 1 ? H / 2 : 44 + (i * (H - 88)) / (n - 1));
  const sy = required.map((_, i) => yOf(i, required.length));
  const cy = cands.map((_, i) => yOf(i, cands.length));
  const active = cands.find((c) => c.id === focus);

  return (
    <div className="mn-wrap">
      <svg className="mn" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Talent matching network for ${jobTitle}`}>
        {['JOB', 'REQUIRED SKILLS', 'VERIFIED CANDIDATES'].map((t, i) => <text key={t} x={[XJ, XS, XC][i]} y={16} textAnchor="middle" className="mn-col">{t}</text>)}

        {required.map((s, i) => (
          <motion.path key={s} d={curve(XJ + 70, H / 2, XS - 92, sy[i])} className="mn-edge mn-edge-job" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE, delay: i * 0.06 }} />
        ))}
        {cands.map((c, ci) => required.map((s, si) => {
          if (!c.matched.some((m) => norm(m).includes(norm(s)) || norm(s).includes(norm(m)))) return null;
          const on = focus === c.id;
          return <motion.path key={`${c.id}-${s}`} d={curve(XS + 92, sy[si], XC - 84, cy[ci])} className={`mn-edge mn-edge-match${on ? ' is-on' : ''}`} style={{ opacity: focus ? (on ? 1 : 0.08) : 0.35 + c.score / 250 }}
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE, delay: 0.4 + ci * 0.05 }} />;
        }))}

        <g transform={`translate(${XJ - 70} ${H / 2 - 30})`}><rect width="140" height="60" rx="14" className="mn-job" /><text x="70" y="27" textAnchor="middle" className="mn-job-t">{clip(jobTitle, 20)}</text><text x="70" y="45" textAnchor="middle" className="mn-sub">{required.length} required skill{required.length === 1 ? '' : 's'}</text></g>

        {required.map((s, i) => {
          const lit = active ? active.matched.some((m) => norm(m).includes(norm(s)) || norm(s).includes(norm(m))) : true;
          return <g key={s} transform={`translate(${XS - 92} ${sy[i] - 18})`} opacity={lit ? 1 : 0.25} style={{ transition: 'opacity .3s' }}><rect width="184" height="36" rx="12" className="mn-skill" /><text x="92" y="23" textAnchor="middle" className="mn-skill-t">{clip(s, 26)}</text></g>;
        })}

        {cands.map((c, i) => (
          <g key={c.id} transform={`translate(${XC - 84} ${cy[i] - 22})`} className="mn-cand" role="button" tabIndex={0} aria-label={`${c.name}, ${c.score}% match${c.certified ? ', certified' : ''}`}
            opacity={focus && focus !== c.id ? 0.35 : 1} style={{ transition: 'opacity .3s' }}
            onPointerEnter={() => setFocus(c.id)} onPointerLeave={() => setFocus(null)} onFocus={() => setFocus(c.id)} onBlur={() => setFocus(null)}>
            <rect width="168" height="44" rx="13" className={`mn-cand-box${focus === c.id ? ' is-on' : ''}`} />
            <text x="14" y="19" className="mn-cand-name">{clip(c.name, 18)}</text>
            <rect x="14" y="28" width="90" height="5" rx="2.5" className="mn-bar" /><rect x="14" y="28" width={90 * (c.score / 100)} height="5" rx="2.5" className="mn-bar-fill" />
            <text x="112" y="34" className="mn-score">{c.score}%</text>
            {c.certified && <text x="150" y="20" className="mn-cert" textAnchor="middle">✓</text>}
          </g>
        ))}
      </svg>
      <ul className="sr-only">{cands.map((c) => <li key={c.id}>{c.name}: {c.score}% match; holds {c.matched.join(', ') || 'none of the required skills'}</li>)}</ul>
    </div>
  );
}
