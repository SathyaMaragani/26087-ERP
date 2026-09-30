import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import * as store from '../lib/offlineStore';
import { useToast } from './toast';

export type SyncStatus = 'online' | 'syncing' | 'offline' | 'synced';

interface OfflineState {
  status: SyncStatus;
  /** True when the browser is offline or the person has switched on the offline simulation. */
  isOffline: boolean;
  simulated: boolean;
  toggleSimulated: () => void;
  queued: number;
  downloaded: number;
  lastSync: string | null;
  /** Record a completed lesson: queued locally when offline, sent straight away when online. */
  recordCompletion: (item: store.QueueItem & { courseTitle?: string }) => Promise<'queued' | 'sent'>;
  sync: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<OfflineState | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [browserOnline, setBrowserOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [simulated, setSimulated] = useState(false);
  const [queued, setQueued] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const syncingRef = useRef(false);

  const isOffline = simulated || !browserOnline;

  const refresh = useCallback(async () => {
    const [q, l, ls] = await Promise.all([store.listQueue(), store.listLessons(), store.getMeta<string>('lastSync')]);
    setQueued(q.length); setDownloaded(l.length); setLastSync(ls ?? null);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const on = () => setBrowserOnline(true), off = () => setBrowserOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    const items = await store.listQueue();
    if (items.length === 0) return;
    syncingRef.current = true; setSyncing(true);
    try {
      await api.lms.syncOffline(items.map(({ lessonId, timeSpentSeconds, completedAt }) => ({ lessonId, timeSpentSeconds, completedAt })));
      await store.clearQueue(items.map((i) => i.qid!).filter((n) => n !== undefined));
      await store.markHistorySynced(items.map((i) => i.lessonId));
      const now = new Date().toISOString();
      await store.setMeta('lastSync', now);
      toast.success(`Uploaded ${items.length} lesson update${items.length === 1 ? '' : 's'}`, 'The server acknowledged them.');
      setJustSynced(true); window.setTimeout(() => setJustSynced(false), 5000);
    } catch (e) {
      toast.error('Sync failed', `${e instanceof Error ? e.message : 'Unknown error'}. Your ${items.length} update${items.length === 1 ? ' is' : 's are'} still saved on this device.`);
    } finally {
      syncingRef.current = false; setSyncing(false); await refresh();
    }
  }, [refresh, toast]);

  // Coming back online with pending work: sync automatically.
  const wasOffline = useRef(isOffline);
  useEffect(() => {
    if (wasOffline.current && !isOffline && queued > 0) void sync();
    wasOffline.current = isOffline;
  }, [isOffline, queued, sync]);

  const recordCompletion = useCallback(async (item: store.QueueItem & { courseTitle?: string }) => {
    const done = item.completedAt ?? new Date().toISOString();
    await store.recordHistory({ lessonId: item.lessonId, lessonTitle: item.lessonTitle ?? 'Lesson', courseTitle: item.courseTitle, completedAt: done, synced: false });
    if (isOffline) {
      await store.enqueue({ lessonId: item.lessonId, lessonTitle: item.lessonTitle, timeSpentSeconds: item.timeSpentSeconds, completedAt: done });
      await refresh();
      return 'queued' as const;
    }
    await api.lms.syncOffline([{ lessonId: item.lessonId, timeSpentSeconds: item.timeSpentSeconds, completedAt: done }]);
    await store.markHistorySynced([item.lessonId]);
    const now = new Date().toISOString();
    await store.setMeta('lastSync', now); await refresh();
    return 'sent' as const;
  }, [isOffline, refresh]);

  const toggleSimulated = useCallback(() => {
    const next = !simulated;
    setSimulated(next);
    toast.info(next ? 'Offline simulation on' : 'Back online', next ? 'Lessons you downloaded stay readable; progress queues on this device.' : 'Queued progress syncs automatically.');
  }, [simulated, toast]);

  const status: SyncStatus = syncing ? 'syncing' : isOffline ? 'offline' : justSynced ? 'synced' : 'online';
  const value = useMemo<OfflineState>(() => ({ status, isOffline, simulated, toggleSimulated, queued, downloaded, lastSync, recordCompletion, sync, refresh }), [status, isOffline, simulated, toggleSimulated, queued, downloaded, lastSync, recordCompletion, sync, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOffline(): OfflineState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOffline must be used inside <OfflineProvider>');
  return v;
}
