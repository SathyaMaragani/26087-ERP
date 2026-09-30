import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

/** Counts up to a numeric value once it scrolls into view. */
export function CountUp({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) { setShown(value); return; }
    if (!inView) return;
    const c = animate(0, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(v) });
    return () => c.stop();
  }, [inView, value, reduce]);

  return <span ref={ref} className="num">{shown.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

export function Metric({ label, value, decimals, suffix, hint, tone = 'default', icon }: {
  label: string; value: number | string; decimals?: number; suffix?: string; hint?: ReactNode; tone?: 'default' | 'copper' | 'teal' | 'amber' | 'indigo'; icon?: ReactNode;
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <div className="metric-top">
        <span className="eyebrow">{label}</span>
        {icon && <span className="metric-icon" aria-hidden>{icon}</span>}
      </div>
      <div className="metric-value">
        {typeof value === 'number' ? <CountUp value={value} decimals={decimals} suffix={suffix} /> : <span className="num">{value}</span>}
      </div>
      {hint && <div className="metric-hint">{hint}</div>}
    </div>
  );
}
