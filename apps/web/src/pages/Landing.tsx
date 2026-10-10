import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Award, BookOpen, Briefcase, CalendarDays, ChevronRight, FileText, Landmark, ShieldCheck, Users } from 'lucide-react';
import { navigate } from '../lib/route';
import { EASE } from '../motion/primitives';
import { Wordmark } from '../ui/Wordmark';
import { LandingMap } from './LandingMap';

const JOURNEY = [
  { icon: FileText, title: 'Register', body: 'Join programmes at your institution' },
  { icon: BookOpen, title: 'Learn', body: 'Access multilingual e-learning content' },
  { icon: CalendarDays, title: 'Attend', body: 'Track attendance with digital records' },
  { icon: Award, title: 'Certify', body: 'Earn verifiable credentials' },
  { icon: Briefcase, title: 'Connect to opportunities', body: 'Explore jobs, fellowships and growth paths' },
];

const PILLARS = [
  { icon: Users, label: 'Unified trainee records' },
  { icon: BookOpen, label: 'Multilingual learning' },
  { icon: Award, label: 'Verified credentials' },
];

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/** Public landing: the national training network as a living map, then the trainee journey. */
export function Landing({ signedIn }: { signedIn: boolean }) {
  const reduce = !!useReducedMotion();
  const platform = signedIn ? '#/app' : '#/login';

  // Pointer parallax: the map tilts toward the pointer, the cards drift the other way.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18 });
  const sy = useSpring(py, { stiffness: 60, damping: 18 });
  const rotY = useTransform(sx, (v) => v * 5);
  const rotX = useTransform(sy, (v) => 8 - v * 4);
  const cardX = useTransform(sx, (v) => v * -14);
  const cardY = useTransform(sy, (v) => v * -10);
  const heroRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = heroRef.current;
    if (!el || reduce) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px.set((e.clientX - r.left) / r.width - 0.5);
      py.set((e.clientY - r.top) / r.height - 0.5);
    };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, [reduce, px, py]);

  const rise = (delay: number, y = 16) => ({
    initial: reduce ? false : { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE, delay },
  } as const);
  const line = (delay: number) => ({
    initial: reduce ? false : { y: '105%' },
    animate: { y: '0%' },
    transition: { duration: 1, ease: EASE, delay },
  } as const);

  const cards = [
    { icon: Landmark, title: '19 institutions', sub: 'One connected network', to: platform, pos: 'lp-card--a' },
    { icon: FileText, title: 'Programme registry', sub: 'Centralised enrolment', to: platform, pos: 'lp-card--b' },
    { icon: BookOpen, title: 'Learning access', sub: 'Multilingual courses', to: platform, pos: 'lp-card--c' },
    { icon: Award, title: 'Digital credentials', sub: 'Verifiable certificates', to: '#/verify', pos: 'lp-card--d' },
  ];

  return (
    <div className="landing lp">
      <header className="lp-bar">
        <Wordmark />
        <nav className="lp-nav" aria-label="Sections">
          <button onClick={() => scrollTo('network')}>Network</button>
          <button onClick={() => scrollTo('journey')}>Journey</button>
        </nav>
        <div className="lp-bar-actions">
          <button className="lp-link" onClick={() => navigate('#/verify')}><ShieldCheck size={18} aria-hidden /> Verify certificate</button>
          <button className="lp-btn lp-btn--solid lp-btn--sm" onClick={() => navigate(platform)}>Open platform <ArrowRight size={16} aria-hidden /></button>
        </div>
      </header>

      <section className="lp-hero" id="network" ref={heroRef}>
        <svg className="lp-hills" viewBox="0 0 900 300" preserveAspectRatio="none" aria-hidden>
          <path d="M0 150 C120 90 220 120 320 95 C420 70 520 110 640 90 C740 75 820 110 900 100 V300 H0Z" fill="#b9b49b" opacity="0.5" />
          <path d="M0 200 C140 150 260 175 380 150 C500 128 600 170 720 160 C800 154 860 175 900 170 V300 H0Z" fill="#7f8f62" opacity="0.65" />
          <path d="M0 250 C160 215 300 240 440 220 C560 205 680 238 800 230 C850 228 880 236 900 234 V300 H0Z" fill="#4e6b3f" opacity="0.8" />
        </svg>

        <div className="lp-copy">
          <motion.p className="lp-eyebrow" {...rise(0.1, 8)}>One network · Every learning journey</motion.p>
          <h1 className="lp-h1">
            <span className="lp-line"><motion.span {...line(0.2)}>Training that</motion.span></span>
            <span className="lp-line"><motion.span {...line(0.32)}>connects a <em>nation</em>.</motion.span></span>
          </h1>
          <motion.p className="lp-lede" {...rise(0.6)}>
            A unified digital ecosystem for cooperative institutions — from programme registration and attendance to learning, credentials and careers.
          </motion.p>
          <motion.div className="lp-ctas" {...rise(0.75)}>
            <button className="lp-btn lp-btn--solid" onClick={() => navigate(platform)}>Explore the platform <ArrowRight size={18} aria-hidden /></button>
            <button className="lp-btn" onClick={() => navigate('#/verify')}><ShieldCheck size={18} aria-hidden /> Verify a certificate</button>
          </motion.div>
          <ul className="lp-pillars">
            {PILLARS.map(({ icon: Icon, label }, i) => (
              <motion.li key={label} {...rise(0.9 + i * 0.1, 10)}><span><Icon size={22} aria-hidden /></span>{label}</motion.li>
            ))}
          </ul>
        </div>

        <div className="lp-stage">
          <motion.div
            className="lp-map-wrap"
            initial={reduce ? false : { opacity: 0, scale: 0.94, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.4, ease: EASE, delay: 0.15 }}
            style={reduce ? undefined : { rotateX: rotX, rotateY: rotY }}
          >
            <LandingMap />
          </motion.div>

          <motion.div className="lp-cards" style={reduce ? undefined : { x: cardX, y: cardY }}>
            {cards.map(({ icon: Icon, title, sub, to, pos }, i) => (
              <motion.button
                key={title}
                className={`lp-card ${pos}`}
                onClick={() => navigate(to)}
                initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: EASE, delay: 1.3 + i * 0.15 }}
              >
                <span className="lp-card-in" style={{ animationDelay: `${i * -1.3}s` }}>
                  <span className="lp-card-icon"><Icon size={22} aria-hidden /></span>
                  <span className="lp-card-text"><b>{title}</b><small>{sub}</small></span>
                  <ChevronRight size={18} aria-hidden />
                </span>
              </motion.button>
            ))}
          </motion.div>

          <motion.div className="lp-legend" {...rise(1.6, 0)}><i /><i /> Training network · India</motion.div>
          <motion.svg className="lp-compass" viewBox="-40 -40 80 80" aria-hidden {...rise(1.7, 0)}>
            <circle r="24" />
            <path d="M0 -30 L5 0 L0 30 L-5 0Z M-30 0 L0 5 L30 0 L0 -5Z" />
            <text y="-32">N</text><text y="40">S</text><text x="-36" y="4">W</text><text x="36" y="4">E</text>
          </motion.svg>
          <motion.p className="lp-motto" {...rise(1.8, 8)}>Strengthening Cooperatives<br />Building a Stronger India<span><i /><i /><i /></span></motion.p>
        </div>
      </section>

      <section className="lp-journey" id="journey">
        <motion.div className="lp-journey-head" initial={reduce ? false : { opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.8, ease: EASE }}>
          <h2>One connected journey</h2>
          <p>From village-level trainees to national institutions.</p>
        </motion.div>
        <ol className="lp-steps">
          {JOURNEY.map(({ icon: Icon, title, body }, i) => (
            <motion.li
              key={title}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, ease: EASE, delay: i * 0.14 }}
            >
              <div className="lp-step-top">
                <span className="lp-step-num">{i + 1}</span>
                <span className="lp-step-icon"><Icon size={20} aria-hidden /></span>
                {i < JOURNEY.length - 1 && (
                  <motion.span
                    className="lp-step-arrow"
                    aria-hidden
                    initial={reduce ? false : { scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.4 + i * 0.14 }}
                  />
                )}
              </div>
              <b>{title}</b>
              <small>{body}</small>
            </motion.li>
          ))}
        </ol>
      </section>
    </div>
  );
}
