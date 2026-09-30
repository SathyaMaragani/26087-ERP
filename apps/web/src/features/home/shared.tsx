import type { ReactNode } from 'react';
import { ErrorState, LoadingBlock } from '../../ui/primitives';
import type { AsyncState } from '../../lib/useAsync';
import type { ModuleId } from '../../shell/modules';
import type { UserPersona } from '../../types';

export interface HomeProps {
  persona: UserPersona;
  onNavigate: (id: ModuleId) => void;
}

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const HONORIFICS = /^(dr|prof|professor|shri|sri|smt|mr|mrs|ms|er|adv)\.?$/i;
/** First given name, skipping honorifics and lone initials ("Dr. K. Srinivas" -> "Srinivas"). */
export const firstName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  const given = parts.find((w) => !HONORIFICS.test(w) && !/^[A-Za-z]\.$/.test(w));
  return given ?? parts[0] ?? full;
};

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Renders loading / error / content for one request without hiding failures. */
export function Async<T>({ state, children, label }: { state: AsyncState<T>; children: (data: T) => ReactNode; label?: string }) {
  if (state.loading && !state.data) return <LoadingBlock label={label ?? 'Loading'} />;
  if (state.error && !state.data) return <ErrorState detail={state.error} onRetry={state.reload} />;
  if (!state.data) return null;
  return <>{children(state.data)}</>;
}

export function Alert({ tone, children, action }: { tone: 'warn' | 'info' | 'ok'; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={`alert alert-${tone}`} role="status">
      <span className="alert-dot" aria-hidden />
      <span className="alert-text">{children}</span>
      {action}
    </div>
  );
}

export const statusTone = (s: string): 'teal' | 'green' | 'amber' | 'red' | 'indigo' | 'neutral' => {
  switch (s) {
    case 'ENROLLED': case 'APPROVED': case 'COMPLETED': case 'ISSUED': case 'OPEN': return 'green';
    case 'SUBMITTED': case 'UNDER_REVIEW': case 'UPCOMING': return 'amber';
    case 'WAITLISTED': case 'ONGOING': return 'teal';
    case 'REJECTED': case 'CANCELLED': case 'REVOKED': return 'red';
    default: return 'neutral';
  }
};
