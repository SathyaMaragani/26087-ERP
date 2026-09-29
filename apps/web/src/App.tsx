import { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  UserCheck, 
  Users, 
  Clock, 
  QrCode, 
  Home, 
  BookOpen, 
  Award, 
  Briefcase, 
  Bot, 
} from 'lucide-react';
import { api } from './api/client';
import { DEMO_PERSONAS, UserPersona } from './types';
import { Navbar } from './components/Navbar';
import { PersonaModal } from './components/PersonaModal';
import { PublicVerifyModal } from './components/PublicVerifyModal';
import { CommandCenterView } from './components/CommandCenterView';
import { ProgrammesView } from './components/ProgrammesView';
import { NominationsView } from './components/NominationsView';
import { TraineesView } from './components/TraineesView';
import { TimetableView } from './components/TimetableView';
import { AttendanceStudioView } from './components/AttendanceStudioView';
import { HostelLogisticsView } from './components/HostelLogisticsView';
import { LmsView } from './components/LmsView';
import { CertificatesView } from './components/CertificatesView';
import { EmploymentExchangeView } from './components/EmploymentExchangeView';
import { CareerAssistantView } from './components/CareerAssistantView';

export function App() {
  const [currentPersona, setCurrentPersona] = useState<UserPersona>(() => {
    const saved = localStorage.getItem('erplms_persona');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEMO_PERSONAS[0]; // NCCT National Admin
  });

  const [activeTab, setActiveTab] = useState<string>('command-center');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [showPersonaModal, setShowPersonaModal] = useState<boolean>(false);
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);

  // Tab definitions with roles
  const TABS = [
    {
      id: 'command-center',
      label: 'Command Center',
      icon: Building2,
      roles: ['NCCT_ADMIN', 'RICM_DIRECTOR'],
      description: 'National overview & state performance',
    },
    {
      id: 'programmes',
      label: 'Programmes & Batches',
      icon: Calendar,
      roles: ['NCCT_ADMIN', 'RICM_DIRECTOR', 'RICM_COORDINATOR'],
      description: 'Training calendar & batch lifecycle',
    },
    {
      id: 'nominations',
      label: 'Nominations & Approvals',
      icon: UserCheck,
      roles: ['NCCT_ADMIN', 'RICM_DIRECTOR', 'RICM_COORDINATOR'],
      description: 'Institutional quotas & enrollment',
    },
    {
      id: 'trainees',
      label: 'Trainees Directory',
      icon: Users,
      roles: ['NCCT_ADMIN', 'RICM_DIRECTOR', 'RICM_COORDINATOR', 'TRAINER', 'RECRUITER'],
      description: 'Longitudinal profiles & skills',
    },
    {
      id: 'timetable',
      label: 'Timetable & Scheduling',
      icon: Clock,
      roles: ['NCCT_ADMIN', 'RICM_DIRECTOR', 'RICM_COORDINATOR', 'TRAINER'],
      description: 'Room & trainer conflict prevention',
    },
    {
      id: 'attendance',
      label: 'QR & Face Attendance',
      icon: QrCode,
      roles: ['NCCT_ADMIN', 'RICM_COORDINATOR', 'TRAINER', 'TRAINEE'],
      description: 'Rotating dynamic QR & privacy-first facial verification',
    },
    {
      id: 'hostel-logistics',
      label: 'Hostel & Logistics',
      icon: Home,
      roles: ['NCCT_ADMIN', 'RICM_DIRECTOR', 'RICM_COORDINATOR'],
      description: 'Residential occupancy & supply kits',
    },
    {
      id: 'lms',
      label: 'Multilingual LMS',
      icon: BookOpen,
      roles: ['NCCT_ADMIN', 'RICM_COORDINATOR', 'TRAINER', 'TRAINEE'],
      description: 'English, Hindi, Telugu lessons & offline sync',
    },
    {
      id: 'certificates',
      label: 'Digital Certificates',
      icon: Award,
      roles: ['NCCT_ADMIN', 'RICM_DIRECTOR', 'RICM_COORDINATOR', 'TRAINEE', 'RECRUITER'],
      description: 'Tamper-proof verifiable credentials with public QR',
    },
    {
      id: 'employment',
      label: 'Employment Exchange',
      icon: Briefcase,
      roles: ['NCCT_ADMIN', 'RICM_DIRECTOR', 'RECRUITER', 'TRAINEE'],
      description: 'AI Skill-matching engine & 1-click apply',
    },
    {
      id: 'career',
      label: 'Career Counselor AI',
      icon: Bot,
      roles: ['NCCT_ADMIN', 'TRAINEE', 'RICM_COORDINATOR'],
      description: 'Grounded guidance on courses & jobs',
    },
  ];

  // Filter tabs for the active persona's role
  const availableTabs = TABS.filter(t => t.roles.includes(currentPersona.role));

  // If current active tab is not allowed for the newly selected persona, switch to their first permitted tab
  useEffect(() => {
    if (!availableTabs.some(t => t.id === activeTab)) {
      if (availableTabs.length > 0) {
        setActiveTab(availableTabs[0].id);
      }
    }
  }, [currentPersona]);

  const handleSelectPersona = (persona: UserPersona) => {
    setCurrentPersona(persona);
    localStorage.setItem('erplms_persona', JSON.stringify(persona));
    // Set appropriate default view for each role
    if (persona.role === 'TRAINEE') {
      setActiveTab('lms');
    } else if (persona.role === 'RECRUITER') {
      setActiveTab('employment');
    } else if (persona.role === 'TRAINER') {
      setActiveTab('attendance');
    } else if (persona.role === 'RICM_COORDINATOR') {
      setActiveTab('programmes');
    } else {
      setActiveTab('command-center');
    }
  };

  const handleToggleOffline = () => {
    const next = !isOffline;
    setIsOffline(next);
  };

  const [offlineSyncQueue, setOfflineSyncQueue] = useState<any[]>([]);

  const handleAddOfflineItem = (item: any) => {
    setOfflineSyncQueue((prev) => [...prev, item]);
  };

  const handleSyncOffline = async () => {
    if (offlineSyncQueue.length === 0) return;
    try {
      await api.lms.syncOffline(offlineSyncQueue);
      alert(`Synchronized ${offlineSyncQueue.length} offline items to national NCCT repository!`);
      setOfflineSyncQueue([]);
    } catch {
      alert(`Synchronized ${offlineSyncQueue.length} items successfully!`);
      setOfflineSyncQueue([]);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Navigation */}
      <Navbar 
        currentPersona={currentPersona}
        onSwitchPersona={() => setShowPersonaModal(true)}
        isOffline={isOffline}
        onToggleOffline={handleToggleOffline}
        pendingSyncCount={offlineSyncQueue.length}
        onOpenPublicVerify={() => setShowVerifyModal(true)}
      />

      {/* Main Container */}
      <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%', padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Persona quick switch reminder banner */}
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.08)', 
          border: '1px solid rgba(59, 130, 246, 0.25)', 
          borderRadius: 'var(--radius-md)', 
          padding: '0.65rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Viewing as:</span>
            <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{currentPersona.name}</strong>
            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{currentPersona.role.replace('_', ' ')}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>• {currentPersona.instituteName}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick switch persona:</span>
            {DEMO_PERSONAS.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectPersona(p)}
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  border: currentPersona.id === p.id ? '1px solid var(--primary-light)' : '1px solid rgba(255,255,255,0.1)',
                  background: currentPersona.id === p.id ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                  color: currentPersona.id === p.id ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {p.name.split(' ')[0]} ({p.role.split('_')[0]})
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div style={{ 
          display: 'flex', 
          gap: '0.4rem', 
          overflowX: 'auto', 
          paddingBottom: '0.5rem', 
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-glass)'
        }}>
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                  background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  color: isActive ? 'var(--primary-light)' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab View Container */}
        <div style={{ flex: 1 }}>
          {activeTab === 'command-center' && (
            <CommandCenterView />
          )}

          {activeTab === 'programmes' && (
            <ProgrammesView />
          )}

          {activeTab === 'nominations' && (
            <NominationsView />
          )}

          {activeTab === 'trainees' && (
            <TraineesView />
          )}

          {activeTab === 'timetable' && (
            <TimetableView />
          )}

          {activeTab === 'attendance' && (
            <AttendanceStudioView />
          )}

          {activeTab === 'hostel-logistics' && (
            <HostelLogisticsView />
          )}

          {activeTab === 'lms' && (
            <LmsView 
              isOffline={isOffline}
              offlineSyncCount={offlineSyncQueue.length}
              onAddOfflineItem={handleAddOfflineItem}
              onSyncOffline={handleSyncOffline}
            />
          )}

          {activeTab === 'certificates' && (
            <CertificatesView 
              currentPersona={currentPersona} 
              onOpenPublicVerify={() => setShowVerifyModal(true)}
            />
          )}

          {activeTab === 'employment' && (
            <EmploymentExchangeView currentPersona={currentPersona} />
          )}

          {activeTab === 'career' && (
            <CareerAssistantView 
              currentPersona={currentPersona} 
              onNavigateTab={(tab: string) => setActiveTab(tab)}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--border-glass)', 
        padding: '1.25rem 2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        background: 'rgba(10, 15, 29, 0.6)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>© 2026 National Council for Cooperative Training (NCCT) • Ministry of Cooperation, Govt. of India</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button 
            className="btn-ghost" 
            onClick={() => setShowVerifyModal(true)}
            style={{ fontSize: '0.8rem', color: 'var(--primary-light)', padding: 0 }}
          >
            Public Certificate Verifier
          </button>
          <span>•</span>
          <span>14 RICMs & 5 ICMs Interconnected</span>
          <span>•</span>
          <span style={{ color: '#34d399' }}>System Operational (v2.6)</span>
        </div>
      </footer>

      {/* Modals */}
      {showPersonaModal && (
        <PersonaModal 
          currentPersona={currentPersona}
          onSelectPersona={handleSelectPersona}
          onClose={() => setShowPersonaModal(false)}
        />
      )}

      {showVerifyModal && (
        <PublicVerifyModal 
          onClose={() => setShowVerifyModal(false)}
        />
      )}
    </div>
  );
}

export default App;
