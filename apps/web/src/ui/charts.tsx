import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const TONES = {
  copper: 'var(--accent-primary)',
  teal: 'var(--accent-secondary)',
  indigo: 'var(--accent-tertiary)',
  amber: 'var(--accent-warning)',
  green: 'var(--accent-success)',
} as const;
export type ChartTone = keyof typeof TONES;
const CYCLE: ChartTone[] = ['teal', 'copper', 'indigo', 'amber', 'green'];

/** Radial progress: a single ring with the value centred. */
export function RadialGauge({ value, label, tone = 'teal', size = 132, sub }: { value: number; label: string; tone?: ChartTone; size?: number; sub?: string }) {
  const reduce = useReducedMotion();
  const id = useId();
  const v = Math.max(0, Math.min(100, value));
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  return (
    <figure className="gauge" style={{ width: size }} aria-label={`${label}: ${v}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-labelledby={id}>
        <title id={id}>{`${label}: ${v} percent`}</title>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-default)" strokeWidth={6} />
        {[...Array(40)].map((_, i) => {
          const a = (i / 40) * Math.PI * 2 - Math.PI / 2;
          return <line key={i} x1={size / 2 + Math.cos(a) * (r - 9)} y1={size / 2 + Math.sin(a) * (r - 9)} x2={size / 2 + Math.cos(a) * (r - 5)} y2={size / 2 + Math.sin(a) * (r - 5)} stroke="var(--border-default)" strokeWidth={1} />;
        })}
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TONES[tone]} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={c} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: reduce ? c * (1 - v / 100) : c }}
          whileInView={{ strokeDashoffset: c * (1 - v / 100) }} viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="gauge-value">{Math.round(v)}<tspan className="gauge-unit">%</tspan></text>
      </svg>
      <figcaption>
        <span>{label}</span>
        {sub && <small>{sub}</small>}
      </figcaption>
    </figure>
  );
}

/** Ranked horizontal bars with the value on the right. */
export function BarList({ items, tone = 'teal', unit = '' }: { items: Array<{ label: string; value: number; sub?: string }>; tone?: ChartTone; unit?: string }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="barlist">
      {items.map((it, idx) => (
        <li key={`${it.label}-${idx}`}>
          <div className="barlist-row">
            <span className="barlist-label">{it.label}</span>
            <span className="num barlist-val">{it.value.toLocaleString('en-IN')}{unit}</span>
          </div>
          <div className="barlist-track" role="presentation">
            <motion.div
              className="barlist-fill" style={{ background: TONES[tone] }}
              initial={{ width: reduce ? `${(it.value / max) * 100}%` : 0 }}
              whileInView={{ width: `${(it.value / max) * 100}%` }} viewport={{ once: true }}
              transition={{ duration: 0.9, delay: reduce ? 0 : idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          {it.sub && <div className="barlist-sub">{it.sub}</div>}
        </li>
      ))}
    </ul>
  );
}

/** Donut with a legend; slices are real proportions of the given counts. */
export function Donut({ items, size = 148 }: { items: Array<{ label: string; value: number }>; size?: number }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={items.map((i) => `${i.label} ${i.value}`).join(', ')}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={14} />
        {total > 0 && items.map((it, i) => {
          const len = (it.value / total) * c;
          const off = -acc; acc += len;
          return <circle key={`${it.label}-${i}`} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TONES[CYCLE[i % CYCLE.length]]} strokeWidth={14}
            strokeDasharray={`${Math.max(0, len - 3)} ${c - Math.max(0, len - 3)}`} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
        })}
        <text x="50%" y="48%" textAnchor="middle" className="donut-total">{total.toLocaleString('en-IN')}</text>
        <text x="50%" y="62%" textAnchor="middle" className="donut-cap">TOTAL</text>
      </svg>
      <ul className="legend">
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`}><i style={{ background: TONES[CYCLE[i % CYCLE.length]] }} />{it.label.replace(/_/g, ' ')}<span className="num">{it.value}</span></li>
        ))}
      </ul>
    </div>
  );
}

/** Stepped funnel: each stage is drawn relative to the first. */
export function Funnel({ stages }: { stages: Array<{ label: string; value: number }> }) {
  const reduce = useReducedMotion();
  const top = Math.max(1, stages[0]?.value ?? 1);
  return (
    <ol className="funnel">
      {stages.map((s, i) => {
        const pct = (s.value / top) * 100;
        const prev = i > 0 ? stages[i - 1].value : null;
        return (
          <li key={`${s.label}-${i}`}>
            <div className="funnel-head"><span>{s.label}</span><span className="num">{s.value.toLocaleString('en-IN')}</span></div>
            <div className="funnel-track">
              <motion.div className="funnel-fill" style={{ background: TONES[CYCLE[i % CYCLE.length]] }}
                initial={{ width: reduce ? `${pct}%` : 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }}
                transition={{ duration: 0.9, delay: reduce ? 0 : i * 0.1, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            {prev !== null && prev > 0 && <div className="funnel-conv">{Math.round((s.value / prev) * 100)}% of previous</div>}
          </li>
        );
      })}
    </ol>
  );
}

/** Vertical timeline for ordered events. */
export function Timeline({ items }: { items: Array<{ time: string; title: string; detail?: string; tone?: ChartTone }> }) {
  return (
    <ol className="timeline">
      {items.map((it, i) => (
        <li key={i}>
          <span className="timeline-dot" style={{ background: TONES[it.tone ?? 'teal'] }} aria-hidden />
          <div className="timeline-time num">{it.time}</div>
          <div className="timeline-title">{it.title}</div>
          {it.detail && <div className="timeline-detail">{it.detail}</div>}
        </li>
      ))}
    </ol>
  );
}
