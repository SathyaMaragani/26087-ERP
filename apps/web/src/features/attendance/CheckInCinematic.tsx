import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE } from '../../motion/primitives';

export type CheckInPhase = 'idle' | 'verifying' | 'ok' | 'fail';
const NODES = [
  { id: 'qr', label: 'QR CODE', x: 70 },
  { id: 'trainee', label: 'TRAINEE', x: 230 },
  { id: 'session', label: 'SESSION', x: 390 },
  { id: 'programme', label: 'PROGRAMME', x: 550 },
] as const;
const Y = 78;

/**
 * QR detected → identity signal → verification ring closes → trainee node → TRAINEE → SESSION → PROGRAMME.
 * It waits for the server: the ring only closes and the record is only "stored" once the API says so.
 */
export function CheckInCinematic({ phase, name, reason }: { phase: CheckInPhase; name: string; reason?: string }) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(0); // 0 idle · 1 detected · 2 identity · 3 ring drawing · 4 trainee active · 5 record path
  useEffect(() => {
    if (phase === 'idle') { setStage(0); return; }
    if (phase === 'verifying') {
      setStage(1);
      const t = [window.setTimeout(() => setStage(2), reduce ? 0 : 450), window.setTimeout(() => setStage(3), reduce ? 0 : 950)];
      return () => t.forEach(clearTimeout);
    }
    if (phase === 'ok') {
      setStage(3);
      const t = [window.setTimeout(() => setStage(4), reduce ? 0 : 500), window.setTimeout(() => setStage(5), reduce ? 0 : 1100)];
      return () => t.forEach(clearTimeout);
    }
  }, [phase, reduce]);

  if (phase === 'idle') return null;
  const tx = NODES[1].x;
  const lit = (i: number) => (phase === 'fail' ? i === 0 : stage >= [1, 2, 5, 5][i]);
  const done = (i: number) => phase === 'ok' && stage >= [1, 4, 5, 5][i];
  const caption = phase === 'fail' ? `Rejected — ${reason ?? 'the code was not accepted'}`
    : stage <= 1 ? 'QR detected' : stage === 2 ? 'Identity signal' : stage === 3 && phase === 'verifying' ? 'Verifying with the server…' : stage === 3 ? 'Verification ring closing' : stage === 4 ? `${name || 'Trainee'} node active` : 'Attendance verified · record stored';

  const R = 30, C = 2 * Math.PI * R;
  return (
    <div className="checkin" role="status" aria-live="polite">
      <svg viewBox="0 0 620 156" aria-hidden>
        {/* connections */}
        <path d={`M ${NODES[0].x + 24} ${Y} L ${tx - 24} ${Y}`} className="ck-line" />
        <motion.path d={`M ${NODES[0].x + 24} ${Y} L ${tx - 24} ${Y}`} className="ck-line-on" initial={{ pathLength: 0 }} animate={{ pathLength: stage >= 2 && phase !== 'fail' ? 1 : 0 }} transition={{ duration: 0.5, ease: EASE }} />
        <path d={`M ${tx + 24} ${Y} L ${NODES[3].x - 24} ${Y}`} className="ck-line" />
        <motion.path d={`M ${tx + 24} ${Y} L ${NODES[3].x - 24} ${Y}`} className="ck-line-on" initial={{ pathLength: 0 }} animate={{ pathLength: phase === 'ok' && stage >= 5 ? 1 : 0 }} transition={{ duration: 0.9, ease: EASE }} />

        {/* travelling pulse along the record path */}
        {phase === 'ok' && stage >= 5 && !reduce && <motion.circle r="4.5" cy={Y} fill="#cfd6ff" initial={{ cx: tx + 24, opacity: 1 }} animate={{ cx: NODES[3].x - 24, opacity: [1, 1, 0] }} transition={{ duration: 0.9, ease: EASE }} style={{ filter: 'drop-shadow(0 0 6px #8a98ff)' }} />}

        {/* verification ring around the trainee */}
        {stage >= 3 && <circle cx={tx} cy={Y} r={R} fill="none" stroke="var(--border-default)" strokeWidth="2" />}
        {stage >= 3 && (
          <motion.circle cx={tx} cy={Y} r={R} className="ck-ring" strokeDasharray={C} transform={`rotate(-90 ${tx} ${Y})`}
            style={phase === 'fail' ? { stroke: 'var(--accent-danger)' } : phase === 'verifying' ? { stroke: 'var(--accent-secondary)' } : undefined}
            initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: phase === 'ok' ? 0 : phase === 'fail' ? C * 0.72 : C * 0.28 }} transition={{ duration: phase === 'verifying' ? 1.4 : 0.6, ease: EASE }} />
        )}

        {NODES.map((n, i) => (
          <g key={n.id}>
            <motion.circle cx={n.x} cy={Y} r="17" className={`ck-node${lit(i) ? ' on' : ''}${done(i) ? ' done' : ''}`} animate={{ scale: lit(i) ? [1, 1.18, 1] : 1 }} transition={{ duration: 0.5 }} style={{ transformOrigin: `${n.x}px ${Y}px`, ...(phase === 'fail' && i === 0 ? { stroke: 'var(--accent-danger)' } : undefined) }} />
            <text x={n.x} y={Y + 46} className="ck-label">{n.label}</text>
          </g>
        ))}
      </svg>
      <div className="ck-caption" style={{ color: phase === 'fail' ? 'var(--accent-danger)' : phase === 'ok' && stage >= 5 ? 'var(--accent-success)' : undefined }}>{caption}</div>
    </div>
  );
}
