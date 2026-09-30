/** CAPACITY → OCCUPIED → AVAILABLE (→ MAINTENANCE), drawn to scale. */
export function CapBar({ capacity, occupied, maintenance = 0, unit = 'beds' }: { capacity: number; occupied: number; maintenance?: number; unit?: string }) {
  const avail = Math.max(0, capacity - occupied - maintenance);
  return (
    <div className="capbar">
      <div className="capbar-track" role="img" aria-label={`${capacity} ${unit} in total: ${occupied} occupied, ${avail} available${maintenance ? `, ${maintenance} under maintenance` : ''}`}>
        <i className="occ" style={{ flex: occupied }} /><i className="avail" style={{ flex: avail }} />{maintenance > 0 && <i className="maint" style={{ flex: maintenance }} />}
      </div>
      <div className="capbar-legend">
        <span><i style={{ background: 'var(--border-strong)' }} />Capacity <b className="num">{capacity}</b></span>
        <span><i style={{ background: 'var(--accent-primary)' }} />Occupied <b className="num">{occupied}</b></span>
        <span><i style={{ background: 'var(--accent-secondary)' }} />Available <b className="num">{avail}</b></span>
        {maintenance > 0 && <span><i style={{ background: 'var(--accent-warning)' }} />Maintenance <b className="num">{maintenance}</b></span>}
      </div>
    </div>
  );
}
