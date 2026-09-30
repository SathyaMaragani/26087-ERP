/** NCCT mark: a hub and three institutions, drawn as a small network. */
export function Mark({ size = 28 }: { size?: number }) {
  const pts: Array<[number, number]> = [[14, 4.5], [22.2, 18.7], [5.8, 18.7]];
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="12.6" stroke="var(--border-strong)" strokeWidth="1" />
      {pts.map(([x, y], i) => <line key={i} x1="14" y1="14" x2={x} y2={y} stroke="var(--accent-secondary)" strokeWidth="1.1" strokeOpacity="0.7" />)}
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.1" fill="var(--accent-primary)" />)}
      <circle cx="14" cy="14" r="2.4" fill="var(--text-primary)" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="wordmark">
      <Mark />
      {!compact && (
        <span className="wordmark-text">
          <strong>NCCT</strong>
          <small>National Cooperative Training</small>
        </span>
      )}
    </span>
  );
}
