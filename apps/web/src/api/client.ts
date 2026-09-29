const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isPublic = false,
): Promise<T> {
  const token = localStorage.getItem('ncct_token');
  const tenantId = localStorage.getItem('ncct_tenant_id');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!isPublic && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = json?.error?.message || json?.message || `HTTP error ${response.status}`;
    throw new ApiError(response.status, errorMsg, json);
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Auth
  auth: {
    login: async (email: string, password = 'Admin@123') => {
      const data = await request<{
        accessToken: string;
        refreshToken: string;
        user: any;
        activeOrganization: any;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }, true);

      localStorage.setItem('ncct_token', data.accessToken);
      localStorage.setItem('ncct_refresh_token', data.refreshToken);
      if (data.activeOrganization?.id) {
        localStorage.setItem('ncct_tenant_id', data.activeOrganization.id);
      }
      localStorage.setItem('ncct_user', JSON.stringify(data.user));
      return data;
    },
    logout: () => {
      localStorage.removeItem('ncct_token');
      localStorage.removeItem('ncct_refresh_token');
      localStorage.removeItem('ncct_tenant_id');
      localStorage.removeItem('ncct_user');
    },
    getCurrentUser: () => {
      try {
        const u = localStorage.getItem('ncct_user');
        return u ? JSON.parse(u) : null;
      } catch {
        return null;
      }
    },
  },

  // Analytics
  analytics: {
    getCommandCenter: () => request<any>('/analytics/ncct-command-center'),
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

  // Nominations & Registrations
  nominations: {
    list: (params?: { programmeId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.programmeId) q.append('programmeId', params.programmeId);
      if (params?.status) q.append('status', params.status);
      return request<any[]>(`/nominations?${q.toString()}`);
    },
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
    matchCandidates: (jobId: string) =>
      request<{ topMatches: any[]; totalMatched: number }>(`/employment/jobs/${jobId}/candidates`),
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
    chat: (traineeId: string, message: string) =>
      request<{ reply: string; intent?: string; recommendations?: any }>(
        '/career/chat',
        {
          method: 'POST',
          body: JSON.stringify({ traineeId, message }),
        },
      ),
  },
};
