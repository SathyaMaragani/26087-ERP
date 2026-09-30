import { Award, BookOpenCheck, Briefcase, Compass, GraduationCap, Sprout, UserRound } from 'lucide-react';
import { IdentityPath } from '../people/LearningIdentity';
import { api } from '../../api/client';
import { useAsync } from '../../lib/useAsync';
import { RadialGauge } from '../../ui/charts';
import { Badge, Button, EmptyState, PageHeader, Surface } from '../../ui/primitives';
import { Async, firstName, fmtDate, greeting, statusTone, type HomeProps } from './shared';

const LEVEL_MAX = 3;

export function TraineeHome({ persona, onNavigate }: HomeProps) {
  const dash = useAsync(() => api.analytics.getTrainee(), []);
  const mine = useAsync(() => api.nominations.mine(), []);

  return (
    <>
      <PageHeader eyebrow="My learning" title={<>Namaste, {firstName(persona.name)}</>} description={`${greeting()} — here is where you are today.`}
        actions={<Button variant="primary" onClick={() => onNavigate('lms')}>Continue learning</Button>} />
      <Async state={dash}>
        {(d) => {
          const k = d.kpis ?? {};
          const regs = mine.data ?? [];
          const go = (id: string) => onNavigate(({ programmes: 'nominations', learning: 'lms', skills: 'skills', certs: 'certificates', employment: 'employment', person: 'home' } as const)[id as 'person'] ?? 'home');
          return (
            <Surface eyebrow="Your learning identity" title="One record that follows you">
              <IdentityPath onJump={go} nodes={[
                { id: 'person', label: 'You', icon: UserRound },
                { id: 'programmes', label: 'Programmes', count: regs.length, icon: GraduationCap },
                { id: 'learning', label: 'Learning', count: regs.filter((r: any) => ['ENROLLED', 'COMPLETED'].includes(r.status)).length, icon: BookOpenCheck },
                { id: 'skills', label: 'Skills', count: k.skillsVerifiedCount ?? (d.skills ?? []).length, icon: Sprout },
                { id: 'certs', label: 'Credentials', count: k.certificatesEarned ?? 0, icon: Award },
                { id: 'employment', label: 'Matching roles', count: k.matchingOpportunitiesCount ?? 0, icon: Briefcase },
              ]} />
            </Surface>
          );
        }}
      </Async>
      <div style={{ height: 16 }} />
      <div className="home-grid trainee">
        <div className="span-12">
          <Async state={dash} label="Loading your progress">
            {(d) => {
              const k = d.kpis ?? {};
              return (
                <Surface eyebrow="Progress" title="Your learning">
                  <div className="gauges gauges-lg">
                    <RadialGauge size={168} label="Active courses" value={k.activeCoursesProgressPercent ?? 0} tone="teal" />
                    <RadialGauge size={168} label="Cooperative management" value={k.cooperativeMgmtProgressPercent ?? 0} tone="copper" />
                    <div className="trainee-stats">
                      <button className="stat-link" onClick={() => onNavigate('certificates')}>
                        <Award size={20} aria-hidden /><strong className="num">{k.certificatesEarned ?? 0}</strong><span>Certificates earned</span>
                      </button>
                      <button className="stat-link" onClick={() => onNavigate('employment')}>
                        <Briefcase size={20} aria-hidden /><strong className="num">{k.matchingOpportunitiesCount ?? 0}</strong><span>Matching opportunities</span>
                      </button>
                    </div>
                  </div>
                </Surface>
              );
            }}
          </Async>
        </div>

        <div className="span-6">
          <Surface eyebrow="Verified skills" title="What you can do">
            <Async state={dash}>
              {(d) => (d.skills ?? []).length === 0 ? <EmptyState title="No verified skills yet" detail="Complete a programme assessment to earn your first skill." /> : (
                <ul className="skills">
                  {d.skills.map((s: any) => (
                    <li key={s.name}>
                      <span>{s.name}</span>
                      <span className="pips" role="img" aria-label={`Level ${s.level} of ${LEVEL_MAX}`}>
                        {Array.from({ length: LEVEL_MAX }, (_, i) => <i key={i} className={i < s.level ? 'on' : ''} />)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Async>
          </Surface>
        </div>

        <div className="span-6">
          <Surface eyebrow="Credentials" title="Latest certificates" action={<Button size="sm" onClick={() => onNavigate('certificates')}>All</Button>}>
            <Async state={dash}>
              {(d) => (d.recentCertificates ?? []).length === 0 ? <EmptyState icon={<Award size={22} />} title="No certificates yet" /> : (
                <ul className="rows rows-flush">
                  {d.recentCertificates.map((c: any) => (
                    <li key={c.certificateNumber}>
                      <div><strong className="cell-strong">{c.title}</strong><div className="cell-sub num">{c.certificateNumber} · {fmtDate(c.issuedDate)}</div></div>
                      <Badge tone="green" dot>Verified</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Async>
          </Surface>
        </div>

        <div className="span-12">
          <Surface eyebrow="Programmes" title="My registrations" action={<Button size="sm" icon={<Compass size={14} />} onClick={() => onNavigate('nominations')}>Find programmes</Button>}>
            <Async state={mine}>
              {(list) => list.length === 0 ? <EmptyState title="You haven't registered for a programme yet" action={<Button size="sm" variant="primary" onClick={() => onNavigate('nominations')}>Browse programmes</Button>} /> : (
                <ul className="rows rows-flush">
                  {list.map((n: any) => (
                    <li key={n.id}>
                      <div><strong className="cell-strong">{n.programme?.title}</strong><div className="cell-sub">{n.programme?.location} · {fmtDate(n.programme?.startDate)} – {fmtDate(n.programme?.endDate)}</div></div>
                      <Badge tone={statusTone(n.status)} dot>{n.status.replace('_', ' ')}</Badge>
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
