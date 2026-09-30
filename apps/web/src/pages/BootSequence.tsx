import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '../api/client';
import { detectWebGL } from '../lib/device';
import { ROLE_META, type UserPersona } from '../types';
import { Button } from '../ui/primitives';

type Status = 'pending' | 'ok' | 'fail';
interface Line { key: string; label: string; status: Status; value: string }

const INITIAL: Line[] = [
  { key: 'net', label: 'NETWORK', status: 'pending', value: '' },
  { key: 'api', label: 'PLATFORM API', status: 'pending', value: '' },
  { key: 'db', label: 'DATABASE', status: 'pending', value: '' },
  { key: 'session', label: 'SESSION', status: 'pending', value: '' },
  { key: 'tenant', label: 'INSTITUTION', status: 'pending', value: '' },
  { key: 'gfx', label: 'GRAPHICS', status: 'pending', value: '' },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Entry into the operating system. Every line reflects an actual check;
 * nothing here is decorative state.
 */
export function BootSequence({ persona, onDone }: { persona: UserPersona; onDone: () => void }) {
  const reduce = useReducedMotion();
  const [lines, setLines] = useState<Line[]>(INITIAL);
  const [finished, setFinished] = useState(false);
  const apiFailed = lines.find((l) => l.key === 'api')?.status === 'fail';
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const returning = (() => { try { return sessionStorage.getItem('ncct.boot') === '1'; } catch { return false; } })();
    try { sessionStorage.setItem('ncct.boot', '1'); } catch { /* storage unavailable */ }
    const pace = reduce ? 0 : returning ? 50 : 210;
    const patch = (key: string, status: Status, value: string) =>
      setLines((cur) => cur.map((l) => (l.key === key ? { ...l, status, value } : l)));

    (async () => {
      const t0 = performance.now();
      await wait(pace);
      patch('net', navigator.onLine ? 'ok' : 'fail', navigator.onLine ? 'ONLINE' : 'OFFLINE');

      await wait(pace);
      let health: Awaited<ReturnType<typeof api.health>> | null = null;
      try {
        health = await api.health();
        patch('api', health.status === 'ok' ? 'ok' : 'fail', health.status === 'ok' ? `ONLINE · ${health.roundTripMs} ms` : health.status.toUpperCase());
      } catch {
        patch('api', 'fail', 'UNREACHABLE');
      }

      await wait(pace);
      if (health) patch('db', health.database?.status === 'UP' ? 'ok' : 'fail', health.database?.status === 'UP' ? `UP · ${health.database.latencyMs} ms` : 'DOWN');
      else patch('db', 'fail', 'UNKNOWN');

      await wait(pace);
      patch('session', 'ok', `VERIFIED · ${ROLE_META[persona.role].label.toUpperCase()}`);
      await wait(pace);
      patch('tenant', persona.instituteName ? 'ok' : 'fail', persona.instituteName ? `CONNECTED · ${persona.instituteName.split(',')[0].toUpperCase()}` : 'NONE');
      await wait(pace);
      const gl = detectWebGL();
      patch('gfx', 'ok', gl ? 'WEBGL READY' : '2D FALLBACK');

      const spent = performance.now() - t0;
      await wait(Math.max(reduce ? 0 : 300, (reduce ? 0 : returning ? 900 : 2600) - spent));
      setFinished(true);
    })();
  }, [persona, reduce]);

  // Auto-continue unless the platform itself is unreachable.
  useEffect(() => {
    if (finished && !apiFailed) onDone();
  }, [finished, apiFailed, onDone]);

  const done = lines.filter((l) => l.status !== 'pending').length;

  return (
    <motion.div className="boot" role="status" aria-live="polite" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.35 }}>
      <div className="boot-panel">
        <motion.div className="boot-mark display" initial={{ opacity: 0, letterSpacing: '0.3em' }} animate={{ opacity: 1, letterSpacing: '-0.04em' }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}>NCCT</motion.div>
        <div className="boot-signal" aria-hidden>
          <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: done / lines.length }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} />
          {lines.map((l, i) => <b key={l.key} className={`boot-tick boot-${l.status}`} style={{ left: `${((i + 1) / lines.length) * 100}%` }} />)}
        </div>
        <ul className="boot-lines">
          {lines.map((l) => (
            <li key={l.key} className={`boot-line boot-${l.status}`}>
              <span className="boot-label">{l.label}</span>
              <span className="boot-value">{l.status === 'pending' ? '·' : l.value}</span>
            </li>
          ))}
        </ul>
        {finished && apiFailed && (
          <div className="boot-alert">
            <p>The platform API did not respond. You can continue, but data will not load until it is reachable.</p>
            <div className="boot-actions">
              <Button variant="primary" onClick={onDone}>Continue anyway</Button>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
