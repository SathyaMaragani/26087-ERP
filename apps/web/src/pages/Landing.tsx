import { useLayoutEffect, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { navigate } from '../lib/route';
import { EASE } from '../motion/primitives';
import { Wordmark } from '../ui/Wordmark';
import { HeroHead } from './HeroHead';
import DyeWhorl from '../ui/dye-whorl';

// DyeWhorl reads its ink ramp from these tokens on <html>; they are hex on purpose (it parses hex).
const INK_TOKENS: Record<string, string> = { '--background': '#03050b', '--foreground': '#cfe0ff', '--ns-muted': '#3f56b8', '--border': '#101a47', '--ns-accent': '#6fd3db' };

/** The landing page is one interactive hero: a field of light that answers the pointer. */
export function Landing({ signedIn }: { signedIn: boolean }) {
  const reduce = useReducedMotion();
  useLayoutEffect(() => {
    const root = document.documentElement;
    const prev = Object.keys(INK_TOKENS).map((k) => [k, root.style.getPropertyValue(k)] as const);
    for (const [k, v] of Object.entries(INK_TOKENS)) root.style.setProperty(k, v);
    return () => { for (const [k, v] of prev) { if (v) root.style.setProperty(k, v); else root.style.removeProperty(k); } };
  }, []);

  const cta = signedIn ? { label: 'Open the platform', to: '#/app' } : { label: 'Sign in', to: '#/login' };
  const rise = (delay: number, y = 12) => ({ initial: reduce ? false : { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease: EASE, delay } } as const);

  // The hero itself is locked — untouched composition, copy, animation. This only governs how it
  // leaves: it dissolves in the last stretch of its own natural scroll, rather than cutting to white.
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroExit } = useScroll({ target: heroRef, offset: ['end end', 'end start'] });
  const heroOpacity = useTransform(heroExit, [0, 1], [1, 0]);
  const heroScale = useTransform(heroExit, [0, 1], [1, 0.97]);

  return (
    <div className="landing">
      <motion.div className="hero-page hero-exit" ref={heroRef} style={reduce ? undefined : { opacity: heroOpacity, scale: heroScale }}>
      <DyeWhorl className="hero-fluid" density={0.32} stir={1.1}>
        <HeroHead reduced={!!reduce} overlay />

      <header className="hero-bar">
        <Wordmark />
      </header>

      <main className="hero-copy">
        <motion.h1 className="hero-serif" {...rise(0.2, 18)}>
          A national digital infrastructure <em>for cooperative learning.</em>
        </motion.h1>
        <motion.p className="hero-note hero-note--l" {...rise(0.7, 0)}>
          One connected system carries a rural trainee from a village PACS to the apex council — through training, learning, credentials and work.
        </motion.p>
        <motion.p className="hero-note hero-note--r" {...rise(0.9, 0)}>
          Nineteen institutions<br />One national registry
        </motion.p>
        <motion.p className="hero-serif-sm" {...rise(1.1, 10)}>
          Built for teams<br /><span>who train a nation.</span>
        </motion.p>
        <motion.div className="hero-ctas" {...rise(0.8)}>
          <button className="hero-btn hero-btn--solid" onClick={() => navigate(cta.to)}>{cta.label} <i aria-hidden /></button>
          <button className="hero-btn" onClick={() => navigate('#/verify')}>Verify a certificate <ArrowRight size={16} aria-hidden /></button>
        </motion.div>
      </main>
      </DyeWhorl>
      </motion.div>
    </div>
  );
}

