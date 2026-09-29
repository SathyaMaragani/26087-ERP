import React, { useState } from 'react';
import {
  X,
  Search,
  CheckCircle,
  AlertTriangle,
  Award,
  ShieldCheck,
  Building2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';

interface PublicVerifyModalProps {
  isOpen?: boolean;
  onClose: () => void;
  initialCode?: string;
}

export const PublicVerifyModal: React.FC<PublicVerifyModalProps> = ({
  isOpen = true,
  onClose,
  initialCode = '',
}) => {
  const [code, setCode] = useState(initialCode || 'NCCT-2026-F8102B');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await api.certifications.verifyPublic(code.trim());
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Verification lookup failed');
      setResult(null);
    } finally {
      setLoading(false);
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
        backdropFilter: 'blur(16px)',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          position: 'relative',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: '0 0 30px rgba(245, 158, 11, 0.15)',
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
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)',
            }}
          >
            <ShieldCheck size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="badge badge-gold">Public National Registry</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• Zero Auth Required</span>
            </div>
            <h3 style={{ fontSize: '1.35rem', color: '#ffffff', marginTop: '0.2rem' }}>
              NCCT Verifiable Digital Certificate Engine
            </h3>
          </div>
        </div>

        <form onSubmit={handleVerify} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter Certificate Code (e.g. NCCT-2026-F8102B)"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
          />
          <button
            type="submit"
            className="btn btn-gold"
            disabled={loading}
            style={{ whiteSpace: 'nowrap' }}
          >
            <Search size={16} />
            <span>{loading ? 'Verifying...' : 'Verify Authenticity'}</span>
          </button>
        </form>

        {error && (
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {result && result.isValid && result.certificate && (
          <div
            className="animate-fade-in"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(6, 78, 59, 0.25) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Holographic Watermark Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={22} color="#10b981" />
                <span style={{ fontWeight: 700, color: '#34d399', letterSpacing: '0.03em' }}>
                  GENUINE NCCT CREDENTIAL VERIFIED
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  color: 'var(--accent-gold-light)',
                  fontWeight: 600,
                }}
              >
                {result.certificate.certificateNumber}
              </span>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Credential Conferred
              </div>
              <h3 style={{ fontSize: '1.3rem', color: '#ffffff', marginTop: '0.2rem' }}>
                {result.certificate.title}
              </h3>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                marginTop: '1.25rem',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.25)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Certified Recipient</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>
                  {result.certificate.recipient.name}
                </div>
                {result.certificate.recipient.cooperativeAffiliation && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--primary-400)' }}>
                    Affiliation: {result.certificate.recipient.cooperativeAffiliation}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Issuing Institution</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff' }}>
                  {result.certificate.issuingAuthority.institution}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  State: {result.certificate.issuingAuthority.state || 'National HQ'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Date of Issuance</div>
                <div style={{ fontSize: '0.88rem', color: '#ffffff' }}>
                  {new Date(result.certificate.issuedDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Grade / Standing</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--accent-gold-light)', fontWeight: 600 }}>
                  {result.certificate.grade || 'Passed with Distinction'}
                </div>
              </div>
            </div>

            {/* Verified Skills */}
            {result.certificate.skillsAcquired && result.certificate.skillsAcquired.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Cryptographically Endorsed Competencies
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {result.certificate.skillsAcquired.map((skill: string, idx: number) => (
                    <span key={idx} className="badge badge-emerald">
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
