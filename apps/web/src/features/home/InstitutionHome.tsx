import { api } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { CommandCenter } from '../../dashboard/CommandCenter';
import { RadialGauge } from '../../ui/charts';
import { Timeline } from '../../ui/charts';
import { Metric } from '../../ui/Metric';
import { Badge, Button, EmptyState, PageHeader, Surface } from '../../ui/primitives';
import { Alert, Async, firstName, fmtDate, greeting, statusTone, type HomeProps } from './shared';

export function InstitutionHome({ persona, onNavigate }: HomeProps) {
  const ops = useAsync(() => api.analytics.getInstitution(), []);
  const programmes = useAsync(() => api.programmes.list(), []);
  const hostel = useAsync(() => api.hostel.getOccupancy(), []);

  return (
    <>
      {/* Same spatial system as the national command center — same camera, same materials,
          same interactions — auto-focused into this director's own region/institution rather
          than the whole national map. Everything below is the same real operational data this
          page already showed; only the presentation above it changed. */}
      <CommandCenter persona={persona} onNavigate={onNavigate} embedded />
      <PageHeader eyebrow="Institution Command" title={<>{greeting()}, {firstName(persona.name)}</>} description={persona.instituteName} />
      <div className="home-grid">
        <div className="span-12">
          <Async state={ops} label="Reading today's operations">
            {(d) => {
              const k = d.kpis ?? {};
              return (
                <>
                  <div className="alerts">
                    {k.pendingNominations > 0 && <Alert tone="warn" action={<Button size="sm" onClick={() => onNavigate('nominations')}>Review</Button>}>{k.pendingNominations} nomination{k.pendingNominations === 1 ? '' : 's'} awaiting a decision</Alert>}
                    {k.attendanceRatePercent > 0 && k.attendanceRatePercent < 75 && <Alert tone="warn">Attendance is at {k.attendanceRatePercent}%, below the 75% expectation</Alert>}
                    {k.hostelOccupancyPercent >= 90 && <Alert tone="warn" action={<Button size="sm" onClick={() => onNavigate('hostel-logistics')}>Open hostel</Button>}>Hostel is {k.hostelOccupancyPercent}% occupied</Alert>}
                    {k.completedProgrammes > 0 && <Alert tone="ok">{k.completedProgrammes} programme{k.completedProgrammes === 1 ? '' : 's'} completed</Alert>}
                    {!(k.pendingNominations > 0) && !(k.completedProgrammes > 0) && !(k.hostelOccupancyPercent >= 90) && <Alert tone="info">Nothing needs your attention right now.</Alert>}
                  </div>
                  <div className="kpi-row">
                    <Metric label="Active programmes" value={k.activeProgrammes ?? 0} tone="copper" />
                    <Metric label="Trainees enrolled" value={k.traineesEnrolled ?? 0} tone="teal" />
                    <Metric label="Sessions today" value={k.sessionsToday ?? 0} tone="indigo" />
                    <Metric label="Pending nominations" value={k.pendingNominations ?? 0} tone="amber" />
                  </div>
                </>
              );
            }}
          </Async>
        </div>

        <div className="span-4">
          <Surface eyebrow="Attendance" title="Across sessions">
            <Async state={ops}>{(d) => d.kpis?.attendanceRatePercent == null ? <EmptyState title="No attendance marked yet" detail="A rate appears once sessions are recorded for this institution." /> : <div className="center"><RadialGauge label="Attendance rate" value={d.kpis.attendanceRatePercent} tone="teal" size={156} /></div>}</Async>
          </Surface>
        </div>
        <div className="span-4">
          <Surface eyebrow="Campus" title="Hostel occupancy">
            <Async state={hostel}>
              {(h) => h.totalBeds === 0 ? <EmptyState title="No hostel configured" detail="Add a hostel and rooms to track occupancy." action={<Button size="sm" onClick={() => onNavigate('hostel-logistics')}>Open hostel</Button>} /> : (
                <div className="center">
                  <RadialGauge label="Beds occupied" value={h.occupancyRatePercent} tone="copper" size={156} sub={`${h.occupiedBeds} of ${h.totalBeds} beds · ${h.totalRooms} rooms`} />
                </div>
              )}
            </Async>
          </Surface>
        </div>
        <div className="span-4">
          <Surface eyebrow="Programme calendar" title="What's coming">
            <Async state={programmes}>
              {(list) => list.length === 0 ? <EmptyState title="No programmes scheduled" action={<Button size="sm" onClick={() => onNavigate('programmes')}>Create a programme</Button>} /> : (
                <Timeline items={[...list].sort((a: any, b: any) => +new Date(a.startDate) - +new Date(b.startDate)).slice(0, 5).map((p: any) => ({ time: fmtDate(p.startDate), title: p.title, detail: `${p.location} · ${p.status}`, tone: p.status === 'ONGOING' ? 'teal' : 'copper' }))} />
              )}
            </Async>
          </Surface>
        </div>

        <div className="span-12">
          <Surface eyebrow="Programmes" title="Capacity and enrolment" action={<Button size="sm" onClick={() => onNavigate('programmes')}>Manage</Button>} pad={false}>
            <Async state={programmes}>
              {(list) => list.length === 0 ? <div className="surface-body"><EmptyState title="Nothing here yet" /></div> : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Programme</th><th>Dates</th><th>Status</th><th>Registrations</th><th>Certificates</th></tr></thead>
                    <tbody>
                      {list.map((p: any) => {
                        const reg = p._count?.registrations ?? 0;
                        const pct = p.capacity ? Math.min(100, Math.round((reg / p.capacity) * 100)) : 0;
                        return (
                          <tr key={p.id}>
                            <td><strong className="cell-strong">{p.title}</strong><div className="cell-sub">{p.code}</div></td>
                            <td className="num">{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</td>
                            <td><Badge tone={statusTone(p.status)} dot>{p.status}</Badge></td>
                            <td><div className="mini-bar"><i style={{ width: `${pct}%` }} /></div><span className="cell-sub num">{reg} / {p.capacity}</span></td>
                            <td className="num">{p._count?.certificates ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Async>
          </Surface>
        </div>
      </div>
    </>
  );
}
