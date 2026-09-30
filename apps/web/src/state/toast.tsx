import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'warning' | 'info';
interface ToastItem { id: number; kind: ToastKind; title: string; detail?: string }

interface ToastApi {
  push: (kind: ToastKind, title: string, detail?: string) => void;
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  warning: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info } as const;
// Errors are priority events: they linger longer than confirmations.
const LIFETIME: Record<ToastKind, number> = { success: 4200, info: 4200, warning: 6500, error: 8000 };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((cur) => cur.filter((t) => t.id !== id)), []);

  const push = useCallback((kind: ToastKind, title: string, detail?: string) => {
    const id = ++seq.current;
    setItems((cur) => [...cur.slice(-3), { id, kind, title, detail }]);
    window.setTimeout(() => dismiss(id), LIFETIME[kind]);
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({
    push,
    success: (t, d) => push('success', t, d),
    error: (t, d) => push('error', t, d),
    warning: (t, d) => push('warning', t, d),
    info: (t, d) => push('info', t, d),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications" aria-live="polite">
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const Icon = ICONS[t.kind];
            return (
              <motion.div
                key={t.id}
                layout
                className={`toast toast-${t.kind}`}
                role={t.kind === 'error' ? 'alert' : 'status'}
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              >
                <Icon size={18} className="toast-icon" aria-hidden />
                <div className="toast-body">
                  <div className="toast-title">{t.title}</div>
                  {t.detail && <div className="toast-detail">{t.detail}</div>}
                </div>
                <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
