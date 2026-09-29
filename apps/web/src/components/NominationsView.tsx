import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Building,
  User,
  Plus,
} from 'lucide-react';
import { api } from '../api/client';
import { ProgrammeRegistration, TrainingProgramme } from '../types';

interface NominationsViewProps {
  canApprove?: boolean;
}

export const NominationsView: React.FC<NominationsViewProps> = ({ canApprove = true }) => {
  const [nominations, setNominations] = useState<ProgrammeRegistration[]>([]);
  const [programmes, setProgrammes] = useState<TrainingProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');
  const [remarks, setRemarks] = useState('');

  const fetchNominations = async () => {
    setLoading(true);
    try {
      const [noms, progs] = await Promise.all([
        api.nominations.list(),
        api.programmes.list(),
      ]);
      setNominations(noms || []);
      setProgrammes(progs || []);
      if (progs && progs.length > 0 && !selectedProgrammeId) {
        setSelectedProgrammeId(progs[0].id);
      }
    } catch (err) {
      console.error('Failed to load nominations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNominations();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.nominations.updateStatus(id, status, undefined, `Status updated to ${status}`);
      fetchNominations();
    } catch (err: any) {
      alert(`Error updating nomination status: ${err.message}`);
    }
  };

  const handleRegisterSelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgrammeId) return;
    try {
      await api.nominations.registerSelf({
        programmeId: selectedProgrammeId,
        remarks,
      });
      setShowRegisterModal(false);
      setRemarks('');
      fetchNominations();
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENROLLED':
      case 'APPROVED':
        return <span className="badge badge-emerald">✓ {status}</span>;
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return <span className="badge badge-gold">⏳ {status}</span>;
      case 'WAITLISTED':
        return <span className="badge badge-cyan">⏸ WAITLISTED</span>;
      case 'REJECTED':
      case 'CANCELLED':
        return <span className="badge badge-rose">✕ {status}</span>;
      default:
        return <span className="badge badge-indigo">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-emerald">Admissions Workflow</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• Nominations & Enrolments</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', color: '#ffffff', marginTop: '0.25rem' }}>
            Online Registrations & Institutional Nominations
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Two-track admission pipeline supporting grassroots self-enrolment and institutional PACS nominations.
          </p>
        </div>

        <button onClick={() => setShowRegisterModal(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Register for Programme</span>
        </button>
      </div>

      {/* Nominations Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-dim)', fontWeight: 600 }}>Trainee / Candidate</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-dim)', fontWeight: 600 }}>Affiliation</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-dim)', fontWeight: 600 }}>Nomination Type</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-dim)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '1rem 1.25rem', color: 'var(--text-dim)', fontWeight: 600 }}>Registration Date</th>
                {canApprove && (
                  <th style={{ padding: '1rem 1.25rem', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {nominations.map((n) => (
                <tr
                  key={n.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'var(--transition)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: '#ffffff' }}>
                      {n.trainee?.user?.firstName} {n.trainee?.user?.lastName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {n.trainee?.traineeCode || 'TRN-2026'} • {n.trainee?.user?.email}
                    </div>
                  </td>

                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-300)' }}>
                      <Building size={14} />
                      <span>{n.trainee?.cooperativeName || 'Warangal District PACS'}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {n.trainee?.traineeType || 'RURAL_YOUTH'}
                    </div>
                  </td>

                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span className={`badge ${n.nominationType === 'INSTITUTIONAL' ? 'badge-gold' : 'badge-cyan'}`}>
                      {n.nominationType}
                    </span>
                  </td>

                  <td style={{ padding: '1rem 1.25rem' }}>{getStatusBadge(n.status)}</td>

                  <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(n.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>

                  {canApprove && (
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        {n.status !== 'APPROVED' && n.status !== 'ENROLLED' && (
                          <button
                            onClick={() => handleUpdateStatus(n.id, 'APPROVED')}
                            className="btn btn-primary btn-sm"
                            title="Approve candidate"
                          >
                            <CheckCircle size={14} />
                            <span>Approve</span>
                          </button>
                        )}
                        {n.status === 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(n.id, 'ENROLLED')}
                            className="btn btn-gold btn-sm"
                            title="Enroll into active batch"
                          >
                            <UserCheck size={14} />
                            <span>Enroll Batch</span>
                          </button>
                        )}
                        {n.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleUpdateStatus(n.id, 'REJECTED')}
                            className="btn btn-danger btn-sm"
                            title="Reject application"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Self Modal */}
      {showRegisterModal && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.35rem', color: '#ffffff', marginBottom: '1rem' }}>
              Online Programme Self-Registration
            </h3>
            <form onSubmit={handleRegisterSelf} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select Training Programme</label>
                <select
                  value={selectedProgrammeId}
                  onChange={(e) => setSelectedProgrammeId(e.target.value)}
                  required
                >
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.durationDays} Days, {p.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Statement of Interest / PACS Remarks
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Explain why you wish to attend and how it benefits your local cooperative society..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
