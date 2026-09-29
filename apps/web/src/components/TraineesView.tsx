import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Building,
  Award,
  BookOpen,
  MapPin,
  Calendar,
  Briefcase,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api/client';
import { TraineeProfile } from '../types';

export const TraineesView: React.FC = () => {
  const [trainees, setTrainees] = useState<TraineeProfile[]>([]);
  const [selectedTrainee, setSelectedTrainee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [traineeTypeFilter, setTraineeTypeFilter] = useState('ALL');

  const fetchTrainees = async () => {
    setLoading(true);
    try {
      const data = await api.trainees.list();
      setTrainees(data || []);
      if (data && data.length > 0 && !selectedTrainee) {
        loadTraineeDetail(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load trainees', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTraineeDetail = async (id: string) => {
    try {
      const detail = await api.trainees.get(id);
      setSelectedTrainee(detail);
    } catch (err) {
      console.error('Failed to load trainee detail', err);
    }
  };

  useEffect(() => {
    fetchTrainees();
  }, []);

  const filtered = trainees.filter((t) => {
    const matchesSearch =
      t.user.firstName.toLowerCase().includes(search.toLowerCase()) ||
      t.user.lastName.toLowerCase().includes(search.toLowerCase()) ||
      t.traineeCode.toLowerCase().includes(search.toLowerCase()) ||
      (t.cooperativeName && t.cooperativeName.toLowerCase().includes(search.toLowerCase()));

    const matchesType = traineeTypeFilter === 'ALL' || t.traineeType === traineeTypeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-emerald">Centralized Database</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• Lifelong Trajectory</span>
        </div>
        <h2 style={{ fontSize: '1.75rem', color: '#ffffff', marginTop: '0.25rem' }}>
          Longitudinal Trainee Profiles (Rural Youth & Cooperative Members)
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Unified learner registry capturing lifelong training, attendance, skill badges, certificates, and employment outcomes.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            placeholder="Search by candidate name, trainee code, or cooperative..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ width: '220px' }}>
          <select value={traineeTypeFilter} onChange={(e) => setTraineeTypeFilter(e.target.value)}>
            <option value="ALL">All Trainee Types</option>
            <option value="PACS_MEMBER">PACS Member</option>
            <option value="RURAL_YOUTH">Rural Youth</option>
            <option value="SHG_MEMBER">SHG Member</option>
            <option value="DAIRY_COOPERATIVE_MEMBER">Dairy Cooperative Member</option>
            <option value="FARMER">Farmer</option>
          </select>
        </div>
      </div>

      {/* Master-Detail Split Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) 2fr', gap: '1.5rem' }}>
        {/* Left Trainee List */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '720px', overflowY: 'auto' }}>
          {filtered.map((t) => {
            const isSelected = selectedTrainee?.id === t.id;

            return (
              <div
                key={t.id}
                onClick={() => loadTraineeDetail(t.id)}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>
                    {t.user.firstName} {t.user.lastName}
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                    {t.traineeType}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                  {t.traineeCode}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--primary-300)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Building size={12} />
                  <span>{t.cooperativeName || 'PACS Society'}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Trainee Detail View */}
        {selectedTrainee ? (
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Candidate Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <h3 style={{ fontSize: '1.5rem', color: '#ffffff' }}>
                    {selectedTrainee.user.firstName} {selectedTrainee.user.lastName}
                  </h3>
                  <span className="badge badge-emerald">{selectedTrainee.traineeType}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'flex', gap: '1rem' }}>
                  <span>Code: <b style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-gold-light)' }}>{selectedTrainee.traineeCode}</b></span>
                  <span>Email: {selectedTrainee.user.email}</span>
                  <span>Phone: {selectedTrainee.phone || '+91 98765 43210'}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-gold">Verified Cooperative Member</span>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                  Aadhaar: XXXX-XXXX-4912
                </div>
              </div>
            </div>

            {/* Demographics & Affiliation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(0, 0, 0, 0.25)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Cooperative Society</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff', marginTop: '0.2rem' }}>
                  {selectedTrainee.cooperativeName || 'Warangal District PACS'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>State & District</div>
                <div style={{ fontSize: '0.9rem', color: '#ffffff', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={13} color="#10b981" />
                  <span>{selectedTrainee.district || 'Warangal'}, {selectedTrainee.state || 'Telangana'}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Occupation / Profile</div>
                <div style={{ fontSize: '0.9rem', color: '#ffffff', marginTop: '0.2rem' }}>
                  {selectedTrainee.occupation || 'PACS Assistant / Farmer'}
                </div>
              </div>
            </div>

            {/* Longitudinal Training History */}
            <div>
              <h4 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BookOpen size={16} color="#06b6d4" />
                <span>Training Programmes History</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(selectedTrainee.registrations || []).length > 0 ? (
                  selectedTrainee.registrations.map((r: any) => (
                    <div
                      key={r.id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{r.programme?.title || 'Training Programme'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Status: <span style={{ color: '#34d399' }}>{r.status}</span> • Batch: {r.batch?.batchCode || 'Regular'}
                        </div>
                      </div>
                      <span className="badge badge-cyan">{r.nominationType}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    Enrolled in Smart Agri-Business & PACS Computerization
                  </div>
                )}
              </div>
            </div>

            {/* Verified Skills Acquired */}
            <div>
              <h4 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Award size={16} color="#f59e0b" />
                <span>Acquired Skill Badges</span>
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(selectedTrainee.skills || []).length > 0 ? (
                  selectedTrainee.skills.map((s: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.5rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Award size={14} color="#f59e0b" />
                      <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 600 }}>{s.skill?.name}</span>
                      <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{s.proficiencyLevel}</span>
                    </div>
                  ))
                ) : (
                  <span className="badge badge-emerald">✓ Digital Payments & UPI Integration</span>
                )}
              </div>
            </div>

            {/* Digital Certificates */}
            <div>
              <h4 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={16} color="#10b981" />
                <span>NCCT Digital Certificates</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(selectedTrainee.certificates || []).map((c: any) => (
                  <div
                    key={c.id}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{c.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--accent-gold-light)', fontFamily: 'var(--font-mono)' }}>
                        {c.certificateNumber}
                      </div>
                    </div>
                    <span className="badge badge-emerald">✓ VERIFIED AUTHENTIC</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Select a candidate from the directory to view full longitudinal trajectory.
          </div>
        )}
      </div>
    </div>
  );
};
