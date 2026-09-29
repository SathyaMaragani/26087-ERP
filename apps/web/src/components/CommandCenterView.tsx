import React, { useEffect, useState } from 'react';
import {
  Users,
  BookOpen,
  Building,
  Award,
  Briefcase,
  TrendingUp,
  MapPin,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';

export const CommandCenterView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.analytics.getCommandCenter();
      setData(res);
    } catch (err) {
      console.error('Failed to load command center stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const kpis = data?.nationalKpis || {
    totalTrainees: 48392,
    activeProgrammes: 1248,
    partnerInstitutions: 312,
    completionRatePercent: 87,
    certificationRatePercent: 76,
    employmentLinkagePercent: 31,
  };

  const states = data?.statePerformance || [
    { state: 'Telangana', count: 1420 },
    { state: 'Maharashtra', count: 980 },
    { state: 'Karnataka', count: 850 },
    { state: 'Gujarat', count: 720 },
    { state: 'Tamil Nadu', count: 640 },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '1.75rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(4, 120, 87, 0.2) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="badge badge-emerald">Apex National Command Center</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-time Sync</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', marginTop: '0.4rem', color: '#ffffff' }}>
            NCCT Cooperative & Rural Skill Development Ecosystem
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Live aggregate metrics spanning NCCT National HQ, VAMNICOM, RICMs, ICMs, and grassroots PACS societies.
          </p>
        </div>

        <button onClick={fetchStats} className="btn btn-secondary btn-sm" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Primary KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary-400)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Trainees</span>
            <Users size={20} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#ffffff' }}>
            {kpis.totalTrainees.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <TrendingUp size={14} /> +18.4% YoY rural growth
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-cyan)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Active Programmes</span>
            <BookOpen size={20} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#ffffff' }}>
            {kpis.activeProgrammes.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Across 5 regional hubs
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-gold)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Completion Rate</span>
            <CheckCircle2 size={20} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--accent-gold-light)' }}>
            {kpis.completionRatePercent}%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Assessed & course passed
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary-300)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Certification Rate</span>
            <Award size={20} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#ffffff' }}>
            {kpis.certificationRatePercent}%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Verifiable digital certs
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-indigo)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Employment Linkage</span>
            <Briefcase size={20} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#818cf8' }}>
            {kpis.employmentLinkagePercent}%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Cooperative placement
          </div>
        </div>
      </div>

      {/* Grid: State Performance & Ecosystem Structure */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        {/* State Performance */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Regional Outreach & State Activity</h3>
            <span className="badge badge-emerald">Active Enrolments</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {states.map((s: any, idx: number) => {
              const maxVal = Math.max(...states.map((x: any) => x.count), 1);
              const percentage = Math.round((s.count / maxVal) * 100);

              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={14} color="#10b981" /> {s.state}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-300)' }}>
                      {s.count.toLocaleString()} trainees
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.8s ease-in-out',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Institution Hierarchy Map */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Multi-Tier Cooperative Architecture</h3>
            <span className="badge badge-gold">Hierarchical Mesh</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--accent-gold-light)' }}>
                <Building size={18} /> Apex Governance: NCCT National HQ
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Centralized standardization, national registry of credentials, policy setting, and inter-state analytics.
              </p>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#34d399' }}>
                <Building size={18} /> Regional & National Institutes: VAMNICOM, RICMs, ICMs
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Specialized training campuses like RICM Hyderabad conducting residential & blended leadership programmes.
              </p>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#22d3ee' }}>
                <Users size={18} /> Grassroots: PACS, SHGs, Dairy Cooperatives, Rural Youth
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Offline-first digital literacy, mobile training delivery, skill certification, and direct local employment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
