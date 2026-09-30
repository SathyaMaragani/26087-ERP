import { useMemo, useState } from 'react';
import { CAPABILITIES, STATUS_LABEL, type CapabilityStatus } from '../../shell/capabilities';
import type { ModuleId } from '../../shell/modules';
import { Badge, Surface } from '../../ui/primitives';

const TONE = { complete: 'green', partial: 'amber', gap: 'red' } as const;

/** Requirement traceability, live: what each official deliverable maps to, and how real it is today. */
export function CapabilityMatrix({ onNavigate }: { onNavigate: (id: ModuleId) => void }) {
  const [filter, setFilter] = useState<'all' | CapabilityStatus>('all');
  const counts = useMemo(() => ({ complete: CAPABILITIES.filter((c) => c.status === 'complete').length, partial: CAPABILITIES.filter((c) => c.status === 'partial').length, gap: CAPABILITIES.filter((c) => c.status === 'gap').length }), []);
  const rows = CAPABILITIES.filter((c) => filter === 'all' || c.status === filter);
  const total = CAPABILITIES.length;

  return (
    <div className="matrix">
      <div className="matrix-summary">
        <div className="matrix-bar" role="img" aria-label={`${counts.complete} complete, ${counts.partial} partial, ${counts.gap} backend gaps, of ${total}`}>
          <i className="st-complete" style={{ flex: counts.complete }} /><i className="st-partial" style={{ flex: counts.partial }} /><i className="st-gap" style={{ flex: counts.gap }} />
        </div>
        <div className="filter-row" role="group" aria-label="Filter by status">
          {([['all', `All ${total}`], ['complete', `Complete ${counts.complete}`], ['partial', `Partial ${counts.partial}`], ['gap', `Backend gap ${counts.gap}`]] as const).map(([id, label]) => (
            <button key={id} className={`filter-chip${filter === id ? ' is-active' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
      </div>
      <Surface pad={false}>
        <div className="table-wrap">
          <table className="matrix-table">
            <thead><tr><th>Ref</th><th>Requirement</th><th>Screen</th><th>Component</th><th>Backend / API</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={`${c.ref}-${c.name}`}>
                  <td className="num"><strong>{c.ref}</strong></td>
                  <td><strong className="cell-strong">{c.name}</strong><div className="cell-sub matrix-note">{c.note}</div></td>
                  <td><button className="link-btn" onClick={() => onNavigate(c.module)}>{c.screen}</button></td>
                  <td className="cell-sub">{c.component}</td>
                  <td className="cell-sub num">{c.api}</td>
                  <td><Badge tone={TONE[c.status]} dot>{STATUS_LABEL[c.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );
}
