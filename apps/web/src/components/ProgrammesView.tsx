import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Users,
  Calendar,
  MapPin,
  Clock,
  Layers,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { TrainingProgramme } from '../types';

interface ProgrammesViewProps {
  onSelectProgramme?: (programmeId: string) => void;
  canCreate?: boolean;
}

export const ProgrammesView: React.FC<ProgrammesViewProps> = ({
  onSelectProgramme,
  canCreate = true,
}) => {
  const [programmes, setProgrammes] = useState<TrainingProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Agri-Business');
  const [targetAudience, setTargetAudience] = useState('PACS Members & Rural Youth');
  const [durationDays, setDurationDays] = useState(5);
  const [capacity, setCapacity] = useState(40);
  const [location, setLocation] = useState('RICM Hyderabad Campus');
  const [mode, setMode] = useState('BLENDED');

  // Batch Form
  const [batchCode, setBatchCode] = useState('');
  const [batchName, setBatchName] = useState('');
  const [batchCapacity, setBatchCapacity] = useState(30);

  const fetchProgrammes = async () => {
    setLoading(true);
    try {
      const data = await api.programmes.list();
      setProgrammes(data || []);
    } catch (err) {
      console.error('Failed to load programmes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgrammes();
  }, []);

  const handleCreateProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.programmes.create({
        code: code || `PRG-${Date.now().toString().slice(-6)}`,
        title,
        description: `National training programme organized by NCCT for ${targetAudience}.`,
        category,
        targetAudience,
        mode,
        durationDays: Number(durationDays),
        capacity: Number(capacity),
        location,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + durationDays * 86400000).toISOString(),
        hostelRequired: true,
      });
      setShowCreateModal(false);
      fetchProgrammes();
    } catch (err: any) {
      alert(`Error creating programme: ${err.message}`);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showBatchModal) return;
    try {
      await api.programmes.createBatch(showBatchModal, {
        batchCode: batchCode || `BATCH-${Date.now().toString().slice(-4)}`,
        name: batchName || 'Regular Morning Batch',
        capacity: Number(batchCapacity),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      });
      setShowBatchModal(null);
      fetchProgrammes();
    } catch (err: any) {
      alert(`Error creating batch: ${err.message}`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-emerald">ERP Core</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• Capacity & Scheduling</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', color: '#ffffff', marginTop: '0.25rem' }}>
            National Training Programmes & Batches
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Curriculum, capacity allocation, batch creation, and candidate enrollment across institutions.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setCode(`PRG-NCCT-${Date.now().toString().slice(-4)}`);
              setShowCreateModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>New Programme</span>
          </button>
        )}
      </div>

      {/* Programme Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {programmes.map((p) => (
          <div
            key={p.id}
            className="glass-panel"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              transition: 'var(--transition)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span className="badge badge-cyan">{p.category}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    color: 'var(--text-dim)',
                  }}
                >
                  {p.code}
                </span>
              </div>

              <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginTop: '0.65rem' }}>
                {p.title}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: '1.5' }}>
                {p.description}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.75rem',
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                  <Clock size={14} color="#10b981" />
                  <span>{p.durationDays} Days ({p.mode})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                  <Users size={14} color="#06b6d4" />
                  <span>Capacity: {p.capacity}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                  <MapPin size={14} color="#f59e0b" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.location || 'RICM Hyderabad'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                  <Layers size={14} color="#818cf8" />
                  <span>Batches: {p._count?.batches || 1}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
              {canCreate && (
                <button
                  onClick={() => {
                    setShowBatchModal(p.id);
                    setBatchCode(`BATCH-${p.code.slice(-4)}-01`);
                    setBatchName(`${p.title.slice(0, 20)} Batch`);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                >
                  <Plus size={14} />
                  <span>Add Batch</span>
                </button>
              )}
              {onSelectProgramme && (
                <button
                  onClick={() => onSelectProgramme(p.id)}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  <span>Nominations</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Programme Modal */}
      {showCreateModal && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '1rem' }}>
              Create NCCT Training Programme
            </h3>
            <form onSubmit={handleCreateProgramme} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Programme Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. PACS Digital Accounting & UPI Integration"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Code</label>
                  <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Agri-Business">Agri-Business & FPO</option>
                    <option value="PACS Computerization">PACS Computerization</option>
                    <option value="Dairy Cooperatives">Dairy Cooperatives</option>
                    <option value="Digital Financial Literacy">Digital Financial Literacy</option>
                    <option value="Cooperative Law & Governance">Cooperative Law & Governance</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Capacity</label>
                  <input
                    type="number"
                    min="10"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mode</label>
                  <select value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option value="BLENDED">Blended</option>
                    <option value="OFFLINE">Offline (Campus)</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target Audience</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Programme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {showBatchModal && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.35rem', color: '#ffffff', marginBottom: '1rem' }}>
              Create New Training Batch
            </h3>
            <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Batch Code</label>
                <input
                  type="text"
                  required
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Batch Name</label>
                <input
                  type="text"
                  required
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Batch Capacity</label>
                <input
                  type="number"
                  min="5"
                  value={batchCapacity}
                  onChange={(e) => setBatchCapacity(Number(e.target.value))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Schedule Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
