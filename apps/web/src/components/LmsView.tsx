import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, CloudOff, DownloadCloud, Lock, PlayCircle, RefreshCw, Trash2, WifiOff } from 'lucide-react';
import { api } from '../api/client';
import * as store from '../lib/offlineStore';
import { useAsync } from '../lib/useAsync';
import { useOffline } from '../state/offline';
import { useToast } from '../state/toast';
import type { UserPersona } from '../types';
import { JourneyStrip } from '../ui/Lifecycle';
import { Badge, Button, EmptyState, ErrorState, LoadingBlock, PageHeader, Surface, Tabs } from '../ui/primitives';
import { fmtDate } from '../features/home/shared';

const LANGS = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'hi', label: 'Hindi', native: 'हिंदी' },
  { id: 'te', label: 'Telugu', native: 'తెలుగు' },
] as const;
type Lang = (typeof LANGS)[number]['id'];
type Tab = 'learn' | 'assess' | 'history';

function Blocks({ blocks }: { blocks: any }) {
  const list: any[] = Array.isArray(blocks) ? blocks : [];
  if (list.length === 0) return <p className="cell-sub">This lesson has no content blocks yet.</p>;
  return (
    <div className="blocks">
      {list.map((b, i) => {
        if (b.type === 'code') return <pre key={i} className="block-code"><code>{b.code}</code></pre>;
        if (b.type === 'image' && b.url) return <img key={i} src={b.url} alt={b.alt ?? ''} className="block-img" />;
        if (b.type === 'video' && b.url) return <video key={i} src={b.url} controls className="block-img" />;
        if (b.type === 'audio' && b.url) return <audio key={i} src={b.url} controls />;
        return <p key={i}>{b.content ?? b.text ?? ''}</p>;
      })}
    </div>
  );
}

const ago = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never');

export function LmsView({ persona }: { persona: UserPersona }) {
  const off = useOffline();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('learn');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [dl, setDl] = useState<{ courseId: string; done: number; total: number } | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [doneNow, setDoneNow] = useState<Record<string, boolean>>({});
  const openedAt = useRef(Date.now());

  const refreshDownloads = useCallback(async () => setDownloadedIds(new Set((await store.listCourses()).map((c) => c.id))), []);
  useEffect(() => { refreshDownloads(); }, [refreshDownloads]);

  /* Courses: from the API when online, from the device when offline. */
  const courses = useAsync<any[]>(async () => (off.isOffline ? (await store.listCourses()).map((c) => ({ id: c.id, title: c.title, description: c.description })) : api.lms.listCourses()), [off.isOffline]);
  useEffect(() => { if (courses.data?.length && !courses.data.some((c) => c.id === courseId)) setCourseId(courses.data[0].id); }, [courses.data, courseId]);

  const course = useAsync<any>(async () => {
    if (!courseId) return null;
    if (off.isOffline) return (await store.getCourse(courseId)) ?? null;
    return api.lms.getCourse(courseId);
  }, [courseId, off.isOffline]);
  const lessons = useMemo(() => (course.data?.modules ?? []).flatMap((m: any) => (m.lessons ?? []).map((l: any) => ({ ...l, moduleTitle: m.title }))), [course.data]);
  useEffect(() => { if (lessons.length && !lessons.some((l: any) => l.id === lessonId)) setLessonId(lessons[0].id); }, [lessons, lessonId]);

  /* Lesson + which translations exist. */
  const lesson = useAsync<{ base: any; tr: Record<string, any> } | null>(async () => {
    if (!lessonId) return null;
    if (off.isOffline) {
      const l = await store.getLesson(lessonId);
      return l ? { base: { title: l.title, contentBlocks: l.contentBlocks }, tr: l.translations ?? {} } : null;
    }
    const base = await api.lms.getLesson(lessonId);
    const tr: Record<string, any> = {};
    await Promise.all(['hi', 'te'].map(async (code) => { try { tr[code] = await api.lms.getTranslation(lessonId, code); } catch { /* not translated */ } }));
    return { base, tr };
  }, [lessonId, off.isOffline]);
  useEffect(() => { openedAt.current = Date.now(); }, [lessonId]);

  const isDownloaded = !!courseId && downloadedIds.has(courseId);
  const showing = lang === 'en' ? lesson.data?.base : lesson.data?.tr[lang] ?? null;
  const missing = lang !== 'en' && !!lesson.data && !lesson.data.tr[lang];

  const download = async () => {
    if (!courseId || !course.data) return;
    const outline = course.data;
    const all: Array<{ id: string; title: string }> = (outline.modules ?? []).flatMap((m: any) => m.lessons ?? []);
    setDl({ courseId, done: 0, total: all.length });
    try {
      for (let i = 0; i < all.length; i++) {
        const l = await api.lms.getLesson(all[i].id);
        const tr: Record<string, any> = {};
        await Promise.all(['hi', 'te'].map(async (code) => { try { const t = await api.lms.getTranslation(all[i].id, code); tr[code] = { title: t.title, contentBlocks: t.contentBlocks }; } catch { /* absent */ } }));
        await store.saveLesson({ id: l.id, courseId, title: l.title, contentBlocks: l.contentBlocks, translations: tr, savedAt: new Date().toISOString() });
        setDl({ courseId, done: i + 1, total: all.length });
      }
      await store.saveCourse({ id: courseId, title: outline.title, description: outline.description, modules: (outline.modules ?? []).map((m: any) => ({ id: m.id, title: m.title, lessons: (m.lessons ?? []).map((x: any) => ({ id: x.id, title: x.title })) })), savedAt: new Date().toISOString() });
      await refreshDownloads(); await off.refresh();
      toast.success('Course downloaded', `${all.length} lesson${all.length === 1 ? '' : 's'} are now readable offline, in every available language.`);
    } catch (e) {
      toast.error('Download failed', e instanceof Error ? e.message : undefined);
    } finally { setDl(null); }
  };
  const removeDownload = async () => { if (!courseId) return; await store.removeCourse(courseId); await refreshDownloads(); await off.refresh(); toast.info('Removed from this device'); };

  const complete = async () => {
    if (!lessonId) return;
    const l = lessons.find((x: any) => x.id === lessonId);
    try {
      const how = await off.recordCompletion({ lessonId, lessonTitle: l?.title, courseTitle: course.data?.title, timeSpentSeconds: Math.max(1, Math.round((Date.now() - openedAt.current) / 1000)) });
      setDoneNow((d) => ({ ...d, [lessonId]: true }));
      if (how === 'queued') toast.info('Saved on this device', 'It uploads automatically when you are back online.'); else toast.success('Progress sent', 'The server acknowledged this lesson.');
    } catch (e) { toast.error('Could not save progress', e instanceof Error ? e.message : undefined); }
  };

  const history = useAsync(() => store.listHistory(), [tab, off.queued, off.lastSync]);

  return (
    <>
      <PageHeader eyebrow="Learning" title={<>Lessons in your <em className="serif-em">language</em></>}
        description="English, हिंदी and తెలుగు. Download a course once and keep learning without a signal; progress uploads when the network returns." />

      <div className={`offline-strip st-${off.status}`} role="status" aria-live="polite">
        <span className="offline-state">{off.status === 'offline' ? <WifiOff size={15} aria-hidden /> : <RefreshCw size={15} aria-hidden className={off.status === 'syncing' ? 'spin' : ''} />}<strong>{off.status.toUpperCase()}</strong></span>
        <span><b className="num">{off.downloaded}</b> lesson{off.downloaded === 1 ? '' : 's'} downloaded</span>
        <span><b className="num">{off.queued}</b> waiting to sync</span>
        <span>Last sync <b>{ago(off.lastSync)}</b></span>
        {off.queued > 0 && !off.isOffline && <Button size="sm" variant="primary" loading={off.status === 'syncing'} onClick={() => off.sync()}>Sync now</Button>}
      </div>

      <Tabs label="Learning section" tabs={[{ id: 'learn', label: 'Learn' }, { id: 'assess', label: 'Assessments' }, { id: 'history', label: 'History' }]} value={tab} onChange={setTab} />

      <div className="att-body">
        {tab === 'learn' && (
          courses.loading && !courses.data ? <LoadingBlock label="Loading courses" /> : courses.error ? <ErrorState detail={courses.error} onRetry={courses.reload} /> : (courses.data ?? []).length === 0 ? (
            <Surface><EmptyState icon={off.isOffline ? <CloudOff size={22} /> : <BookOpen size={22} />} title={off.isOffline ? 'No courses are downloaded on this device' : 'No courses are published for your institution yet'} detail={off.isOffline ? 'Go online and use “Download for offline” on a course.' : 'Once a course with modules and lessons is published, it appears here with its translations.'} /></Surface>
          ) : (
            <div className="lms">
              <aside className="lms-nav" aria-label="Course outline">
                {(courses.data ?? []).length > 1 && <select value={courseId ?? ''} onChange={(e) => { setCourseId(e.target.value); setLessonId(null); }} aria-label="Course">{(courses.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.title}{downloadedIds.has(c.id) ? ' ✓' : ''}</option>)}</select>}
                {course.loading ? <LoadingBlock /> : course.error ? <ErrorState detail={course.error} onRetry={course.reload} /> : (
                  <>
                    <h3 className="lms-course">{course.data?.title}</h3>
                    {!off.isOffline && (
                      <div className="dl-box">
                        {dl && dl.courseId === courseId ? (
                          <div className="dl-progress" role="progressbar" aria-valuemin={0} aria-valuemax={dl.total} aria-valuenow={dl.done}><i style={{ width: `${(dl.done / Math.max(1, dl.total)) * 100}%` }} /><span className="num">{dl.done}/{dl.total}</span></div>
                        ) : isDownloaded ? (
                          <div className="dl-done"><Badge tone="green" dot>Available offline</Badge><button className="icon-btn" onClick={removeDownload} aria-label="Remove offline copy"><Trash2 size={14} /></button></div>
                        ) : <Button size="sm" icon={<DownloadCloud size={14} />} onClick={download}>Download for offline</Button>}
                      </div>
                    )}
                    {(course.data?.modules ?? []).map((m: any) => (
                      <div key={m.id} className="lms-module"><div className="eyebrow">{m.title}</div>
                        <ul>{(m.lessons ?? []).map((l: any) => (
                          <li key={l.id}><button className={`lms-lesson${l.id === lessonId ? ' is-active' : ''}`} onClick={() => setLessonId(l.id)} aria-current={l.id === lessonId ? 'true' : undefined}>
                            {doneNow[l.id] ? <CheckCircle2 size={15} className="ok" aria-label="Completed" /> : <PlayCircle size={15} aria-hidden />}{l.title}</button></li>
                        ))}</ul>
                      </div>
                    ))}
                  </>
                )}
              </aside>

              <Surface className="lms-stage">
                <div className="lms-bar">
                  <div className="lang-switch lang-big" role="group" aria-label="Lesson language">
                    {LANGS.map((l) => {
                      const has = l.id === 'en' || !!lesson.data?.tr[l.id];
                      return <button key={l.id} className={lang === l.id ? 'is-active' : ''} aria-pressed={lang === l.id} onClick={() => setLang(l.id)} lang={l.id} title={has ? l.label : `${l.label}: no translation of this lesson yet`}>
                        <span>{l.native}</span>{l.id !== 'en' && <i className={has ? 'has' : 'no'} aria-label={has ? 'available' : 'not available'} />}</button>;
                    })}
                  </div>
                  {off.isOffline && <Badge tone="amber" dot>Reading offline</Badge>}
                </div>
                {lesson.loading ? <LoadingBlock label="Loading lesson" /> : lesson.error ? <ErrorState detail={lesson.error} onRetry={lesson.reload} /> : !lesson.data ? (
                  <EmptyState title={off.isOffline ? 'This lesson is not downloaded' : 'Select a lesson'} detail={off.isOffline ? 'Download the course while online to read it here.' : undefined} />
                ) : (
                  <article>
                    <h2 className="lesson-title" lang={missing ? 'en' : lang}>{(missing ? lesson.data.base : showing)?.title}</h2>
                    {missing && <p className="lang-note" role="status">There is no {LANGS.find((l) => l.id === lang)?.label} translation of this lesson yet — showing English.</p>}
                    <div lang={missing ? 'en' : lang}><Blocks blocks={(missing ? lesson.data.base : showing)?.contentBlocks} /></div>
                    <div className="lesson-foot">
                      <Button variant="primary" icon={<CheckCircle2 size={15} />} disabled={!!(lessonId && doneNow[lessonId])} onClick={complete}>{lessonId && doneNow[lessonId] ? 'Completed' : off.isOffline ? 'Mark complete (saves offline)' : 'Mark as complete'}</Button>
                    </div>
                  </article>
                )}
              </Surface>
            </div>
          )
        )}

        {tab === 'assess' && (
          <Surface eyebrow="Learn → Practice → Assess → Pass → Certify" title="The path to a credential">
            <JourneyStrip steps={[
              { name: 'LEARN', state: 'live', hint: 'Lessons and progress' },
              { name: 'PRACTICE', state: 'unavailable', hint: 'Not in the API yet' },
              { name: 'ASSESS', state: 'unavailable', hint: 'Not in the API yet' },
              { name: 'PASS', state: 'unavailable', hint: 'Needs assessment results' },
              { name: 'CERTIFY', state: 'live', hint: 'Institutions issue credentials' },
            ]} />
            <EmptyState icon={<Lock size={22} />} title="Assessments aren't available yet" detail={`${persona.role === 'TRAINEE' ? 'Scores, eligibility and pass status will appear here' : 'Assessment results, scores and eligibility will appear here'} once the platform exposes assessment routes. Today, credentials are issued directly by your institution after training.`} />
          </Surface>
        )}

        {tab === 'history' && (
          <Surface eyebrow="On this device" title="Learning history" pad={false}>
            {history.loading && !history.data ? <div className="surface-body"><LoadingBlock /></div> : (history.data ?? []).length === 0 ? <div className="surface-body"><EmptyState title="No completed lessons yet" detail="Lessons you complete are recorded here, even while offline." /></div> : (
              <ul className="rows">{(history.data ?? []).map((h) => (
                <li key={h.lessonId}><div><strong className="cell-strong">{h.lessonTitle}</strong><div className="cell-sub">{h.courseTitle ?? 'Course'} · completed {fmtDate(h.completedAt)}</div></div><Badge tone={h.synced ? 'green' : 'amber'} dot>{h.synced ? 'Synced' : 'Waiting to sync'}</Badge></li>
              ))}</ul>
            )}
          </Surface>
        )}
      </div>
    </>
  );
}
