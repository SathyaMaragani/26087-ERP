import { BookOpen, Clock, QrCode } from 'lucide-react';
import { api } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { Metric } from '../../ui/Metric';
import { Badge, Button, EmptyState, PageHeader, Surface } from '../../ui/primitives';
import { Async, firstName, fmtDate, greeting, todayISO, type HomeProps } from './shared';

export function TrainerHome({ persona, onNavigate }: HomeProps) {
  const sessions = useAsync(() => api.timetable.getSessions(), []);
  const today = todayISO();

  return (
    <>
      <PageHeader eyebrow="Teaching Workspace" title={<>{greeting()}, {firstName(persona.name)}</>} description="Your sessions, attendance and course material."
        actions={<>
          <Button icon={<BookOpen size={15} />} onClick={() => onNavigate('lms')}>Open course</Button>
          <Button variant="primary" icon={<QrCode size={15} />} onClick={() => onNavigate('attendance')}>Mark attendance</Button>
        </>} />
      <Async state={sessions} label="Loading your sessions">
        {(all) => {
          const dayOf = (s: any) => String(s.sessionDate).slice(0, 10);
          const todays = all.filter((s: any) => dayOf(s) === today).sort((a: any, b: any) => String(a.startTime).localeCompare(String(b.startTime)));
          const upcoming = all.filter((s: any) => dayOf(s) > today).sort((a: any, b: any) => dayOf(a).localeCompare(dayOf(b)) || String(a.startTime).localeCompare(String(b.startTime))).slice(0, 6);
          return (
            <div className="home-grid">
              <div className="span-12">
                <div className="kpi-row">
                  <Metric label="Sessions today" value={todays.length} tone="copper" />
                  <Metric label="Upcoming" value={upcoming.length} tone="teal" hint="Next six shown below" />
                  <Metric label="Total scheduled" value={all.length} tone="indigo" />
                </div>
              </div>

              <div className="span-7">
                <Surface eyebrow="Today" title="Your sessions" pad={false}>
                  {todays.length === 0 ? <div className="surface-body"><EmptyState icon={<Clock size={22} />} title="No sessions today" detail="Enjoy the space — or prepare for what's next." /></div> : (
                    <ol className="agenda">
                      {todays.map((s: any) => (
                        <li key={s.id}>
                          <div className="agenda-time num">{s.startTime}<small>{s.endTime}</small></div>
                          <div className="agenda-body">
                            <strong>{s.topic || s.batch?.programme?.title || 'Session'}</strong>
                            <span className="cell-sub">{s.batch?.programme?.title} · {s.batch?.name} · Room {s.room}</span>
                          </div>
                          <Button size="sm" variant="primary" icon={<QrCode size={14} />} onClick={() => onNavigate('attendance')}>Start QR</Button>
                        </li>
                      ))}
                    </ol>
                  )}
                </Surface>
              </div>

              <div className="span-5">
                <Surface eyebrow="Ahead" title="Upcoming">
                  {upcoming.length === 0 ? <EmptyState title="Nothing scheduled ahead" /> : (
                    <ul className="rows rows-flush">
                      {upcoming.map((s: any) => (
                        <li key={s.id}>
                          <div><strong className="cell-strong">{s.topic || s.batch?.programme?.title || 'Session'}</strong><div className="cell-sub">Room {s.room}</div></div>
                          <Badge tone="indigo">{fmtDate(s.sessionDate)}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Surface>
              </div>
            </div>
          );
        }}
      </Async>
    </>
  );
}
