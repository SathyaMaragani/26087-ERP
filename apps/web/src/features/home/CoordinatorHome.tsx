import { CalendarPlus, ClipboardCheck, Clock, Layers } from 'lucide-react';
import { api } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { Funnel } from '../../ui/charts';
import { Metric } from '../../ui/Metric';
import { Badge, Button, EmptyState, PageHeader, Surface } from '../../ui/primitives';
import { Async, firstName, fmtDate, greeting, statusTone, todayISO, type HomeProps } from './shared';

export function CoordinatorHome({ persona, onNavigate }: HomeProps) {
  const noms = useAsync(() => api.nominations.list(), []);
  const programmes = useAsync(() => api.programmes.list(), []);
  const today = useAsync(() => api.timetable.getSessions(todayISO()), []);

  return (
    <>
      <PageHeader eyebrow="Operations Cockpit" title={<>{greeting()}, {firstName(persona.name)}</>} description={persona.instituteName}
        actions={<>
          <Button icon={<ClipboardCheck size={15} />} onClick={() => onNavigate('nominations')}>Review applications</Button>
          <Button icon={<Layers size={15} />} onClick={() => onNavigate('programmes')}>Create batch</Button>
          <Button variant="primary" icon={<CalendarPlus size={15} />} onClick={() => onNavigate('timetable')}>Schedule session</Button>
        </>} />

      <div className="home-grid">
        <div className="span-12">
          <Async state={noms} label="Reading applications">
            {(list) => {
              const c = (...s: string[]) => list.filter((n: any) => s.includes(n.status)).length;
              return (
                <div className="kpi-row">
                  <Metric label="Applications" value={list.length} tone="copper" />
                  <Metric label="Awaiting review" value={c('SUBMITTED', 'UNDER_REVIEW')} tone="amber" hint={c('SUBMITTED', 'UNDER_REVIEW') ? 'Needs a decision' : 'Queue is clear'} />
                  <Metric label="Approved / enrolled" value={c('APPROVED', 'ENROLLED')} tone="teal" />
                  <Metric label="Waitlisted" value={c('WAITLISTED')} tone="indigo" />
                </div>
              );
            }}
          </Async>
        </div>

        <div className="span-5">
          <Surface eyebrow="Programme lifecycle" title="Application funnel">
            <Async state={noms}>
              {(list) => list.length === 0 ? <EmptyState title="No applications yet" detail="Self-registrations and institutional nominations will appear here." /> : (
                <Funnel stages={[
                  { label: 'Submitted', value: list.length },
                  { label: 'Approved or enrolled', value: list.filter((n: any) => ['APPROVED', 'ENROLLED'].includes(n.status)).length },
                  { label: 'Enrolled in a batch', value: list.filter((n: any) => n.status === 'ENROLLED').length },
                ]} />
              )}
            </Async>
          </Surface>
        </div>

        <div className="span-7">
          <Surface eyebrow="Needs a decision" title="Review queue" action={<Button size="sm" onClick={() => onNavigate('nominations')}>Open all</Button>} pad={false}>
            <Async state={noms}>
              {(list) => {
                const queue = list.filter((n: any) => ['SUBMITTED', 'UNDER_REVIEW'].includes(n.status)).slice(0, 6);
                return queue.length === 0 ? <div className="surface-body"><EmptyState title="Nothing waiting" detail="Every application has a decision." /></div> : (
                  <ul className="rows">
                    {queue.map((n: any) => (
                      <li key={n.id}>
                        <div>
                          <strong className="cell-strong">{n.trainee?.user ? `${n.trainee.user.firstName} ${n.trainee.user.lastName}` : n.trainee?.traineeCode ?? 'Trainee'}</strong>
                          <div className="cell-sub">{n.programme?.title ?? 'Programme'} · {n.nominationType === 'SELF' ? 'Self-registered' : 'Nominated'}</div>
                        </div>
                        <Badge tone={statusTone(n.status)} dot>{n.status.replace('_', ' ')}</Badge>
                      </li>
                    ))}
                  </ul>
                );
              }}
            </Async>
          </Surface>
        </div>

        <div className="span-6">
          <Surface eyebrow="Capacity" title="Programmes">
            <Async state={programmes}>
              {(list) => list.length === 0 ? <EmptyState title="No programmes yet" action={<Button size="sm" onClick={() => onNavigate('programmes')}>Create one</Button>} /> : (
                <ul className="cap-list">
                  {list.map((p: any) => {
                    const reg = p._count?.registrations ?? 0;
                    const remaining = Math.max(0, (p.capacity ?? 0) - reg);
                    return (
                      <li key={p.id}>
                        <div className="cap-head"><strong className="cell-strong">{p.title}</strong><span className="cell-sub num">{fmtDate(p.startDate)}</span></div>
                        <div className="mini-bar"><i style={{ width: `${p.capacity ? Math.min(100, (reg / p.capacity) * 100) : 0}%` }} /></div>
                        <div className="cell-sub num">{reg} registered · {remaining} seats remaining of {p.capacity}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Async>
          </Surface>
        </div>

        <div className="span-6">
          <Surface eyebrow="Today" title="Sessions" action={<Button size="sm" onClick={() => onNavigate('timetable')}>Timetable</Button>}>
            <Async state={today}>
              {(list) => list.length === 0 ? <EmptyState icon={<Clock size={22} />} title="No sessions today" detail="Schedule one from the timetable; conflicts are checked automatically." /> : (
                <ul className="rows rows-flush">
                  {list.map((s: any) => (
                    <li key={s.id}>
                      <div><strong className="cell-strong">{s.topic || s.batch?.programme?.title || 'Session'}</strong><div className="cell-sub">Room {s.room} · {s.batch?.name ?? ''}</div></div>
                      <span className="num cell-sub">{s.startTime}–{s.endTime}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Async>
          </Surface>
        </div>
      </div>
    </>
  );
}
