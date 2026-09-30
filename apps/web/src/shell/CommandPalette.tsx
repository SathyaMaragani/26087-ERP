import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, LogOut, Search, ShieldCheck, Wifi } from 'lucide-react';
import { api } from '../api/client';
import { commandCenterStore, type CommandCenterHandle } from '../dashboard/commandCenterStore';
import { modulesFor, type ModuleId } from './modules';
import type { UserPersona } from '../types';

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  persona: UserPersona;
  onNavigate: (id: ModuleId) => void;
  onVerify: () => void;
  onToggleOffline: () => void;
  onLogout: () => void;
}

/** Records the current role may search. Loaded lazily, only when the palette opens. */
async function loadRecords(role: UserPersona['role']) {
  const can = (roles: string[]) => roles.includes(role);
  const settle = async <T,>(cond: boolean, p: () => Promise<T[]>): Promise<T[]> => (cond ? p().catch(() => []) : []);
  const [programmes, trainees, jobs, certs] = await Promise.all([
    settle(can(['NCCT_ADMIN', 'RICM_DIRECTOR', 'RICM_COORDINATOR']), () => api.programmes.list()),
    settle(can(['NCCT_ADMIN', 'RICM_DIRECTOR', 'RICM_COORDINATOR', 'TRAINER']), () => api.trainees.list()),
    settle(can(['NCCT_ADMIN', 'RICM_DIRECTOR', 'RECRUITER', 'TRAINEE']), () => api.employment.getJobs()),
    settle(can(['NCCT_ADMIN', 'RICM_DIRECTOR', 'RICM_COORDINATOR', 'TRAINER']), () => api.certifications.list()),
  ]);
  return { programmes, trainees, jobs, certs };
}

/**
 * Runs an action against the live CommandCenter (the 3D national command center, mounted only
 * while the 'home' module is on screen). If it isn't mounted right now, navigates there first and
 * waits (briefly) for it to register itself — rather than silently failing or acting on a stale
 * reference, since the palette and the 3D scene live in unrelated parts of the component tree.
 */
async function runOnCommandCenter(onNavigate: (id: ModuleId) => void, fn: (h: CommandCenterHandle) => void) {
  if (!commandCenterStore.current) {
    onNavigate('home');
    for (let i = 0; i < 40 && !commandCenterStore.current; i++) await new Promise((r) => setTimeout(r, 50));
  }
  if (commandCenterStore.current) fn(commandCenterStore.current);
}

export function CommandPalette({ open, onClose, persona, onNavigate, onVerify, onToggleOffline, onLogout }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [records, setRecords] = useState<Awaited<ReturnType<typeof loadRecords>> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    setQuery(''); setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    let live = true;
    loadRecords(persona.role).then((r) => { if (live) setRecords(r); });
    return () => { live = false; };
  }, [open, persona.role]);

  const items = useMemo<Item[]>(() => {
    const go = (id: ModuleId) => () => { onClose(); onNavigate(id); };
    const list: Item[] = modulesFor(persona.role).map((m) => ({
      id: `nav-${m.id}`, group: 'Go to', label: m.label, hint: m.description, icon: <m.icon size={16} />, run: go(m.id),
    }));
    list.push(
      { id: 'act-verify', group: 'Actions', label: 'Verify a certificate', hint: 'Public verification', icon: <ShieldCheck size={16} />, run: () => { onClose(); onVerify(); } },
      { id: 'act-offline', group: 'Actions', label: 'Toggle rural offline simulation', hint: 'Queue lesson progress locally', icon: <Wifi size={16} />, run: () => { onClose(); onToggleOffline(); } },
      { id: 'act-logout', group: 'Actions', label: 'Sign out', icon: <LogOut size={16} />, run: () => { onClose(); onLogout(); } },
    );
    // Only NCCT_ADMIN's Home is the 3D command center today — these commands would silently do
    // nothing for any other persona, so they're only offered where they're genuinely functional.
    if (persona.role === 'NCCT_ADMIN') {
      const cc = (label: string, hint: string, fn: (h: CommandCenterHandle) => void) => ({
        id: `cc-${label}`, group: 'National command center', label, hint, icon: <Search size={16} />,
        run: () => { onClose(); runOnCommandCenter(onNavigate, fn); },
      });
      list.push(
        cc('Focus India', 'Return to the national view', (h) => h.focusNational()),
        cc('National network pulse', 'Run the national activation sequence', (h) => h.runPulse()),
        cc('Show institutions', 'Enable the institutions layer', (h) => h.setLayer('institutions', true)),
        cc('Show training routes', 'Enable the training layer', (h) => h.setLayer('training', true)),
        cc('Show learning activity', 'Enable the learning layer', (h) => h.setLayer('learning', true)),
        cc('Show credentials', 'Enable the credentials layer', (h) => h.setLayer('credentials', true)),
        cc('Show employment', 'Enable the employment layer', (h) => h.setLayer('employment', true)),
        cc('Return to national', 'Back out of region/institution focus', (h) => h.returnToNational()),
      );
      if (commandCenterStore.current?.hasCredentialInView) {
        list.push(cc('Verify credential in view', 'Calls the real NCCT registry lookup', (h) => h.verifyCredentialInView()));
      }
      (commandCenterStore.current?.regions ?? []).forEach((r) => list.push(cc(`Focus region: ${r}`, 'Regional command center', (h) => h.focusRegion(r))));
      (commandCenterStore.current?.institutions ?? []).forEach((i) => list.push(cc(`Focus institution: ${i.name}`, 'Institution focus', (h) => h.focusInstitution(i.id))));
    }
    if (records) {
      records.programmes.forEach((p: any) => list.push({ id: `p-${p.id}`, group: 'Programmes', label: p.title, hint: p.code, run: go('programmes') }));
      records.trainees.forEach((t: any) => list.push({ id: `t-${t.id}`, group: 'Trainees', label: `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || t.traineeCode, hint: t.traineeCode, run: go('trainees') }));
      records.jobs.forEach((j: any) => list.push({ id: `j-${j.id}`, group: 'Jobs', label: j.title, hint: j.employer?.companyName ?? j.location, run: go('employment') }));
      records.certs.forEach((c: any) => list.push({ id: `c-${c.id}`, group: 'Certificates', label: c.title, hint: c.certificateNumber, run: go('certificates') }));
    }
    return list;
  }, [persona.role, records, onClose, onNavigate, onVerify, onToggleOffline, onLogout]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.filter((i) => i.group === 'Go to' || i.group === 'Actions');
    return items.filter((i) => `${i.label} ${i.hint ?? ''} ${i.group}`.toLowerCase().includes(q)).slice(0, 40);
  }, [items, query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[active]?.run(); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  let lastGroup = '';
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="overlay overlay-top" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div className="palette" role="dialog" aria-modal="true" aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ type: 'spring', stiffness: 460, damping: 34 }}>
            <div className="palette-input">
              <Search size={17} aria-hidden />
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey} placeholder="Search programmes, trainees, jobs, certificates — or jump to a module"
                role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined} aria-autocomplete="list" />
              <kbd>Esc</kbd>
            </div>
            <ul id={listId} role="listbox" className="palette-list" aria-label="Results">
              {filtered.length === 0 && <li className="palette-empty" role="presentation">No matches{records ? '' : ' yet — still loading records'}.</li>}
              {filtered.map((it, i) => {
                const head = it.group !== lastGroup ? ((lastGroup = it.group), <li key={`g-${it.group}`} role="presentation" className="palette-group">{it.group}</li>) : null;
                return [
                  head,
                  <li key={it.id} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={`palette-item${i === active ? ' is-active' : ''}`} onMouseMove={() => setActive(i)} onClick={it.run}>
                    <span className="palette-icon" aria-hidden>{it.icon ?? <Search size={16} />}</span>
                    <span className="palette-label">{it.label}</span>
                    {it.hint && <span className="palette-hint">{it.hint}</span>}
                    {i === active && <CornerDownLeft size={14} className="palette-enter" aria-hidden />}
                  </li>,
                ];
              })}
            </ul>
            <div className="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
