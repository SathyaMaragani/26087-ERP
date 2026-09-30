// Local dev: Vite's dev server proxies the relative path to localhost:4000 (see vite.config.ts),
// so this stays empty. Production: frontend and API are deployed to different hosts, so this must
// be set to the deployed API's own origin (e.g. https://ncct-api.onrender.com) at build time.
const API_ORIGIN = import.meta.env.VITE_API_URL ?? '';
const API_BASE = `${API_ORIGIN}/api/v1`;

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export const SESSION_KEYS = ['ncct_token', 'ncct_refresh_token', 'ncct_tenant_id', 'ncct_user', 'ncct_org'] as const;

function clearSession() {
  SESSION_KEYS.forEach((k) => localStorage.removeItem(k));
}

function storeSession(data: { accessToken: string; refreshToken: string; user?: any; activeOrganization?: any }) {
  localStorage.setItem('ncct_token', data.accessToken);
  localStorage.setItem('ncct_refresh_token', data.refreshToken);
  if (data.activeOrganization?.id) {
    localStorage.setItem('ncct_tenant_id', data.activeOrganization.id);
    localStorage.setItem('ncct_org', JSON.stringify(data.activeOrganization));
  }
  if (data.user) localStorage.setItem('ncct_user', JSON.stringify(data.user));
}

// One in-flight refresh at a time; concurrent 401s share it.
let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = localStorage.getItem('ncct_refresh_token');
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const json = await res.json();
      const data = json.data ?? json;
      if (!data?.accessToken) return false;
      localStorage.setItem('ncct_token', data.accessToken);
      if (data.refreshToken) localStorage.setItem('ncct_refresh_token', data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => { refreshing = null; }, 0);
    }
  })();
  return refreshing;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isPublic = false,
  retried = false,
  tenantOverride?: string,
): Promise<T> {
  const token = localStorage.getItem('ncct_token');
  const tenantId = tenantOverride ?? localStorage.getItem('ncct_tenant_id');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!isPublic && token) headers['Authorization'] = `Bearer ${token}`;
  if (tenantId) headers['x-tenant-id'] = tenantId;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the NCCT API. Check your connection.');
  }

  if (response.status === 401 && !isPublic && !retried) {
    if (await refreshSession()) return request<T>(endpoint, options, isPublic, true, tenantOverride);
    clearSession();
    window.dispatchEvent(new Event('ncct:unauthorized'));
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const raw = json?.error?.message || json?.message || `HTTP error ${response.status}`;
    const errorMsg = Array.isArray(raw) ? raw.join(', ') : raw;
    throw new ApiError(response.status, errorMsg, json);
  }

  return json.data !== undefined ? json.data : json;
}

export interface MatchedCandidate {
  traineeId: string;
  name: string;
  traineeCode: string;
  cooperativeAffiliation?: string;
  state?: string;
  district?: string;
  education?: string;
  matchScorePercent: number;
  matchedSkills: string[];
  totalSkillsCount: number;
  certificatesEarnedCount: number;
  hasCertificates: boolean;
}

export interface MatchResult {
  job: { id: string; title: string; employer: string; requiredSkills: string[] };
  totalCandidatesEvaluated: number;
  topMatches: MatchedCandidate[];
}

/** Read-only views into another institution. The server decides whether the caller may cross tenants. */
export const tenantApi = (orgId: string) => ({
  programmes: () => request<any[]>('/programmes', {}, false, false, orgId),
  registrations: (programmeId: string) => request<any[]>(`/programmes/${programmeId}/registrations`, {}, false, false, orgId),
  trainee: (id: string) => request<any>(`/trainees/${id}`, {}, false, false, orgId),
  trainees: () => request<any[]>('/trainees', {}, false, false, orgId),
  occupancy: () => request<any>('/hostels/occupancy', {}, false, false, orgId),
  certificates: () => request<any[]>('/certifications', {}, false, false, orgId),
});

export const api = {
  // Auth
  auth: {
    login: async (email: string, password: string) => {
      const data = await request<{
        accessToken: string;
        refreshToken: string;
        user: any;
        activeOrganization: any;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }, true);
      storeSession(data);
      return data;
    },
    logout: () => {
      const refreshToken = localStorage.getItem('ncct_refresh_token');
      if (refreshToken) {
        // Best effort server-side invalidation; local session is cleared regardless.
        fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      }
      clearSession();
    },
    me: () => request<any>('/auth/me'),
    hasSession: () => !!localStorage.getItem('ncct_token'),
    getStored: () => {
      try {
        const u = localStorage.getItem('ncct_user');
        const o = localStorage.getItem('ncct_org');
        return u && o ? { user: JSON.parse(u), org: JSON.parse(o) } : null;
      } catch {
        return null;
      }
    },
  },

  // Platform
  health: async () => {
    const started = performance.now();
    const res = await fetch(`${API_ORIGIN}/health`);
    if (!res.ok) throw new ApiError(res.status, 'Health check failed');
    const json = await res.json();
    const data = json.data ?? json;
    return { ...data, roundTripMs: Math.round(performance.now() - started) } as {
      status: string;
      uptimeSeconds: number;
      database: { status: string; latencyMs: number };
      roundTripMs: number;
    };
  },

  organizations: {
    list: () => request<any[]>('/organizations'),
  },

  skills: {
    list: () => request<any[]>('/skills'),
    categories: () => request<any[]>('/skills/categories'),
  },

  // Notifications
  notifications: {
    unreadCount: () => request<{ unreadCount: number }>('/notifications/unread-count'),
    mine: () => request<any[]>('/notifications/my'),
    markRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
  },

  // Analytics
  analytics: {
    getCommandCenter: () => request<any>('/analytics/ncct-command-center'),
    getInstitution: () => request<any>('/analytics/institution'),
    getTrainee: () => request<any>('/analytics/trainee'),
    getEmployer: () => request<any>('/analytics/employer'),
  },

  // Programmes & Batches
  programmes: {
    list: () => request<any[]>('/programmes'),
    get: (id: string) => request<any>(`/programmes/${id}`),
    create: (dto: any) =>
      request<any>('/programmes', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    createBatch: (id: string, dto: any) =>
      request<any>(`/programmes/${id}/batches`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    getBatches: (id: string) => request<any[]>(`/programmes/${id}/batches`),
    getRegistrations: (id: string) => request<any[]>(`/programmes/${id}/registrations`),
  },

  trainers: {
    list: () => request<any[]>('/trainers'),
  },

  // Nominations & Registrations
  nominations: {
    list: (params?: { programmeId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.programmeId) q.append('programmeId', params.programmeId);
      if (params?.status) q.append('status', params.status);
      return request<any[]>(`/nominations?${q.toString()}`);
    },
    mine: () => request<any[]>('/nominations/my'),
    nominate: (traineeId: string, dto: { programmeId: string; nominatingOrgName?: string; nominatingOfficer?: string; remarks?: string }) =>
      request<any>(`/nominations/${traineeId}/nominate`, {
        method: 'POST',
        body: JSON.stringify({ ...dto, nominationType: 'INSTITUTIONAL' }),
      }),
    registerSelf: (dto: { programmeId: string; remarks?: string }) =>
      request<any>('/nominations/register', {
        method: 'POST',
        body: JSON.stringify({ ...dto, nominationType: 'SELF' }),
      }),
    updateStatus: (id: string, status: string, batchId?: string, remarks?: string) =>
      request<any>(`/nominations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, batchId, remarks }),
      }),
  },

  // Trainees
  trainees: {
    list: () => request<any[]>('/trainees'),
    get: (id: string) => request<any>(`/trainees/${id}`),
    getSkills: (id: string) => request<any[]>(`/trainees/${id}/skills`),
    getCertificates: (id: string) => request<any[]>(`/trainees/${id}/certificates`),
    getProgrammes: (id: string) => request<any[]>(`/trainees/${id}/programmes`),
  },

  // Timetable
  timetable: {
    getSessions: (date?: string) => {
      const q = date ? `?date=${date}` : '';
      return request<any[]>(`/timetable/sessions${q}`);
    },
    createSession: (dto: {
      batchId: string;
      trainerId: string;
      room: string;
      sessionDate: string;
      startTime: string;
      endTime: string;
      topic?: string;
    }) =>
      request<any>('/timetable/sessions', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
  },

  // Attendance (QR & Biometric)
  attendance: {
    generateDynamicQr: (sessionId: string) =>
      request<{ token: string; expiresAt: number; rotationIndex: number; qrCodeUrl: string }>(
        `/attendance/sessions/${sessionId}/qr-code`,
        { method: 'POST' },
      ),
    scanQr: (sessionId: string, qrToken: string) =>
      request<any>(`/attendance/sessions/${sessionId}/qr-scan`, {
        method: 'POST',
        body: JSON.stringify({ qrToken }),
      }),
    verifyFace: (sessionId: string, consentGranted: boolean, livenessConfidence = 98.5) =>
      request<any>(`/attendance/sessions/${sessionId}/face-verify`, {
        method: 'POST',
        body: JSON.stringify({
          consentGranted,
          faceEmbedding: 'simulated_vector_embeddings',
          livenessConfidence,
        }),
      }),
  },

  // Hostel & Logistics
  hostel: {
    getOccupancy: () => request<any>('/hostels/occupancy'),
    list: () => request<any[]>('/hostels'),
    create: (dto: { name: string; building: string; gender?: string; totalRooms?: number }) =>
      request<any>('/hostels', { method: 'POST', body: JSON.stringify(dto) }),
    addRoom: (hostelId: string, dto: { roomNumber: string; floor: number; bedCapacity: number }) =>
      request<any>(`/hostels/${hostelId}/rooms`, { method: 'POST', body: JSON.stringify(dto) }),
    allocate: (dto: { roomId: string; traineeId: string; checkInDate: string; checkOutDate: string }) =>
      request<any>('/hostels/allocations', { method: 'POST', body: JSON.stringify(dto) }),
  },
  logistics: {
    list: (programmeId?: string) => {
      const q = programmeId ? `?programmeId=${programmeId}` : '';
      return request<any[]>(`/logistics${q}`);
    },
    create: (dto: any) =>
      request<any>('/logistics', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    updateStatus: (id: string, status: string, remarks?: string) =>
      request<any>(`/logistics/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, remarks }),
      }),
  },

  // LMS & Offline Sync
  lms: {
    listCourses: () => request<any[]>('/lms/courses'),
    getCourse: (id: string) => request<any>(`/lms/courses/${id}`),
    getLesson: (id: string) => request<any>(`/lms/lessons/${id}`),
    getTranslation: (lessonId: string, lang: string) =>
      request<any>(`/lms/lessons/${lessonId}/translations/${lang}`),
    syncOffline: (items: Array<{ lessonId: string; timeSpentSeconds?: number; completedAt?: string }>) =>
      request<any>('/lms/sync', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
  },

  // Certifications
  certifications: {
    list: () => request<any[]>('/certifications'),
    issue: (dto: { traineeId: string; programmeId: string; title: string; skillsAcquired: string[]; grade?: string }) =>
      request<any>('/certifications/issue', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    verifyPublic: (code: string) =>
      request<any>(`/certifications/${encodeURIComponent(code.trim().toUpperCase())}/verify`, {}, true),
  },

  // Employment Exchange
  employment: {
    getJobs: () => request<any[]>('/employment/jobs'),
    postJob: (dto: any) =>
      request<any>('/employment/jobs', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    getEmployers: () => request<any[]>('/employment/employers'),
    matchCandidates: (jobId: string) =>
      request<MatchResult>(`/employment/jobs/${jobId}/candidates`),
    applyJob: (jobId: string, traineeId: string) =>
      request<any>(`/employment/jobs/${jobId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ jobPostingId: jobId, traineeId }),
      }),
    getApplications: (jobId?: string) => {
      const q = jobId ? `?jobId=${jobId}` : '';
      return request<any[]>(`/employment/applications${q}`);
    },
    recordOutcome: (dto: any) =>
      request<any>('/employment/outcomes', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
  },

  // Career AI Assistant
  career: {
    recommendations: (traineeId: string) =>
      request<{ trainee: any; topJobMatches: any[]; recommendedSkillsToLearn: string[]; recommendedProgrammes: any[] }>(`/career/recommendations?traineeId=${encodeURIComponent(traineeId)}`),
    /** traineeId is optional: without it the server resolves the caller's own profile (or answers generically). */
    chat: (traineeId: string | undefined, message: string) =>
      request<{ reply: string; intent?: string; actionableLinks?: string[] }>(
        '/career/chat',
        {
          method: 'POST',
          body: JSON.stringify({ ...(traineeId && { traineeId }), message }),
        },
      ),
  },
};
