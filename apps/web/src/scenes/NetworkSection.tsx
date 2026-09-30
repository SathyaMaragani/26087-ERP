import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

// Kept out of LivingNetwork.tsx (and imported nowhere else from it) so that module stays purely
// dynamically imported — R3F/three are heavy, and this file needs the stage names before that loads.
const STAGE_NAMES = ['CONNECT', 'TRAIN', 'LEARN', 'DEVELOP', 'CERTIFY', 'CONNECT'] as const;

const LivingNetwork = lazy(() => import('./LivingNetwork'));

const STAGE_COPY = [
  { eyebrow: '01 — CONNECT', title: 'Every institution finds its place.', body: 'Nineteen institutions, one national registry — from a village PACS to the apex council, each one a point on the same map.' },
  { eyebrow: '02 — TRAIN', title: 'Pathways emerge between them.', body: 'Programmes connect trainees to the institutions running them, the moment a nomination is confirmed.' },
  { eyebrow: '03 — LEARN', title: 'Learning takes shape along the way.', body: 'Multilingual, offline-ready lessons travel with the trainee, wherever the connection is.' },
  { eyebrow: '04 — DEVELOP', title: 'Skills accumulate, visibly.', body: 'Every completed module strengthens a verifiable record — not a certificate promised, a skill demonstrated.' },
  { eyebrow: '05 — CERTIFY', title: 'A credential crystallizes.', body: 'Structured, verifiable, publicly checkable — a credential the trainee owns, not the institution.' },
  { eyebrow: '06 — CONNECT', title: 'The network reaches an employer.', body: 'Skill and credential become a match — the same registry that trained the trainee now places them.' },
];

function isWebglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

/** SECTION 02 — the first thing after the locked hero: one evolving 3D network across six stages. */
export function NetworkSection() {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef(0);
  const [webgl] = useState(isWebglAvailable);
  const [activeStage, setActiveStage] = useState(0);

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] });
  // Runs to 6, not 5: stage 5 ("CONNECT" / employ) needs room after it to play out its own reveal,
  // the same way every earlier stage transitions into the next one.
  const stageMotion = useTransform(scrollYProgress, [0, 1], [0, 6]);

  useEffect(() => {
    const unsub = stageMotion.on('change', (v) => {
      stageRef.current = v;
      const idx = Math.min(5, Math.max(0, Math.round(v)));
      setActiveStage((prev) => (prev === idx ? prev : idx));
    });
    return unsub;
  }, [stageMotion]);

  const copy = STAGE_COPY[activeStage];

  if (reduce) {
    // Reduced motion: no scroll-jacked camera — a calm, static stack, one stage at a time.
    return (
      <section className="net-section net-section--reduced" aria-label="The NCCT living network">
        <div className="net-static-head">
          <span className="eyebrow">One network. Many paths.</span>
          <h2>One future.</h2>
        </div>
        {STAGE_COPY.map((s, i) => (
          <div className="net-static-row" key={s.title}>
            <span className="net-static-idx">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="net-section" aria-label="The NCCT living network" ref={trackRef}>
      <div className="net-sticky">
        <div className="net-grid">
          <div className="net-copy">
            <span className="net-kicker">One network. Many paths. One future.</span>
            <motion.div key={activeStage} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
              <span className="eyebrow net-stage-eyebrow">{copy.eyebrow}</span>
              <h2>{copy.title}</h2>
              <p>{copy.body}</p>
            </motion.div>
            <ol className="net-stage-rail" aria-hidden>
              {STAGE_NAMES.map((n, i) => (
                <li key={i} className={i === activeStage ? 'is-active' : undefined}>{n}</li>
              ))}
            </ol>
          </div>
          <div className="net-stage3d">
            {webgl ? (
              <Suspense fallback={null}>
                <LivingNetwork stageRef={stageRef} reduced={false} bg="#F5F1E8" />
              </Suspense>
            ) : (
              <div className="net-fallback" role="img" aria-label="A network diagram connecting institutions, training, skills and employment">
                <svg viewBox="0 0 320 320" fill="none">
                  <circle cx="160" cy="160" r="90" stroke="#91B3A5" strokeWidth="1" opacity="0.5" />
                  <circle cx="160" cy="60" r="8" fill="#A9613B" />
                  <circle cx="250" cy="160" r="8" fill="#3E7C6A" />
                  <circle cx="160" cy="260" r="8" fill="#D4A04D" />
                  <circle cx="70" cy="160" r="8" fill="#7897A0" />
                  <path d="M160 60 L250 160 L160 260 L70 160 Z" stroke="#69716B" strokeWidth="1" opacity="0.4" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
