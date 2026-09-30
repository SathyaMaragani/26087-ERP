/**
 * NCCT motion vocabulary. Every animation in the product belongs to one of these families:
 *
 *  FLOW             information travelling along connections            -> scene packets, <SignalLine>
 *  FORMATION        elements assembling from connected points            -> scene edge drawing, <QrFormation>
 *  REVEAL           information becoming visible on entry                -> <MaskedText>, <Reveal>
 *  TRANSFER         camera/content moving between systems                -> page transitions, camera states
 *  FOCUS            narrowing attention onto one entity                  -> explorer dimming, drawers
 *  EXPANSION        a selected node becoming a workspace                 -> explorer zoom, layoutId shared elements
 *  COLLAPSE         returning from detail to the ecosystem               -> explorer zoom-out
 *  SYNCHRONIZATION  several elements updating together                   -> <PulseOnChange>, queued-sync ring
 *
 * Easing is deliberate: entries decelerate ("expo out"), exits accelerate briefly, nothing bounces.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion, type Variants } from 'framer-motion';

export const EASE = [0.22, 1, 0.36, 1] as const;          // expo-out: precise, confident
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/* --------------------------------------------------------------- REVEAL: type */
export interface TextPart {
  text: string;
  /** Editorial serif italic in the accent colour. */
  em?: boolean;
  /** Travels through the spatial layer: enters larger and out of focus, then settles. */
  depth?: boolean;
  /** Tracking animates from open to set, like a title card locking into place. */
  track?: boolean;
  /** Extra delay (seconds) before this part begins. */
  delay?: number;
}

interface MaskedTextProps {
  parts: TextPart[];
  /** Drive from state (hero) … */
  show?: boolean;
  /** … or reveal when scrolled into view. */
  inView?: boolean;
  delay?: number;
  stagger?: number;
  className?: string;
  as?: 'h1' | 'h2' | 'p' | 'span';
  id?: string;
}

const charVariants: Variants = {
  hidden: { y: '118%', opacity: 0, filter: 'blur(7px)' },
  shown: (i: number) => ({ y: '0%', opacity: 1, filter: 'blur(0px)', transition: { duration: 0.95, ease: EASE, delay: i } }),
};

/** Masked, letter-timed typography: characters rise out of a clipping line, sharpening as they arrive. */
export function MaskedText({ parts, show = true, inView = false, delay = 0, stagger = 0.02, className, as = 'span', id }: MaskedTextProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { amount: 0.5 });
  const [everSeen, setEverSeen] = useState(false);
  useEffect(() => { if (seen) setEverSeen(true); }, [seen]);
  const active = reduce ? true : inView ? everSeen : show;
  const label = parts.map((p) => p.text).join(' ');
  const Tag = motion[as] as typeof motion.span;

  let counter = 0;
  return (
    <Tag ref={ref as never} id={id} className={className} aria-label={label} initial={reduce ? false : 'hidden'} animate={active ? 'shown' : 'hidden'}>
      {parts.map((part, pi) => {
        const words = part.text.split(' ');
        const base = delay + (part.delay ?? 0);
        const wrapVariants: Variants = {
          hidden: { scale: part.depth ? 1.16 : 1, x: part.depth ? -36 : 0, filter: part.depth ? 'blur(10px)' : 'blur(0px)', letterSpacing: part.track ? '0.07em' : '0em' },
          shown: { scale: 1, x: 0, filter: 'blur(0px)', letterSpacing: '0em', transition: { duration: part.depth ? 1.6 : 1.4, ease: EASE, delay: base } },
        };
        return (
          <motion.span key={pi} aria-hidden className={`mask-part${part.em ? ' is-em' : ''}`} variants={wrapVariants} style={{ display: 'inline-block', transformOrigin: '0% 60%' }}>
            {words.map((w, wi) => (
              <span key={wi} className="mask-word">
                {w.split('').map((ch, ci) => {
                  const d = base + counter++ * stagger;
                  return <motion.span key={ci} className="mask-char" variants={charVariants} custom={d}>{ch}</motion.span>;
                })}
                {wi < words.length - 1 && <span className="mask-space">&nbsp;</span>}
              </span>
            ))}
            {pi < parts.length - 1 && <span className="mask-space">&nbsp;</span>}
          </motion.span>
        );
      })}
    </Tag>
  );
}

/* ------------------------------------------------------------ REVEAL: blocks */
/** A block that wipes into view from behind a clipping edge. */
export function Reveal({ children, delay = 0, from = 'bottom', className, inView = true }: { children: ReactNode; delay?: number; from?: 'bottom' | 'left' | 'right'; className?: string; inView?: boolean }) {
  const reduce = useReducedMotion();
  const hidden = { bottom: 'inset(0 0 100% 0)', left: 'inset(0 100% 0 0)', right: 'inset(0 0 0 100%)' }[from];
  const y = from === 'bottom' ? 22 : 0, x = from === 'left' ? -24 : from === 'right' ? 24 : 0;
  return (
    <motion.div className={className}
      initial={reduce ? false : { clipPath: hidden, opacity: 0, y, x }}
      {...(inView ? { whileInView: { clipPath: 'inset(0 0 0 0)', opacity: 1, y: 0, x: 0 }, viewport: { once: true, amount: 0.25 } } : { animate: { clipPath: 'inset(0 0 0 0)', opacity: 1, y: 0, x: 0 } })}
      transition={{ duration: 0.9, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------ TRANSFER: signal */
/** A thin signal that travels across a container edge whenever `trigger` changes. */
export function SignalLine({ trigger }: { trigger: string }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <motion.div key={trigger} className="signal" aria-hidden
      initial={{ scaleX: 0, opacity: 1 }} animate={{ scaleX: 1, opacity: [1, 1, 0] }} transition={{ duration: 0.85, ease: EASE, opacity: { duration: 0.85, times: [0, 0.7, 1] } }}>
      <i />
    </motion.div>
  );
}

/* ----------------------------------------------------- SYNCHRONIZATION: pulse */
/** Emits a soft ring each time `value` changes, so updates read as the system responding. */
export function PulseOnChange({ value }: { value: unknown }) {
  const reduce = useReducedMotion();
  const prev = useRef(value);
  const [n, setN] = useState(0);
  useEffect(() => { if (prev.current !== value) { prev.current = value; setN((x) => x + 1); } }, [value]);
  if (reduce || n === 0) return null;
  return <motion.span key={n} className="sync-ring" aria-hidden initial={{ scale: 0.6, opacity: 0.9 }} animate={{ scale: 2.6, opacity: 0 }} transition={{ duration: 1.1, ease: EASE }} />;
}
