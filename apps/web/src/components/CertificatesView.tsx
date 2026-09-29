import React, { useEffect, useState } from 'react';
import {
  Award,
  ShieldCheck,
  Search,
  ExternalLink,
  Plus,
  QrCode,
  Download,
  Share2,
} from 'lucide-react';
import { api } from '../api/client';
import { Certificate, UserPersona } from '../types';

interface CertificatesViewProps {
  currentPersona: UserPersona;
  onOpenPublicVerify: (code?: string) => void;
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({
  currentPersona,
  onOpenPublicVerify,
}) => {
  const canIssue = ['NCCT_ADMIN', 'RICM_DIRECTOR', 'RICM_COORDINATOR'].includes(currentPersona.role);

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Issue Form states
  const [traineeId, setTraineeId] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [title, setTitle] = useState('NCCT Certificate in Smart Agri-Business & PACS Management');
  const [skillsStr, setSkillsStr] = useState('PACS Accounting, Digital Payments & UPI, FPO Governance');
  const [trainees, setTrainees] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const [certs, trns, progs] = await Promise.all([
        api.certifications.list(),
        api.trainees.list(),
        api.programmes.list(),
      ]);
      setCertificates(certs || []);
      setTrainees(trns || []);
      setProgrammes(progs || []);
      if (trns && trns.length > 0 && !traineeId) setTraineeId(trns[0].id);
      if (progs && progs.length > 0 && !programmeId) setProgrammeId(progs[0].id);
    } catch (err) {
      console.error('Failed to load certificates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traineeId || !programmeId) return;

    try {
      const skillsAcquired = skillsStr.split(',').map((s) => s.trim()).filter(Boolean);
      await api.certifications.issue({
        traineeId,
        programmeId,
        title,
        skillsAcquired,
        grade: 'Distinction (A+)',
      });
      setShowIssueModal(false);
      fetchCertificates();
    } catch (err: any) {
      alert(`Certificate issuance failed: ${err.message}`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-emerald">Credential Registry</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• Publicly Verifiable QR</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', color: '#ffffff', marginTop: '0.25rem' }}>
            Digital Certifications & Public QR Verification
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Tamper-proof digital credentials verifiable via open QR lookup without compromising trainee privacy.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => onOpenPublicVerify()} className="btn btn-secondary btn-sm">
            <Search size={14} />
            <span>Verify Any Certificate</span>
          </button>
          {canIssue && (
            <button onClick={() => setShowIssueModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} />
              <span>Issue Certificate</span>
            </button>
          )}
        </div>
      </div>

      {/* Certificates Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {certificates.map((c) => (
          <div
            key={c.id}
            className="glass-panel"
            style={{
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1.25rem',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(6, 78, 59, 0.2) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={20} color="#fbbf24" />
                  <span className="badge badge-emerald">Valid Certificate</span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    color: 'var(--accent-gold-light)',
                    fontWeight: 600,
                  }}
                >
                  {c.certificateNumber}
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginTop: '0.85rem' }}>
                {c.title}
              </h3>

              <div style={{ marginTop: '0.75rem', fontSize: '0.88rem' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Issued To:</div>
                <div style={{ fontWeight: 600, color: '#ffffff' }}>
                  {c.trainee?.user?.firstName ? `${c.trainee.user.firstName} ${c.trainee.user.lastName}` : 'Ramesh Kumar'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Trainee ID: {c.trainee?.traineeCode || 'TRN-2026-001'}
                </div>
              </div>

              {/* Skills badges */}
              {c.skillsAcquired && c.skillsAcquired.length > 0 && (
                <div style={{ marginTop: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Verified Competencies
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {c.skillsAcquired.map((skill, sIdx) => (
                      <span key={sIdx} className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                        ✓ {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => onOpenPublicVerify(c.certificateNumber)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <QrCode size={14} color="#10b981" />
                <span>QR Verification View</span>
              </button>

              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button
                  onClick={() => alert(`Simulated downloading PDF for ${c.certificateNumber}`)}
                  className="btn btn-secondary btn-sm"
                  title="Download Certificate PDF"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(c.qrVerificationUrl || `${window.location.origin}/verify/${c.certificateNumber}`);
                    alert('Verification link copied to clipboard!');
                  }}
                  className="btn btn-secondary btn-sm"
                  title="Copy verification link"
                >
                  <Share2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Issue Certificate Modal */}
      {showIssueModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(4, 8, 16, 0.8)',
            backdropFilter: 'blur(12px)',
            padding: '1.5rem',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.35rem', color: '#ffffff', marginBottom: '1rem' }}>
              Issue NCCT Digital Certificate
            </h3>
            <form onSubmit={handleIssueCertificate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select Trainee</label>
                <select value={traineeId} onChange={(e) => setTraineeId(e.target.value)} required>
                  {trainees.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user?.firstName} {t.user?.lastName} ({t.traineeCode} - {t.cooperativeName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Completed Programme</label>
                <select value={programmeId} onChange={(e) => setProgrammeId(e.target.value)} required>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Certificate Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Acquired Skills (Comma separated)
                </label>
                <input
                  type="text"
                  required
                  value={skillsStr}
                  onChange={(e) => setSkillsStr(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Sign & Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
