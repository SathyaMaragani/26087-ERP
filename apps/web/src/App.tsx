import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './state/auth';
import { ToastProvider } from './state/toast';
import { OfflineProvider } from './state/offline';
import { navigate, useRoute } from './lib/route';
import { SceneHost } from './scene/SceneHost';
import { sceneStore } from './scene/sceneStore';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { BootSequence } from './pages/BootSequence';
import { AppShell } from './shell/AppShell';
import { PublicVerifyModal } from './components/PublicVerifyModal';

const BOOT_FLAG = 'ncct_booted';
const readBooted = () => { try { return sessionStorage.getItem(BOOT_FLAG) === '1'; } catch { return false; } };
const writeBooted = () => { try { sessionStorage.setItem(BOOT_FLAG, '1'); } catch { /* storage unavailable */ } };

function Root() {
  const route = useRoute();
  const { persona, restoring, logout } = useAuth();
  const [booted, setBooted] = useState(readBooted);
  const [sceneAlive, setSceneAlive] = useState(true);

  const wantsApp = route.name === 'app';
  const booting = !!persona && wantsApp && !booted;
  const inApp = !!persona && wantsApp && booted;

  // Route guards.
  useEffect(() => {
    if (restoring) return;
    if (wantsApp && !persona) navigate('#/login');
    else if (route.name === 'login' && persona) navigate('#/app');
  }, [route.name, wantsApp, persona, restoring]);

  // A signed-out session must boot again next time.
  useEffect(() => { if (!persona && !restoring) setBooted(false); }, [persona, restoring]);

  useEffect(() => { window.scrollTo(0, 0); }, [route.name]);

  // The environment flies inward while the platform initialises.
  useEffect(() => {
    if (!booting) return;
    sceneStore.damping = 1.1;
    sceneStore.parallax = 0.25;
    sceneStore.tint = null;
    sceneStore.target = 1;
  }, [booting]);

  // Release the GPU once the application has fully taken over.
  useEffect(() => {
    if (!inApp && route.name !== 'landing' && route.name !== 'login') { setSceneAlive(true); return; }
    const t = window.setTimeout(() => setSceneAlive(false), 1000);
    return () => window.clearTimeout(t);
  }, [inApp, route.name]);

  const onBootDone = useCallback(() => { writeBooted(); setBooted(true); }, []);
  const onLogout = useCallback(() => { logout(); navigate('#/'); }, [logout]);

  return (
    <>
      {/* The dark ink-blue 3D scene is the landing hero's own backdrop; the rest of the site
          (login onward) is Monsoon Porcelain now, so it has no use for that scene either. */}
      {sceneAlive && <SceneHost hidden={inApp || route.name === 'landing' || route.name === 'login'} />}

      {(route.name === 'landing' || route.name === 'verify') && <Landing signedIn={!!persona} />}
      {route.name === 'login' && !persona && !restoring && <Login />}
      {wantsApp && restoring && <div className="restoring" role="status">Restoring your session…</div>}
      {inApp && persona && <AppShell persona={persona} moduleParam={route.param} onLogout={onLogout} />}

      <AnimatePresence>
        {booting && persona && <BootSequence key="boot" persona={persona} onDone={onBootDone} />}
      </AnimatePresence>

      <PublicVerifyModal isOpen={route.name === 'verify'} initialCode={route.param} onClose={() => navigate(persona && booted ? '#/app' : '#/')} />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <OfflineProvider>
          <Root />
        </OfflineProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
