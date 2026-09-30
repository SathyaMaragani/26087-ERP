import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { api } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { CAPABILITIES, type CapabilityStatus } from '../../shell/capabilities';
import type { ModuleId } from '../../shell/modules';

interface NodeDef { id: string; title: string; sub: string; refs: string[]; module?: ModuleId }

const NODES: NodeDef[] = [
  { id: 'users', title: 'USERS', sub: '6 roles', refs: [] },
  { id: 'web', title: 'WEB / MOBILE', sub: 'Responsive · installable', refs: ['M'] },
  { id: 'erp', title: 'ERP', sub: 'Programmes · nominations · timetable · hostel', refs: ['A', 'B', 'E', 'F'], module: 'programmes' },
  { id: 'lms', title: 'LMS', sub: 'EN · हिंदी · తెలుగు · offline', refs: ['C', 'N'], module: 'lms' },
  { id: 'att', title: 'ATTENDANCE', sub: 'QR · face (planned)', refs: ['D'], module: 'attendance' },
  { id: 'ana', title: 'ANALYTICS', sub: 'National & institutional', refs: ['P', 'O'], module: 'analytics' },
  { id: 'cert', title: 'CERTIFICATION', sub: 'Credentials · skills · verify', refs: ['H', 'I'], module: 'certificates' },
  { id: 'emp', title: 'EMPLOYMENT', sub: 'Jobs · matching · career', refs: ['J', 'K', 'L'], module: 'employment' },
];

const W = 124, GAP = 18, X0 = 8, Y = 46, H = 118;
const cx = (i: number) => X0 + i * (W + GAP) + W / 2;

function statusOf(refs: string[]): { status: CapabilityStatus; done: number; total: number } {
  const rows = CAPABILITIES.filter((c) => refs.includes(c.ref));
  const done = rows.filter((r) => r.status === 'complete').length;
  const status: CapabilityStatus = rows.some((r) => r.status === 'gap') ? 'gap' : rows.some((r) => r.status === 'partial') ? 'partial' : 'complete';
  return { status, done, total: rows.length };
}

const TECH = [
  { title: 'QR technology', state: 'Active', tone: 'on' },
  { title: 'Face recognition', state: 'Not connected', tone: 'off' },
  { title: 'Mobile devices', state: 'Supported', tone: 'on' },
  { title: 'IndexedDB offline store', state: 'Active', tone: 'on' },
];

/** Users → web/mobile → ERP → LMS → attendance → analytics → certification → employment, on one spine. */
export function ArchitectureDiagram({ onNavigate }: { onNavigate: (id: ModuleId) => void }) {
  const reduce = useReducedMotion();
  const health = useAsync(() => api.health(), []);
  const totalW = X0 * 2 + NODES.length * W + (NODES.length - 1) * GAP;
  const spine = useMemo(() => `M ${cx(0)} ${Y + H / 2} L ${cx(NODES.length - 1)} ${Y + H / 2}`, []);
  const apiOk = health.data?.status === 'ok';
  const dbOk = health.data?.database?.status === 'UP';

  return (
    <div className="arch">
      <svg viewBox={`0 0 ${totalW} 420`} role="img" aria-label="System architecture: users, web and mobile, ERP, LMS, attendance, analytics, certification and employment, all served by one API and database.">
        <defs>
          <linearGradient id="spine" x1="0" x2="1"><stop offset="0" stopColor="var(--accent-primary)" /><stop offset="1" stopColor="var(--accent-secondary)" /></linearGradient>
        </defs>

        {/* spine */}
        <path d={spine} stroke="url(#spine)" strokeWidth="1.5" strokeOpacity="0.55" fill="none" />
        {NODES.slice(0, -1).map((_, i) => <path key={i} d={`M ${cx(i) + W / 2 + 2} ${Y + H / 2} l ${GAP - 4} 0`} stroke="var(--accent-secondary)" strokeWidth="3" strokeOpacity="0.9" />)}

        {/* flowing information (passes behind the nodes) */}
        {!reduce && [0, 1.1, 2.2, 3.3].map((d, k) => (
          <circle key={k} r="3.4" className="arch-packet"><animateMotion dur="7s" begin={`${d}s`} repeatCount="indefinite" path={spine} /></circle>
        ))}

        {/* drops to the API layer */}
        {NODES.map((n, i) => <path key={n.id} d={`M ${cx(i)} ${Y + H} L ${cx(i)} 226`} stroke="var(--border-strong)" strokeDasharray="3 4" fill="none" />)}

        {/* nodes */}
        {NODES.map((n, i) => {
          const st = statusOf(n.refs);
          const clickable = !!n.module;
          return (
            <g key={n.id} className={`arch-node st-${n.refs.length ? st.status : 'complete'}${clickable ? ' is-link' : ''}`} transform={`translate(${X0 + i * (W + GAP)} ${Y})`}
              role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined} aria-label={`${n.title}: ${n.sub}${n.refs.length ? `, ${st.done} of ${st.total} capabilities complete` : ''}`}
              onClick={() => n.module && onNavigate(n.module)} onKeyDown={(e) => { if (clickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onNavigate(n.module!); } }}>
              <rect width={W} height={H} rx="16" />
              <text x={W / 2} y="36" className="arch-title">{n.title}</text>
              <foreignObject x="8" y="46" width={W - 16} height="46"><div className="arch-sub">{n.sub}</div></foreignObject>
              {n.refs.length > 0 && (<><circle cx="18" cy={H - 16} r="4" className="arch-dot" /><text x="30" y={H - 12} className="arch-meta">{st.done}/{st.total} complete</text></>)}
            </g>
          );
        })}

        {/* API + data */}
        <g transform={`translate(${X0} 226)`}>
          <rect width={totalW - X0 * 2} height="46" rx="12" className="arch-band" />
          <text x="18" y="28" className="arch-band-title">NestJS API · JWT + refresh rotation · RBAC · tenant isolation · audit</text>
          <text x={totalW - X0 * 2 - 18} y="28" textAnchor="end" className={`arch-live ${apiOk ? 'ok' : health.loading ? '' : 'bad'}`}>{health.loading ? 'checking…' : apiOk ? `ONLINE · ${health.data?.roundTripMs} ms` : 'UNREACHABLE'}</text>
        </g>
        <g transform={`translate(${X0} 286)`}>
          <rect width={totalW - X0 * 2} height="46" rx="12" className="arch-band" />
          <text x="18" y="28" className="arch-band-title">PostgreSQL · one centralised, multi-tenant database</text>
          <text x={totalW - X0 * 2 - 18} y="28" textAnchor="end" className={`arch-live ${dbOk ? 'ok' : health.loading ? '' : 'bad'}`}>{health.loading ? 'checking…' : dbOk ? `UP · ${health.data?.database.latencyMs} ms` : 'DOWN'}</text>
        </g>

        {/* hardware / technology */}
        {TECH.map((t, i) => (
          <g key={t.title} transform={`translate(${X0 + i * ((totalW - X0 * 2) / TECH.length)} 356)`}>
            <rect width={(totalW - X0 * 2) / TECH.length - 12} height="46" rx="12" className={`arch-tech ${t.tone}`} />
            <text x="16" y="21" className="arch-tech-title">{t.title}</text>
            <text x="16" y="37" className="arch-tech-state">{t.state}</text>
          </g>
        ))}
      </svg>
      <ul className="arch-legend" aria-label="Legend">
        <li><i className="st-complete" /> Complete</li><li><i className="st-partial" /> Partial</li><li><i className="st-gap" /> Backend gap</li>
      </ul>
    </div>
  );
}
