import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, BedDouble, Briefcase, GraduationCap, MapPin, Sprout, UserRound, BookOpenCheck } from 'lucide-react';
import { EASE } from '../../motion/primitives';
import { SkillGraph, type GraphGroup } from '../../ui/SkillGraph';
import { Badge } from '../../ui/primitives';
import { fmtDate, statusTone } from '../home/shared';

const pretty = (s?: string) => (s ?? '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const fullName = (t: any) => `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || t.traineeCode;

/** PERSON → PROGRAMMES → LEARNING → SKILLS → CERTIFICATES → EMPLOYMENT, each with its real count. */
export function IdentityPath({ nodes, onJump }: { nodes: Array<{ id: string; label: string; count?: number; icon: typeof Award }>; onJump: (id: string) => void }) {
  const reduce = useReducedMotion();
  return (
    <ol className="idpath" aria-label="Learning identity">
      {nodes.map((n, i) => {
        const Icon = n.icon;
        return (
          <li key={n.id}>
            <button onClick={() => onJump(n.id)} className={n.count === 0 ? 'is-empty' : ''}>
              <span className="idpath-node"><Icon size={17} aria-hidden /></span>
              <span className="idpath-label">{n.label}</span>
              {typeof n.count === 'number' && <span className="idpath-count num">{n.count}</span>}
            </button>
            {i < nodes.length - 1 && (
              <span className="idpath-link" aria-hidden>
                {!reduce && <motion.b initial={{ x: '-30%' }} animate={{ x: '130%' }} transition={{ duration: 2.2, ease: EASE, repeat: Infinity, delay: i * 0.3, repeatDelay: 1.4 }} />}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function LearningIdentity({ t }: { t: any }) {
  const regs: any[] = t.registrations ?? [];
  const skills: any[] = t.skills ?? [];
  const certs: any[] = t.certificates ?? [];
  const apps: any[] = t.jobApplications ?? [];
  const outcomes: any[] = t.outcomes ?? [];
  const stays: any[] = t.hostelAllocations ?? [];
  const learning = regs.filter((r) => ['ENROLLED', 'COMPLETED'].includes(r.status));
  const [selSkill, setSelSkill] = useState<string | null>(null);

  const groups = useMemo<GraphGroup[]>(() => {
    const by = new Map<string, GraphGroup['skills']>();
    skills.forEach((s) => {
      const name = s.skill?.name ?? 'Skill';
      const cat = s.skill?.category?.name ?? 'Verified skills';
      const evidence = certs.filter((c) => (c.skillsAcquired ?? []).some((x: string) => x.toLowerCase() === name.toLowerCase())).map((c) => ({ kind: 'certificate' as const, label: c.title, sub: c.programme?.title }));
      by.set(cat, [...(by.get(cat) ?? []), { id: s.id, name, level: s.level, verifiedAt: s.verifiedAt, evidence }]);
    });
    return [...by].map(([category, list]) => ({ category, skills: list }));
  }, [skills, certs]);

  const jump = (id: string) => document.getElementById(`id-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="identity">
      <header className="identity-head">
        <span className="avatar avatar-xl" aria-hidden>{fullName(t).charAt(0)}</span>
        <div>
          <div className="num cell-sub">{t.traineeCode}</div>
          <h3 className="identity-name">{fullName(t)}</h3>
          <div className="identity-tags"><Badge tone="indigo">{pretty(t.traineeType)}</Badge>{t.cooperativeName && <Badge>{t.cooperativeName}</Badge>}</div>
          <div className="cell-sub identity-loc"><MapPin size={13} aria-hidden /> {[t.village, t.district, t.state].filter(Boolean).join(', ') || 'Location not recorded'}</div>
        </div>
      </header>

      <IdentityPath onJump={jump} nodes={[
        { id: 'person', label: 'Person', icon: UserRound },
        { id: 'programmes', label: 'Programmes', count: regs.length, icon: GraduationCap },
        { id: 'learning', label: 'Learning', count: learning.length, icon: BookOpenCheck },
        { id: 'skills', label: 'Skills', count: skills.length, icon: Sprout },
        { id: 'certs', label: 'Credentials', count: certs.length, icon: Award },
        { id: 'employment', label: 'Employment', count: apps.length + outcomes.length, icon: Briefcase },
      ]} />

      <section id="id-person"><h4 className="eyebrow">Person</h4>
        <dl className="facts">
          <div><dt>Occupation</dt><dd>{t.occupation ?? '—'}</dd></div>
          <div><dt>Education</dt><dd>{t.educationLevel ?? '—'}</dd></div>
          <div><dt>Contact</dt><dd>{t.user?.email}<small>{t.phone ?? t.user?.phone}</small></dd></div>
          <div><dt>Affiliation</dt><dd>{t.pacsName ?? t.cooperativeName ?? '—'}</dd></div>
        </dl>
      </section>

      <section id="id-programmes"><h4 className="eyebrow">Training history</h4>
        {regs.length === 0 ? <p className="cell-sub">No programme registrations.</p> : (
          <ol className="history">
            {[...regs].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).map((r) => (
              <li key={r.id}>
                <span className="history-dot" aria-hidden />
                <div><strong className="cell-strong">{r.programme?.title}</strong><div className="cell-sub">{r.batch?.name ?? 'No batch yet'} · {r.nominationType === 'SELF' ? 'self-registered' : 'nominated'}{r.programme?.startDate ? ` · ${fmtDate(r.programme.startDate)}` : ''}</div></div>
                <Badge tone={statusTone(r.status)} dot>{pretty(r.status)}</Badge>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section id="id-learning"><h4 className="eyebrow">Learning</h4>
        {learning.length === 0 ? <p className="cell-sub">Not enrolled in a programme yet.</p> : <p className="cell-sub">Enrolled in {learning.length} programme{learning.length === 1 ? '' : 's'}. Lesson-level progress isn't exposed to staff by the API yet.</p>}
      </section>

      <section id="id-skills"><h4 className="eyebrow">Skill graph</h4>
        {groups.length === 0 ? <p className="cell-sub">No verified skills yet.</p> : <div className="identity-graph"><SkillGraph groups={groups} selectedId={selSkill} onSelect={(id) => setSelSkill((c) => (c === id ? null : id))} /></div>}
      </section>

      <section id="id-certs"><h4 className="eyebrow">Credentials</h4>
        {certs.length === 0 ? <p className="cell-sub">No certificates issued.</p> : (
          <ul className="rows rows-flush">{certs.map((c) => (
            <li key={c.id}><div><strong className="cell-strong">{c.title}</strong><div className="cell-sub num">{c.certificateNumber} · {fmtDate(c.issuedDate)}{c.grade ? ` · ${c.grade}` : ''}</div></div><a className="link-btn" href={`#/verify/${encodeURIComponent(c.certificateNumber)}`}>Verify</a></li>
          ))}</ul>
        )}
      </section>

      <section id="id-employment"><h4 className="eyebrow">Employment</h4>
        {apps.length === 0 && outcomes.length === 0 ? <p className="cell-sub">No applications or placements.</p> : (
          <ul className="rows rows-flush">
            {outcomes.map((o) => <li key={o.id}><div><strong className="cell-strong">{o.jobTitle}</strong><div className="cell-sub">{o.employerName} · placed {fmtDate(o.placementDate)}</div></div><Badge tone="green" dot>Placed</Badge></li>)}
            {apps.map((a) => <li key={a.id}><div><strong className="cell-strong">{a.jobPosting?.title}</strong><div className="cell-sub num">{a.matchScore}% match · applied {fmtDate(a.appliedAt)}</div></div><Badge tone={statusTone(a.status)} dot>{pretty(a.status)}</Badge></li>)}
          </ul>
        )}
      </section>

      {stays.length > 0 && (
        <section><h4 className="eyebrow"><BedDouble size={12} aria-hidden /> Accommodation</h4>
          <ul className="rows rows-flush">{stays.map((s) => <li key={s.id}><div><strong className="cell-strong">Room {s.room?.roomNumber}</strong><div className="cell-sub num">{fmtDate(s.checkInDate)} – {fmtDate(s.checkOutDate)}</div></div><Badge tone={statusTone(s.status === 'CHECKED_IN' ? 'ONGOING' : 'UPCOMING')} dot>{pretty(s.status)}</Badge></li>)}</ul>
        </section>
      )}
    </div>
  );
}
