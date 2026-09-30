import { useCallback, useEffect, useState } from 'react';

/**
 * Minimal hash router. Routes:
 *   #/                 landing
 *   #/login            sign in
 *   #/app              application (default module for the role)
 *   #/app/<module>     application, specific module
 *   #/verify/<code>    public certificate verification
 */
export interface Route {
  name: 'landing' | 'login' | 'app' | 'verify';
  param?: string;
}

function parse(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\//, '');
  const [head, ...rest] = path.split('/');
  const param = rest.join('/') || undefined;
  if (head === 'login') return { name: 'login' };
  if (head === 'app') return { name: 'app', param };
  if (head === 'verify') return { name: 'verify', param };
  return { name: 'landing' };
}

export function navigate(to: string) {
  if (window.location.hash === to) return;
  window.location.hash = to;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function useNavigate() {
  return useCallback((to: string) => navigate(to), []);
}
