import { useEffect, useRef, useState } from 'react';
import { CheckCheck, CloudOff, CloudUpload, DownloadCloud, RefreshCw, Wifi } from 'lucide-react';
import { useOffline, type SyncStatus } from '../state/offline';
import { Button } from '../ui/primitives';

const META: Record<SyncStatus, { label: string; icon: typeof Wifi; hint: string }> = {
  online: { label: 'Online', icon: Wifi, hint: 'Connected. Progress is sent as you go.' },
  syncing: { label: 'Syncing', icon: RefreshCw, hint: 'Uploading progress recorded offline…' },
  offline: { label: 'Offline', icon: CloudOff, hint: 'Downloaded lessons stay readable. Progress queues on this device.' },
  synced: { label: 'Synced', icon: CheckCheck, hint: 'Everything recorded offline has been uploaded.' },
};

const ago = (iso: string | null) => {
  if (!iso) return 'Never';
  const s = Math.max(0, Math.round((Date.now() - +new Date(iso)) / 1000));
  if (s < 45) return 'Just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** ONLINE · SYNCING · OFFLINE · SYNCED — a truthful readout of the offline store, not a decoration. */
export function OfflineChip() {
  const o = useOffline();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const m = META[o.status];
  const Icon = m.icon;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className="user-menu" ref={wrap}>
      <button className={`net-toggle st-${o.status}`} onClick={() => setOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={open} aria-label={`Connection: ${m.label}${o.queued ? `, ${o.queued} updates waiting` : ''}`}>
        <Icon size={15} aria-hidden className={o.status === 'syncing' ? 'spin' : ''} />
        <span>{m.label}</span>
        {o.queued > 0 && <b className="net-count num">{o.queued}</b>}
      </button>
      {open && (
        <div className="menu offline-pop" role="dialog" aria-label="Offline learning status">
          <div className="menu-head"><strong>{m.label}</strong><small>{m.hint}</small></div>
          <dl className="offline-stats">
            <div><dt><DownloadCloud size={13} aria-hidden /> Downloaded lessons</dt><dd className="num">{o.downloaded}</dd></div>
            <div><dt><CloudUpload size={13} aria-hidden /> Waiting to sync</dt><dd className="num">{o.queued}</dd></div>
            <div><dt>Last sync</dt><dd>{ago(o.lastSync)}</dd></div>
          </dl>
          <div className="offline-actions">
            <Button size="sm" variant="primary" loading={o.status === 'syncing'} disabled={o.isOffline || o.queued === 0} onClick={() => o.sync()} icon={<CloudUpload size={14} />}>Sync now</Button>
            <label className="switch"><input type="checkbox" checked={o.simulated} onChange={o.toggleSimulated} /><span>Simulate offline</span></label>
          </div>
          <p className="cell-sub offline-note">Real network loss is detected automatically. The switch lets you rehearse rural conditions.</p>
        </div>
      )}
    </div>
  );
}
