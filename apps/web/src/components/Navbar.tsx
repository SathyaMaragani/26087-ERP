import React from 'react';
import {
  ShieldCheck,
  Search,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { UserPersona } from '../types';

interface NavbarProps {
  currentPersona: UserPersona;
  onSwitchPersona: () => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  pendingSyncCount: number;
  onOpenPublicVerify: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPersona,
  onSwitchPersona,
  isOffline,
  onToggleOffline,
  pendingSyncCount,
  onOpenPublicVerify,
}) => {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(8, 12, 20, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0.75rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <ShieldCheck size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(90deg, #ffffff 0%, #a7f3d0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                NCCT
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                National Ecosystem
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              National Council for Cooperative Training • Ministry of Cooperation
            </div>
          </div>
        </div>

        {/* Right Utility Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Public Certificate Verifier Trigger */}
          <button
            onClick={onOpenPublicVerify}
            className="btn btn-secondary btn-sm"
            title="Publicly verify any NCCT certificate QR code"
          >
            <Search size={14} />
            <span>Verify Certificate</span>
          </button>

          {/* Rural Offline Simulation Toggle */}
          <button
            onClick={onToggleOffline}
            className={`btn btn-sm ${isOffline ? 'btn-danger' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Toggle rural offline network simulation"
          >
            {isOffline ? <WifiOff size={14} /> : <Wifi size={14} color="#10b981" />}
            <span>{isOffline ? 'Offline Mode' : 'Online'}</span>
            {pendingSyncCount > 0 && (
              <span
                className="badge badge-gold"
                style={{ marginLeft: '0.2rem' }}
                title="Pending offline sync queue"
              >
                {pendingSyncCount} queued
              </span>
            )}
          </button>

          {/* Persona Switcher Quick Button */}
          <button
            onClick={onSwitchPersona}
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          >
            <Sparkles size={14} />
            <span>Switch Persona</span>
          </button>

          {/* Active User Badge / Organization */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'var(--primary-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              {currentPersona.name?.[0] || 'U'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                {currentPersona.name}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--primary-400)', fontWeight: 600 }}>
                  {currentPersona.role}
                </span>
                {' • '}{currentPersona.instituteName.split(',')[0]}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
