/**
 * Offline persistence, backed by IndexedDB.
 *  courses  — downloaded course outlines
 *  lessons  — downloaded lessons with their translations
 *  queue    — progress recorded while offline, waiting to sync
 *  history  — completed lessons (local learning history)
 *  meta     — small values such as the last successful sync time
 * If IndexedDB is unavailable (private mode, blocked storage) everything degrades to memory for the session.
 */
const DB_NAME = 'ncct-offline';
const STORES = ['courses', 'lessons', 'queue', 'history', 'meta'] as const;
type Store = (typeof STORES)[number];

export interface QueueItem { qid?: number; lessonId: string; lessonTitle?: string; timeSpentSeconds?: number; completedAt?: string }
export interface StoredLesson { id: string; courseId: string; title: string; contentBlocks: unknown; translations: Record<string, { title: string; contentBlocks: unknown }>; savedAt: string }
export interface StoredCourse { id: string; title: string; description?: string; modules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string }> }>; savedAt: string }
export interface HistoryItem { lessonId: string; lessonTitle: string; courseTitle?: string; completedAt: string; synced: boolean }

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory: Record<Store, Map<IDBValidKey, unknown>> = { courses: new Map(), lessons: new Map(), queue: new Map(), history: new Map(), meta: new Map() };
let memSeq = 1;

function open(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('courses', { keyPath: 'id' });
        db.createObjectStore('lessons', { keyPath: 'id' });
        db.createObjectStore('queue', { keyPath: 'qid', autoIncrement: true });
        db.createObjectStore('history', { keyPath: 'lessonId' });
        db.createObjectStore('meta');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}

async function tx<T>(store: Store, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const db = await open();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const t = db.transaction(store, mode);
      const r = run(t.objectStore(store));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(undefined);
    } catch { resolve(undefined); }
  });
}

async function put(store: Store, value: object, key?: IDBValidKey): Promise<void> {
  const db = await open();
  if (!db) { const k = key ?? (value as { id?: string; lessonId?: string }).id ?? (value as { lessonId?: string }).lessonId ?? memSeq++; memory[store].set(k, value); return; }
  await tx(store, 'readwrite', (s) => (key === undefined ? s.put(value) : s.put(value, key)));
}
async function all<T>(store: Store): Promise<T[]> {
  const db = await open();
  if (!db) return Array.from(memory[store].values()) as T[];
  return ((await tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>)) ?? []) as T[];
}
async function get<T>(store: Store, key: IDBValidKey): Promise<T | undefined> {
  const db = await open();
  if (!db) return memory[store].get(key) as T | undefined;
  return tx<T>(store, 'readonly', (s) => s.get(key) as IDBRequest<T>);
}
async function del(store: Store, key: IDBValidKey): Promise<void> {
  const db = await open();
  if (!db) { memory[store].delete(key); return; }
  await tx(store, 'readwrite', (s) => s.delete(key));
}

/* Lessons & courses */
export const saveCourse = (c: StoredCourse) => put('courses', c);
export const saveLesson = (l: StoredLesson) => put('lessons', l);
export const listCourses = () => all<StoredCourse>('courses');
export const getCourse = (id: string) => get<StoredCourse>('courses', id);
export const getLesson = (id: string) => get<StoredLesson>('lessons', id);
export const listLessons = () => all<StoredLesson>('lessons');
export async function removeCourse(courseId: string) {
  const c = await getCourse(courseId);
  for (const l of (c?.modules ?? []).flatMap((m) => m.lessons)) await del('lessons', l.id);
  await del('courses', courseId);
}

/* Sync queue */
export async function enqueue(item: QueueItem) {
  const db = await open();
  if (!db) { memory.queue.set(memSeq, { ...item, qid: memSeq }); memSeq++; return; }
  await tx('queue', 'readwrite', (s) => s.add(item));
}
export const listQueue = () => all<QueueItem>('queue');
export async function clearQueue(ids: number[]) { for (const id of ids) await del('queue', id); }

/* History */
export const recordHistory = (h: HistoryItem) => put('history', h);
export const listHistory = async () => (await all<HistoryItem>('history')).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
export async function markHistorySynced(lessonIds: string[]) {
  for (const id of lessonIds) { const h = await get<HistoryItem>('history', id); if (h) await put('history', { ...h, synced: true }); }
}

/* Meta */
export const setMeta = (k: string, v: unknown) => put('meta', { v }, k);
export async function getMeta<T>(k: string): Promise<T | undefined> { return (await get<{ v: T }>('meta', k))?.v; }
