import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { ROLE_META, toUiRole, type UserPersona } from '../types';

interface AuthState {
  persona: UserPersona | null;
  /** True while a stored session is being verified against the API. */
  restoring: boolean;
  login: (email: string, password: string) => Promise<UserPersona>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

async function buildPersona(user: any, org: any): Promise<UserPersona> {
  const role = toUiRole(org?.role, user?.isSuperAdmin && org?.role === 'NCCT_ADMIN');
  let traineeId: string | undefined;
  if (role === 'TRAINEE') {
    try {
      const dash = await api.analytics.getTrainee();
      traineeId = dash?.traineeId;
    } catch {
      // Trainee profile unavailable; views that need it surface their own state.
    }
  }
  return {
    id: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
    email: user.email,
    role,
    title: ROLE_META[role].label,
    instituteName: org?.name ?? '',
    organizationId: org?.id ?? '',
    traineeId,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<UserPersona | null>(null);
  const [restoring, setRestoring] = useState<boolean>(() => api.auth.hasSession());

  const logout = useCallback(() => {
    api.auth.logout();
    setPersona(null);
    try { sessionStorage.removeItem('ncct_booted'); } catch { /* storage unavailable */ }
  }, []);

  // Restore a stored session by verifying it against the API.
  useEffect(() => {
    if (!api.auth.hasSession()) return;
    let cancelled = false;
    (async () => {
      const stored = api.auth.getStored();
      try {
        await api.auth.me(); // throws (after refresh attempt) if the session is dead
        if (!stored) throw new Error('missing stored profile');
        const p = await buildPersona(stored.user, stored.org);
        if (!cancelled) setPersona(p);
      } catch {
        api.auth.logout();
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setPersona(null);
    window.addEventListener('ncct:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ncct:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.auth.login(email, password);
    const p = await buildPersona(data.user, data.activeOrganization);
    setPersona(p);
    return p;
  }, []);

  const value = useMemo(() => ({ persona, restoring, login, logout }), [persona, restoring, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
