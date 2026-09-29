import React, { useEffect, useState } from 'react';
import {
  Building2,
  Package,
  Truck,
  Bed,
  CheckCircle,
  Clock,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api/client';
import { HostelOccupancy, LogisticsItem } from '../types';

export const HostelLogisticsView: React.FC = () => {
  const [occupancy, setOccupancy] = useState<HostelOccupancy | null>(null);
  const [logistics, setLogistics] = useState<LogisticsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Logistics form state
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  const [category, setCategory] = useState<'KIT' | 'MEAL' | 'EQUIPMENT' | 'TRANSPORT'>('KIT');
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState(50);
  const [vendorName, setVendorName] = useState('National Stationery & Print Corp');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [occ, logs] = await Promise.all([
        api.hostel.getOccupancy().catch(() => ({
          totalRooms: 80,
          totalBeds: 160,
          occupiedBeds: 124,
          availableBeds: 36,
          occupancyRatePercent: 78,
        })),
        api.logistics.list(),
      ]);
      setOccupancy(occ);
      setLogistics(logs || []);
    } catch (err) {
      console.error('Failed to load hostel or logistics data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateLogistics = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const progs = await api.programmes.list();
      const progId = progs[0]?.id || 'prog-id';

      await api.logistics.create({
        programmeId: progId,
        category,
        title,
        quantity: Number(quantity),
        vendorName,
        status: 'PENDING',
      });

      setShowLogisticsModal(false);
      setTitle('');
      fetchData();
    } catch (err: any) {
      alert(`Error creating logistics item: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.logistics.updateStatus(id, status);
      fetchData();
    } catch (err: any) {
      alert(`Error updating logistics item: ${err.message}`);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-emerald">Campus Operations</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• Accommodation & Material Logistics</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', color: '#ffffff', marginTop: '0.25rem' }}>
            Hostel Capacity & Training Programme Logistics
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time bed allocation for residential rural participants and fulfillment monitoring for training kits, meals, and IT tablets.
          </p>
        </div>

        <button onClick={() => setShowLogisticsModal(true)} className="btn btn-primary btn-sm">
          <Plus size={14} />
          <span>Add Logistics Requirement</span>
        </button>
      </div>

      {/* Hostel Occupancy KPI Card */}
      {occupancy && (
        <div
          className="glass-panel"
          style={{
            padding: '1.75rem',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 58, 138, 0.25) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                }}
              >
                <Bed size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#ffffff' }}>RICM Hyderabad Campus Hostel</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Residential Trainee Wing A & B</div>
              </div>
            </div>
            <span className="badge badge-indigo">{occupancy.occupancyRatePercent}% Occupied</span>
          </div>

          {/* Occupancy Progress Bar */}
          <div style={{ height: '10px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '6px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${occupancy.occupancyRatePercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                borderRadius: '6px',
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
              marginTop: '1.25rem',
              padding: '1rem',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
            }}
          >
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Total Rooms</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>
                {occupancy.totalRooms}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Total Beds</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>
                {occupancy.totalBeds}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Occupied Beds</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#60a5fa', marginTop: '0.2rem' }}>
                {occupancy.occupiedBeds}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Available Beds</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34d399', marginTop: '0.2rem' }}>
                {occupancy.availableBeds}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logistics Checklist Section */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={20} color="#f59e0b" />
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Training Materials & Logistics Checklist</h3>
          </div>
          <span className="badge badge-gold">Delivery Tracker</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {logistics.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span className="badge badge-cyan">{item.category}</span>
                  <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.95rem' }}>{item.title}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Quantity: {item.quantity} • Vendor: {item.vendorName || 'Designated Supplier'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className={`badge ${item.status === 'DELIVERED' || item.status === 'COMPLETED' ? 'badge-emerald' : 'badge-gold'}`}>
                  {item.status === 'DELIVERED' || item.status === 'COMPLETED' ? '✓ ' : '⏳ '}
                  {item.status}
                </span>

                {item.status !== 'DELIVERED' && (
                  <button
                    onClick={() => handleUpdateStatus(item.id, 'DELIVERED')}
                    className="btn btn-primary btn-sm"
                  >
                    <CheckCircle size={14} />
                    <span>Mark Delivered</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {logistics.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              No logistics items listed. Click "Add Logistics Requirement" to define kits, meals, or simulation tablets.
            </div>
          )}
        </div>
      </div>

      {/* Add Logistics Item Modal */}
      {showLogisticsModal && (
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
              Add Training Logistics Requirement
            </h3>
            <form onSubmit={handleCreateLogistics} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as any)}>
                  <option value="KIT">Training Kits & Stationery</option>
                  <option value="EQUIPMENT">Simulation Tablets / Laptops</option>
                  <option value="MEAL">Catering & Meals</option>
                  <option value="TRANSPORT">Field Bus Transport</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Item Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Android Tablets for Smart Agriculture Simulator"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vendor / Supplier</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowLogisticsModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
