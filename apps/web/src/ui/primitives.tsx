import { useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/* ---------------------------------------------------------------- Button */
interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  /** Subtle pointer-follow displacement. Off on touch and for reduced motion. */
  magnetic?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', loading, magnetic, icon, children, className = '', disabled, ...rest }: ButtonProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 20, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 260, damping: 20, mass: 0.4 });
  const canMagnet = magnetic && !reduce;

  const onMove = (e: React.PointerEvent) => {
    if (!canMagnet || e.pointerType === 'touch' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.22);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.3);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.button
      ref={ref}
      style={canMagnet ? { x: sx, y: sy } : undefined}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={`btn btn-${variant === 'danger' ? 'danger' : variant} ${size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="spin" aria-hidden /> : icon}
      {children}
    </motion.button>
  );
}

/* ----------------------------------------------------------------- Badge */
export function Badge({ tone = 'neutral', children, dot }: { tone?: 'neutral' | 'teal' | 'copper' | 'indigo' | 'amber' | 'green' | 'red'; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`pill pill-${tone}`}>
      {dot && <span className="pill-dot" aria-hidden />}
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- Surface */
export function Surface({ title, eyebrow, action, children, className = '', pad = true, style }: {
  title?: ReactNode; eyebrow?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean; style?: CSSProperties;
}) {
  return (
    <section className={`surface ${className}`} style={style}>
      {(title || eyebrow || action) && (
        <header className="surface-head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h3>{title}</h3>}
          </div>
          {action}
        </header>
      )}
      <div className={pad ? 'surface-body' : undefined}>{children}</div>
    </section>
  );
}

/* --------------------------------------------------------------- Tooltip */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="tip-wrap" onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
      {children}
      {open && <span role="tooltip" className="tip">{label}</span>}
    </span>
  );
}

/* ------------------------------------------------------------ Empty/Load */
export function EmptyState({ icon, title, detail, action }: { icon?: ReactNode; title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon" aria-hidden>{icon}</div>}
      <div className="empty-title">{title}</div>
      {detail && <div className="empty-detail">{detail}</div>}
      {action}
    </div>
  );
}

/** An unavailable capability or failed request, stated plainly. Never dressed up as data. */
export function ErrorState({ title = 'Unable to load', detail, onRetry }: { title?: string; detail?: string; onRetry?: () => void }) {
  return (
    <div className="empty empty-error" role="alert">
      <div className="empty-title">{title}</div>
      {detail && <div className="empty-detail">{detail}</div>}
      {onRetry && <Button size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function Skeleton({ h = 16, w = '100%', r = 6 }: { h?: number; w?: number | string; r?: number }) {
  return <span className="skeleton" style={{ height: h, width: w, borderRadius: r }} aria-hidden />;
}

export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <span className="loading-bars" aria-hidden><i /><i /><i /><i /></span>
      <span>{label}…</span>
    </div>
  );
}

/* ------------------------------------------------------------ PageHeader */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p className="page-desc">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Tabs */
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: Array<{ id: T; label: string }>; value: T; onChange: (id: T) => void; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab${value === t.id ? ' tab-active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
          {value === t.id && <motion.span layoutId={`tab-underline-${label}`} className="tab-underline" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
        </button>
      ))}
    </div>
  );
}
