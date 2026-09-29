import React from 'react';
import {
  X,
  Shield,
  GraduationCap,
  ClipboardList,
  UserCheck,
  Briefcase,
  Users,
  CheckCircle,
} from 'lucide-react';
import { DEMO_PERSONAS, UserPersona } from '../types';

interface PersonaModalProps {
  currentPersona: UserPersona;
  onSelectPersona: (persona: UserPersona) => void;
  onClose: () => void;
}

export const PersonaModal: React.FC<PersonaModalProps> = ({
  currentPersona,
  onSelectPersona,
  onClose,
}) => {
  const getPersonaIcon = (role: string) => {
    switch (role) {
      case 'NCCT_ADMIN':
        return Shield;
      case 'RICM_DIRECTOR':
        return GraduationCap;
      case 'RICM_COORDINATOR':
        return ClipboardList;
      case 'TRAINER':
        return UserCheck;
      case 'TRAINEE':
        return Users;
      case 'RECRUITER':
        return Briefcase;
      default:
        return UserCheck;
    }
  };

  const getPersonaBadge = (role: string) => {
    switch (role) {
      case 'NCCT_ADMIN':
        return { label: 'Apex National Admin', color: 'badge-emerald' };
      case 'RICM_DIRECTOR':
        return { label: 'RICM Executive', color: 'badge-gold' };
      case 'RICM_COORDINATOR':
        return { label: 'Operations Lead', color: 'badge-cyan' };
      case 'TRAINER':
        return { label: 'Senior Trainer', color: 'badge-indigo' };
      case 'TRAINEE':
        return { label: 'Rural Youth / Trainee', color: 'badge-emerald' };
      case 'RECRUITER':
        return { label: 'Coop Employer', color: 'badge-gold' };
      default:
        return { label: role, color: 'badge-emerald' };
    }
  };

  const getCapabilities = (role: string): string[] => {
    switch (role) {
      case 'NCCT_ADMIN':
        return [
          'National Command Center & aggregate KPIs across all 14 RICMs & 5 ICMs',
          'State-wise cooperative training analytics & budget utilization',
          'Unified policy, curriculum syllabus, and certification standards',
        ];
      case 'RICM_DIRECTOR':
        return [
          'Institute operations dashboard & batch performance monitoring',
          'Hostel capacity oversight & logistical supply kit tracking',
          'Digital certificate issuance with cryptographic keys & verification',
        ];
      case 'RICM_COORDINATOR':
        return [
          'Review & approve candidate self-registrations and institutional quotas',
          'Create training batches & timetable slots with auto-conflict detection',
          'Track resource allocation and session delivery timelines',
        ];
      case 'TRAINER':
        return [
          'Generate dynamic rotating QR codes (60s rotation counter)',
          'Decoupled facial attendance verification with biometric privacy consent',
          'Conduct interactive sessions, monitor attendance rates & grades',
        ];
      case 'TRAINEE':
        return [
          'Multilingual LMS (English, Hindi, Telugu) with offline sync queue',
          'Scan dynamic rotating QR codes to register session attendance',
          'View tamper-proof certificates & apply to matched cooperative jobs',
          'Chat with Grounded AI Career Counselor Assistant',
        ];
      case 'RECRUITER':
        return [
          'Publish cooperative job vacancies with target skill competencies',
          'AI Candidate Skill-Matching Engine with % competency match scoring',
          'Review candidate portfolios and record verified placement offers',
        ];
      default:
        return ['Access NCCT platform features based on assigned role.'];
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(4, 8, 16, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          position: 'relative',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            color: 'var(--text-muted)',
            padding: '0.4rem',
            borderRadius: '50%',
            background: 'var(--bg-surface-2)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-emerald">Interactive Persona Switcher</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• Complete Role Walkthrough</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', color: '#ffffff', margin: '0.2rem 0' }}>
            Select Persona to Test Role-Specific Workflows
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Instantly switch authentication and test any role in the NCCT multi-tenant ecosystem.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(390px, 1fr))',
            gap: '1rem',
          }}
        >
          {DEMO_PERSONAS.map((p) => {
            const Icon = getPersonaIcon(p.role);
            const badge = getPersonaBadge(p.role);
            const isCurrent = currentPersona.id === p.id;
            const capabilities = getCapabilities(p.role);

            return (
              <div
                key={p.id}
                onClick={() => {
                  onSelectPersona(p);
                  onClose();
                }}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: isCurrent
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isCurrent
                    ? '1px solid rgba(16, 185, 129, 0.5)'
                    : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isCurrent
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'var(--bg-surface-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary-400)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', color: '#ffffff', margin: 0 }}>{p.name}</h4>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.title}</div>
                    </div>
                  </div>
                  <span className={`badge ${badge.color}`}>{badge.label}</span>
                </div>

                <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Key Capabilities & Views
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {capabilities.map((c, i) => (
                      <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle size={12} color="#10b981" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {p.email}
                  </span>
                  <span className="btn btn-primary btn-sm" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>
                    {isCurrent ? 'Active Persona' : 'Select Role →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
