import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

function useOverlayBehaviour(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) { e.preventDefault(); return; }
      const a = items[0], z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

interface OverlayProps { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number }

export function Modal({ open, onClose, title, children, width = 560 }: OverlayProps) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useOverlayBehaviour(open, onClose, panel);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div
            ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}
            className="modal" style={{ maxWidth: width }}
            initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="modal-head">
              <h2 id={id}>{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={16} /></button>
            </div>
            <div className="modal-body">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, children, width = 420 }: OverlayProps) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useOverlayBehaviour(open, onClose, panel);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="overlay overlay-drawer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.aside
            ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}
            className="drawer" style={{ width: `min(${width}px, 100vw)` }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          >
            <div className="modal-head">
              <h2 id={id}>{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close panel"><X size={16} /></button>
            </div>
            <div className="modal-body">{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
