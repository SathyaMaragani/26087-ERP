import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { navigate } from '../lib/route';
import { useOffline } from '../state/offline';
import type { UserPersona } from '../types';
import { HomeView } from '../features/home';
import { SignalLine } from '../motion/primitives';
import { CommandPalette } from './CommandPalette';
import { modulesFor, MODULES, type ModuleId } from './modules';
import { Rail } from './Rail';
import { pageVariants, transitionFor, type TransitionCtx } from './transitions';
import { MasterLifecycle } from '../ui/Lifecycle';
import { TopBar } from './TopBar';
import { ProgrammesView } from '../components/ProgrammesView';
import { NominationsView } from '../components/NominationsView';
import { TraineesView } from '../components/TraineesView';
import { TimetableView } from '../components/TimetableView';
import { AttendanceStudioView } from '../components/AttendanceStudioView';
import { HostelLogisticsView } from '../components/HostelLogisticsView';
import { LmsView } from '../components/LmsView';
import { CertificatesView } from '../components/CertificatesView';
import { EmploymentExchangeView } from '../components/EmploymentExchangeView';
import { CareerAssistantView } from '../components/CareerAssistantView';
import { PublicVerifyModal } from '../components/PublicVerifyModal';
import { SkillsView } from '../components/SkillsView';
import { AnalyticsView } from '../components/AnalyticsView';
import { EcosystemView } from '../features/ecosystem/EcosystemView';

interface Props { persona: UserPersona; moduleParam?: string; onLogout: () => void }

export function AppShell({ persona, moduleParam, onLogout }: Props) {
  const offline = useOffline();
  const allowed = useMemo(() => modulesFor(persona.role), [persona.role]);
  const order = useMemo(() => allowed.map((m) => m.id), [allowed]);
  const current: ModuleId = allowed.some((m) => m.id === moduleParam) ? (moduleParam as ModuleId) : 'home';
  const currentDef = MODULES.find((m) => m.id === current)!;

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  // Where we came from decides how we arrive.
  const prev = useRef<ModuleId | null>(null);
  const ctx = useMemo<TransitionCtx>(() => transitionFor(prev.current, current, order), [current, order]);
  useEffect(() => {
    prev.current = current;
  }, [current]);

  // Normalise the URL when the requested module isn't available to this role.
  useEffect(() => { if (moduleParam && moduleParam !== current) navigate('#/app'); }, [moduleParam, current]);
  useEffect(() => { document.title = `${currentDef.label} · NCCT`; }, [currentDef.label]);

  // Global command layer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((o) => !o); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = useCallback((id: ModuleId) => navigate(id === 'home' ? '#/app' : `#/app/${id}`), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const openVerify = useCallback(() => setVerifyOpen(true), []);

  const view = (() => {
    switch (current) {
      case 'home': return <HomeView persona={persona} onNavigate={go} />;
      case 'programmes': return <ProgrammesView />;
      case 'nominations': return <NominationsView currentPersona={persona} />;
      case 'trainees': return <TraineesView persona={persona} onNavigate={go} />;
      case 'timetable': return <TimetableView currentPersona={persona} />;
      case 'attendance': return <AttendanceStudioView persona={persona} />;
      case 'hostel-logistics': return <HostelLogisticsView />;
      case 'lms': return <LmsView persona={persona} />;
      case 'certificates': return <CertificatesView currentPersona={persona} onOpenPublicVerify={openVerify} />;
      case 'employment': return <EmploymentExchangeView currentPersona={persona} />;
      case 'skills': return <SkillsView persona={persona} />;
      case 'analytics': return <AnalyticsView persona={persona} />;
      case 'ecosystem': return <EcosystemView persona={persona} onNavigate={go} />;
      case 'career': return <CareerAssistantView currentPersona={persona} onNavigateTab={(t: string) => go(t as ModuleId)} />;
    }
  })();

  return (
    <div className="shell" data-module={current}>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <Rail persona={persona} current={current} onNavigate={go} />
      <div className="shell-main">
        <TopBar persona={persona} crumb={currentDef.label} onOpenPalette={() => setPaletteOpen(true)} onVerify={openVerify} onLogout={onLogout} />
        <main id="main" tabIndex={-1} className="shell-content">
          <SignalLine trigger={current} />
          <MasterLifecycle role={persona.role} current={current} onNavigate={go} />
          <AnimatePresence mode="wait" initial={false} custom={ctx}>
            <motion.div key={current} className="page" custom={ctx} variants={pageVariants} initial="initial" animate="animate" exit="exit">
              {view}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={closePalette} persona={persona} onNavigate={go} onVerify={openVerify} onToggleOffline={offline.toggleSimulated} onLogout={onLogout} />
      <PublicVerifyModal isOpen={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </div>
  );
}
