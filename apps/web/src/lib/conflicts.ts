export interface SessionLike {
  id?: string;
  batchId: string;
  trainerId: string;
  room: string;
  sessionDate: string; // ISO date or datetime
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  topic?: string;
}

export type ConflictKind = 'TRAINER' | 'ROOM' | 'BATCH';
export interface Conflict { kind: ConflictKind; with: any }

const day = (s: string) => String(s).slice(0, 10);
const min = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const norm = (s: string) => s.trim().toLowerCase();

/** Two half-open time ranges on the same day overlap. */
export const overlaps = (a: SessionLike, b: SessionLike) =>
  day(a.sessionDate) === day(b.sessionDate) && min(a.startTime) < min(b.endTime) && min(a.endTime) > min(b.startTime);

/** What an existing session clashes with when a new one is proposed. The server remains the authority. */
export function findConflicts(draft: SessionLike, existing: any[]): Conflict[] {
  if (!draft.sessionDate || !draft.startTime || !draft.endTime || min(draft.endTime) <= min(draft.startTime)) return [];
  const out: Conflict[] = [];
  for (const s of existing) {
    if (!overlaps(draft, s)) continue;
    if (draft.trainerId && s.trainerId === draft.trainerId) out.push({ kind: 'TRAINER', with: s });
    if (draft.room && norm(s.room) === norm(draft.room)) out.push({ kind: 'ROOM', with: s });
    if (draft.batchId && s.batchId === draft.batchId) out.push({ kind: 'BATCH', with: s });
  }
  return out;
}

/** Conflicts already present among saved sessions, keyed by session id. */
export function existingConflicts(sessions: any[]): Map<string, ConflictKind[]> {
  const map = new Map<string, ConflictKind[]>();
  const add = (id: string, k: ConflictKind) => map.set(id, Array.from(new Set([...(map.get(id) ?? []), k])));
  for (let i = 0; i < sessions.length; i++) for (let j = i + 1; j < sessions.length; j++) {
    const a = sessions[i], b = sessions[j];
    if (!overlaps(a, b)) continue;
    if (a.trainerId === b.trainerId) { add(a.id, 'TRAINER'); add(b.id, 'TRAINER'); }
    if (norm(a.room) === norm(b.room)) { add(a.id, 'ROOM'); add(b.id, 'ROOM'); }
    if (a.batchId === b.batchId) { add(a.id, 'BATCH'); add(b.id, 'BATCH'); }
  }
  return map;
}

export const CONFLICT_LABEL: Record<ConflictKind, string> = { TRAINER: 'TRAINER CONFLICT', ROOM: 'ROOM CONFLICT', BATCH: 'BATCH CONFLICT' };
