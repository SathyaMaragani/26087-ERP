import { useMemo, useState } from 'react';
import { Building2, GraduationCap, Search, Users } from 'lucide-react';
import { api } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { loadTraineeProfile, useTraineePool } from '../lib/useTraineePool';
import type { UserPersona } from '../types';
import type { ModuleId } from '../shell/modules';
import { LearningIdentity } from '../features/people/LearningIdentity';
import { Drawer } from '../ui/Modal';
import { Badge, Button, EmptyState, ErrorState, LoadingBlock, PageHeader, Surface, Tabs } from '../ui/primitives';

const pretty = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const fullName = (t: any) => `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || t.traineeCode;
type Tab = 'trainees' | 'trainers' | 'institutions';

export function TraineesView({ persona, onNavigate }: { persona: UserPersona; onNavigate: (id: ModuleId) => void }) {
  const canSeeTrainers = persona.role !== 'TRAINER';
  const canSeeInstitutions = persona.role === 'NCCT_ADMIN' || persona.role === 'RICM_DIRECTOR';
  const tabs = [{ id: 'trainees' as Tab, label: 'Trainees' }, ...(canSeeTrainers ? [{ id: 'trainers' as Tab, label: 'Trainers' }] : []), ...(canSeeInstitutions ? [{ id: 'institutions' as Tab, label: 'Institutions' }] : [])];
  const [tab, setTab] = useState<Tab>('trainees');
  return (
    <>
      <PageHeader eyebrow="People & institutions" title={<>Every learner, <em className="serif-em">one identity</em></>}
        description="A longitudinal record from registration through training, skills, credentials and employment — plus the trainers and institutions behind it." />
      <Tabs label="People section" tabs={tabs} value={tab} onChange={setTab} />
      <div className="att-body">
        {tab === 'trainees' && <TraineesTab persona={persona} />}
        {tab === 'trainers' && <TrainersTab />}
        {tab === 'institutions' && <InstitutionsTab persona={persona} onNavigate={onNavigate} />}
      </div>
    </>
  );
}

function TraineesTab({ persona }: { persona: UserPersona }) {
  const list = useTraineePool(persona);
  const isAdmin = persona.role === 'NCCT_ADMIN';
  const [query, setQuery] = useState('');
  const [type, setType] = useState('ALL');
  const [open, setOpen] = useState<{ id: string; orgId: string } | null>(null);
  const types = useMemo(() => Array.from(new Set((list.data ?? []).map((p) => p.raw.traineeType))).sort(), [list.data]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list.data ?? []).filter((p) => (type === 'ALL' || p.raw.traineeType === type) && (!q || `${fullName(p.raw)} ${p.raw.traineeCode} ${p.raw.cooperativeName ?? ''} ${p.raw.district ?? ''} ${p.raw.state ?? ''} ${p.orgName}`.toLowerCase().includes(q)));
  }, [list.data, query, type]);

  return (
    <>
      <div className="toolbar">
        <div className="search-row grow"><Search size={16} aria-hidden /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, code, cooperative, district or institution" aria-label="Search trainees" /></div>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by trainee type" className="toolbar-select"><option value="ALL">All types</option>{types.map((t) => <option key={t} value={t}>{pretty(t)}</option>)}</select>
      </div>
      <Surface pad={false}>
        {list.loading && !list.data ? <LoadingBlock label="Loading trainees" /> : list.error ? <ErrorState detail={list.error} onRetry={list.reload} /> : rows.length === 0 ? (
          <EmptyState icon={<Users size={22} />} title={(list.data ?? []).length === 0 ? 'No trainees onboarded yet' : 'No trainees match'} detail={isAdmin && (list.data ?? []).length === 0 ? 'No institution has recorded a trainee yet.' : undefined} />
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Trainee</th><th>Type</th>{isAdmin && <th>Institution</th>}<th>Cooperative</th><th>Location</th><th>Skills</th><th>Credentials</th></tr></thead>
            <tbody>{rows.map((p) => { const t = p.raw; return (
              <tr key={`${p.orgId}-${p.id}`} className="row-link" tabIndex={0} onClick={() => setOpen({ id: p.id, orgId: p.orgId })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen({ id: p.id, orgId: p.orgId }); } }} aria-label={`Open learning identity of ${fullName(t)}`}>
                <td><div className="person"><span className="avatar avatar-sm" aria-hidden>{fullName(t).charAt(0)}</span><div><strong className="cell-strong">{fullName(t)}</strong><div className="cell-sub num">{t.traineeCode}</div></div></div></td>
                <td><Badge tone="indigo">{pretty(t.traineeType)}</Badge></td>
                {isAdmin && <td className="cell-sub">{p.orgName}</td>}
                <td>{t.cooperativeName ?? '—'}</td>
                <td>{[t.village, t.district, t.state].filter(Boolean).join(', ') || '—'}</td>
                <td className="num">{t.skills?.length ?? 0}</td>
                <td className="num">{t.certificates?.length ?? 0}</td>
              </tr>
            ); })}</tbody>
          </table></div>
        )}
      </Surface>
      <IdentityDrawer open={open} ownOrgId={persona.organizationId} onClose={() => setOpen(null)} />
    </>
  );
}

function IdentityDrawer({ open, ownOrgId, onClose }: { open: { id: string; orgId: string } | null; ownOrgId: string; onClose: () => void }) {
  const p = useAsync(() => (open ? loadTraineeProfile(open.orgId, ownOrgId, open.id) : Promise.resolve(null)), [open?.id, open?.orgId]);
  return (
    <Drawer open={!!open} onClose={onClose} title={p.data ? `${fullName(p.data)} — learning identity` : 'Learning identity'} width={780}>
      {p.loading ? <LoadingBlock label="Loading the learning record" /> : p.error ? <ErrorState detail={p.error} onRetry={p.reload} /> : p.data ? <LearningIdentity t={p.data} /> : null}
    </Drawer>
  );
}

function TrainersTab() {
  const list = useAsync(() => api.trainers.list(), []);
  if (list.loading && !list.data) return <LoadingBlock label="Loading trainers" />;
  if (list.error) return <ErrorState detail={list.error} onRetry={list.reload} />;
  if ((list.data ?? []).length === 0) return <Surface><EmptyState icon={<GraduationCap size={22} />} title="No trainers registered" /></Surface>;
  return (
    <div className="prog-grid">
      {(list.data ?? []).map((t: any) => (
        <article key={t.id} className="prog">
          <header><div className="prog-code num">{t.trainerCode}</div><Badge tone={t.status === 'ACTIVE' ? 'green' : 'neutral'} dot>{t.status}</Badge></header>
          <div className="person"><span className="avatar avatar-lg" aria-hidden>{(t.user?.firstName ?? 'T').charAt(0)}</span><div><h3>{t.user?.firstName} {t.user?.lastName}</h3><div className="cell-sub">{t.designation}</div></div></div>
          <p className="prog-desc">{t.bio ?? t.specialization}</p>
          <dl className="prog-facts">
            <div><dt>Specialisation</dt><dd>{t.specialization ?? '—'}</dd></div>
            <div><dt>Experience</dt><dd className="num">{t.experienceYears ?? '—'} yrs</dd></div>
            <div><dt>Batches</dt><dd className="num">{t._count?.batches ?? 0}</dd></div>
            <div><dt>Sessions</dt><dd className="num">{t._count?.sessions ?? 0}</dd></div>
          </dl>
          {t.qualifications && <div className="cell-sub">{t.qualifications}</div>}
        </article>
      ))}
    </div>
  );
}

function InstitutionsTab({ persona, onNavigate }: { persona: UserPersona; onNavigate: (id: ModuleId) => void }) {
  const isAdmin = persona.role === 'NCCT_ADMIN';
  const list = useAsync<any[]>(async () => (isAdmin ? api.organizations.list() : [{ id: persona.organizationId, name: persona.instituteName, institutionType: 'RICM' }]), [isAdmin]);
  if (list.loading && !list.data) return <LoadingBlock label="Loading institutions" />;
  if (list.error) return <ErrorState detail={list.error} onRetry={list.reload} />;
  return (
    <div className="prog-grid">
      {(list.data ?? []).map((o) => (
        <article key={o.id} className="prog">
          <header><div className="prog-code num">{pretty(o.institutionType ?? 'Institution')}</div>{o.state && <Badge>{o.state}</Badge>}</header>
          <div className="person"><span className="avatar avatar-lg" aria-hidden><Building2 size={22} /></span><div><h3>{o.name}</h3><div className="cell-sub">{[o.district, o.state].filter(Boolean).join(', ') || o.domain || '—'}</div></div></div>
          <dl className="prog-facts">
            <div><dt>Type</dt><dd>{pretty(o.institutionType ?? '—')}</dd></div>
            <div><dt>Domain</dt><dd>{o.domain ?? o.slug ?? '—'}</dd></div>
          </dl>
          <footer><span className="cell-sub">Drill into programmes and trainees</span><Button size="sm" onClick={() => onNavigate('ecosystem')}>Open in Ecosystem</Button></footer>
        </article>
      ))}
    </div>
  );
}
