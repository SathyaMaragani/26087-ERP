import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { modulesFor, type ModuleId } from './modules';
import { Mark } from '../ui/Wordmark';
import { Drawer } from '../ui/Modal';
import type { UserPersona } from '../types';

interface Props { persona: UserPersona; current: ModuleId; onNavigate: (id: ModuleId) => void }

/**
 * Contextual rail: quiet icons until hovered or focused, then it opens over the
 * content with lifecycle-grouped labels. On phones it becomes a bottom bar.
 */
export function Rail({ persona, current, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const mods = modulesFor(persona.role);

  // The rail leans toward the cursor: icons ease forward as the pointer approaches, like a physical instrument.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const near = e.clientX < 140;
        el.classList.toggle('rail--near', near);
        el.querySelectorAll<HTMLElement>('.rail-item').forEach((it) => {
          const r = it.getBoundingClientRect();
          const d = near ? Math.abs(e.clientY - (r.top + r.height / 2)) : 999;
          it.style.setProperty('--prox', String(Math.max(0, 1 - d / 96).toFixed(3)));
        });
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); };
  }, []);
  let lastGroup = '';

  return (
    <>
      <nav
        ref={navRef} className={`rail${open ? ' rail--open' : ''}`} aria-label="Modules"
        onPointerEnter={(e) => { if (e.pointerType !== 'touch') setOpen(true); }}
        onPointerLeave={() => setOpen(false)}
        onFocusCapture={() => setOpen(true)}
        onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}
      >
        <a className="rail-brand" href="#/" aria-label="NCCT overview"><Mark size={30} /></a>
        <ul className="rail-list">
          {mods.map((m, mi) => {
            const showGroup = m.group !== lastGroup && m.group !== 'Overview';
            lastGroup = m.group;
            const active = m.id === current;
            return (
              <li key={m.id}>
                {showGroup && <div className="rail-group" aria-hidden>{m.group}</div>}
                <a href={`#/app/${m.id}`} className={`rail-item${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}
                  onClick={(e) => { e.preventDefault(); onNavigate(m.id); }} title={open ? undefined : m.label}>
                  {active && <motion.span layoutId="rail-active" className="rail-active" transition={{ type: 'spring', stiffness: 520, damping: 42 }} />}
                  <span className="rail-idx" aria-hidden>{String(mi).padStart(2, '0')}</span>
                  <m.icon size={16} className="rail-icon" aria-hidden />
                  <span className="rail-label">{m.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
        <div className="rail-user" title={persona.name}>
          <span className="avatar" aria-hidden>{persona.name.charAt(0)}</span>
          <span className="rail-label rail-user-text"><strong>{persona.name}</strong><small>{persona.title}</small></span>
        </div>
      </nav>
      <MobileNav mods={mods} current={current} onNavigate={onNavigate} />
    </>
  );
}

function MobileNav({ mods, current, onNavigate }: { mods: ReturnType<typeof modulesFor>; current: ModuleId; onNavigate: (id: ModuleId) => void }) {
  const [more, setMore] = useState(false);
  const primary = mods.slice(0, 4);
  const rest = mods.slice(4);
  return (
    <>
      <nav className="bottom-nav" aria-label="Modules">
        {primary.map((m) => (
          <a key={m.id} href={`#/app/${m.id}`} className={`bottom-item${m.id === current ? ' is-active' : ''}`} aria-current={m.id === current ? 'page' : undefined}
            onClick={(e) => { e.preventDefault(); onNavigate(m.id); }}>
            <m.icon size={20} aria-hidden /><span>{m.label}</span>
          </a>
        ))}
        {rest.length > 0 && (
          <button className={`bottom-item${rest.some((m) => m.id === current) ? ' is-active' : ''}`} onClick={() => setMore(true)} aria-haspopup="dialog">
            <MoreHorizontal size={20} aria-hidden /><span>More</span>
          </button>
        )}
      </nav>
      <Drawer open={more} onClose={() => setMore(false)} title="All modules" width={360}>
        <ul className="more-list">
          {mods.map((m) => (
            <li key={m.id}>
              <a href={`#/app/${m.id}`} onClick={(e) => { e.preventDefault(); setMore(false); onNavigate(m.id); }} aria-current={m.id === current ? 'page' : undefined}>
                <m.icon size={18} aria-hidden /><div><strong>{m.label}</strong><small>{m.description}</small></div>
              </a>
            </li>
          ))}
        </ul>
      </Drawer>
    </>
  );
}
