import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, RotateCcw, Send, User } from 'lucide-react';
import { api } from '../api/client';
import { useAsync } from '../lib/useAsync';
import type { UserPersona } from '../types';
import { Badge, Button, EmptyState, PageHeader, Surface } from '../ui/primitives';
import { fmtDate } from '../features/home/shared';

interface Message {
  id: number;
  from: 'user' | 'assistant';
  text: string;
  error?: boolean;
  links?: Array<{ label: string; tab: string }>;
}

/** Server hands back API-style paths; map them onto modules the current person can open. */
function linkToModule(path: string): { label: string; tab: string } | null {
  if (path.startsWith('/employment')) return { label: 'Open employment exchange', tab: 'employment' };
  if (path.startsWith('/programmes')) return { label: 'Browse programmes', tab: 'nominations' };
  if (path.startsWith('/certifications')) return { label: 'View my certificates', tab: 'certificates' };
  return null;
}

const PROMPTS = [
  'What jobs can I apply for?',
  'What skills should I learn next?',
  'Which certificates do I have?',
];

const GROUNDING = ['NCCT course catalogue', 'Open cooperative vacancies', 'Your verified skills', 'Your certificates'];

export function CareerAssistantView({ currentPersona, onNavigateTab }: { currentPersona: UserPersona; onNavigateTab: (tab: string) => void }) {
  const first = currentPersona.name.split(' ')[0];
  const seq = useRef(1);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, from: 'assistant', text: `Namaste ${first}. Ask me about jobs that fit your verified skills, what to learn next, or your certificates. I only answer from the NCCT catalogue, live vacancies and your own record.` },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const rec = useAsync(() => (currentPersona.traineeId ? api.career.recommendations(currentPersona.traineeId) : Promise.resolve(null)), [currentPersona.traineeId]);
  const skills = useAsync(() => (currentPersona.role === 'TRAINEE' ? api.analytics.getTrainee() : Promise.resolve(null)), [currentPersona.role]);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setLastQuery(q);
    setMessages((m) => [...m, { id: seq.current++, from: 'user', text: q }]);
    setInput('');
    setBusy(true);
    try {
      const res = await api.career.chat(currentPersona.traineeId as string, q) as { reply: string; actionableLinks?: string[] };
      const links = (res.actionableLinks ?? []).map(linkToModule).filter((l): l is { label: string; tab: string } => !!l);
      const unique = links.filter((l, i) => links.findIndex((x) => x.tab === l.tab) === i);
      setMessages((m) => [...m, { id: seq.current++, from: 'assistant', text: res.reply, links: unique }]);
    } catch (e) {
      setMessages((m) => [...m, { id: seq.current++, from: 'assistant', error: true, text: `I couldn't reach the counselling service. ${e instanceof Error ? e.message : ''}`.trim() }]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); send(input); };
  const reset = () => { setMessages((m) => m.slice(0, 1)); setLastQuery(''); };

  return (
    <>
      <PageHeader eyebrow="Career assistant" title={<>Guidance, <em className="serif-em">grounded</em></>}
        description="Answers come from controlled lookups — never from unrestricted access to records."
        actions={<Button size="sm" icon={<RotateCcw size={14} />} onClick={reset} disabled={messages.length <= 1}>New conversation</Button>} />

      <div className="chat-layout">
        <section className="chat" aria-label="Conversation">
          <div className="chat-scroll" role="log" aria-live="polite">
            {messages.map((m) => (
              <motion.div key={m.id} className={`msg msg-${m.from}${m.error ? ' msg-error' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                <span className="msg-avatar" aria-hidden>{m.from === 'user' ? <User size={15} /> : <Bot size={15} />}</span>
                <div className="msg-body">
                  <p>{m.text}</p>
                  {m.error && lastQuery && <Button size="sm" onClick={() => send(lastQuery)}>Try again</Button>}
                  {m.links && m.links.length > 0 && (
                    <div className="msg-links">
                      {m.links.map((l) => <Button key={l.tab} size="sm" icon={<ArrowRight size={13} />} onClick={() => onNavigateTab(l.tab)}>{l.label}</Button>)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {busy && <div className="msg msg-assistant"><span className="msg-avatar" aria-hidden><Bot size={15} /></span><div className="msg-body typing" role="status" aria-label="Assistant is typing"><i /><i /><i /></div></div>}
            <div ref={end} />
          </div>
          <div className="chat-prompts">
            {PROMPTS.map((p) => <button key={p} className="prompt" onClick={() => send(p)} disabled={busy}>{p}</button>)}
          </div>
          <form className="chat-input" onSubmit={onSubmit}>
            <label htmlFor="chat-q" className="sr-only">Ask the career assistant</label>
            <input id="chat-q" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about jobs, skills or certificates…" autoComplete="off" />
            <Button type="submit" variant="primary" icon={<Send size={15} />} disabled={!input.trim() || busy} aria-label="Send" />
          </form>
        </section>

        <aside className="chat-side">
          <Surface eyebrow="Grounded in" title="What I can see">
            <ul className="ground-list">{GROUNDING.map((g) => <li key={g}>{g}</li>)}</ul>
            <p className="cell-sub">I can't query arbitrary records, and I won't guess when I don't know.</p>
          </Surface>
          {currentPersona.role === 'TRAINEE' && (
            <Surface eyebrow="Your pathway" title="Jobs, skills, training">
              {rec.loading ? <p className="cell-sub">Reading your record…</p> : rec.error ? <p className="cell-sub" role="alert">{rec.error}</p> : !rec.data ? <EmptyState title="No pathway yet" /> : (
                <div className="pathway">
                  <h4>Roles you fit now</h4>
                  {rec.data.topJobMatches.length === 0 ? <p className="path-empty">No vacancy matches at 50% or more yet.</p> : rec.data.topJobMatches.map((j: any) => (
                    <div key={j.jobId} className="path-job"><strong className="cell-strong">{j.title}</strong><span className="cell-sub">{j.employer} · {j.location}</span>
                      <div className="score" role="img" aria-label={`${j.matchScorePercent}% match`}><div className="mini-bar"><i style={{ width: `${j.matchScorePercent}%` }} /></div><span className="num">{j.matchScorePercent}%</span></div>
                      {j.missingSkills?.length > 0 && <span className="cell-sub">To close the gap: {j.missingSkills.join(', ')}</span>}
                    </div>
                  ))}
                  <h4>Skills worth learning next</h4>
                  {rec.data.recommendedSkillsToLearn.length === 0 ? <p className="path-empty">You hold every skill the open roles ask for.</p> : <ul className="skill-chips">{rec.data.recommendedSkillsToLearn.map((s: string) => <li key={s}>{s}</li>)}</ul>}
                  <h4>Upcoming programmes</h4>
                  {rec.data.recommendedProgrammes.length === 0 ? <p className="path-empty">No upcoming programmes are open.</p> : (
                    <ul className="rows rows-flush">{rec.data.recommendedProgrammes.map((p: any) => <li key={p.id}><div><strong className="cell-strong">{p.title}</strong><div className="cell-sub">{p.location} · {p.durationDays} days · {fmtDate(p.startDate)}</div></div><Button size="sm" onClick={() => onNavigateTab('nominations')}>Register</Button></li>)}</ul>
                  )}
                </div>
              )}
            </Surface>
          )}
          {currentPersona.role === 'TRAINEE' && skills.data && (
            <Surface eyebrow="Your record" title="Verified skills">
              {(skills.data.skills ?? []).length === 0 ? <p className="cell-sub">No verified skills yet.</p> : (
                <ul className="rows rows-flush">{skills.data.skills.map((s: any) => <li key={s.name}><span>{s.name}</span><Badge tone="teal">Level {s.level}</Badge></li>)}</ul>
              )}
            </Surface>
          )}
        </aside>
      </div>
    </>
  );
}
