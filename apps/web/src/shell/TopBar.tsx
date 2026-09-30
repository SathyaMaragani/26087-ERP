import { useEffect, useRef, useState } from 'react';
import { LogOut, Search, ShieldCheck } from 'lucide-react';
import { OfflineChip } from './OfflineChip';
import { NotificationsBell } from './Notifications';
import { ROLE_META, type UserPersona } from '../types';

interface Props {
  persona: UserPersona;
  crumb: string;
  onOpenPalette: () => void;
  onVerify: () => void;
  onLogout: () => void;
}

export function TopBar({ persona, crumb, onOpenPalette, onVerify, onLogout }: Props) {
  const [menu, setMenu] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [menu]);

  return (
    <header className="topbar">
      <div className="crumb">
        <span className="crumb-org">{persona.instituteName.split(',')[0]}</span>
        <span className="crumb-sep" aria-hidden>/</span>
        <span className="crumb-page">{crumb}</span>
      </div>

      <div className="topbar-actions">
        <button className="palette-trigger" onClick={onOpenPalette} aria-label="Open command palette" aria-keyshortcuts="Control+K Meta+K">
          <Search size={15} aria-hidden />
          <span className="palette-trigger-text">Search or jump to…</span>
          <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>

        <OfflineChip />

        <NotificationsBell />

        <div className="user-menu" ref={wrap}>
          <button className="user-btn" onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu}>
            <span className="avatar" aria-hidden>{persona.name.charAt(0)}</span>
            <span className="user-btn-text"><strong>{persona.name}</strong><small>{ROLE_META[persona.role].label}</small></span>
          </button>
          {menu && (
            <div className="menu" role="menu">
              <div className="menu-head"><strong>{persona.name}</strong><small>{persona.email}</small><small>{persona.instituteName}</small></div>
              <button role="menuitem" onClick={() => { setMenu(false); onVerify(); }}><ShieldCheck size={15} aria-hidden /> Verify a certificate</button>
              <button role="menuitem" onClick={() => { setMenu(false); onLogout(); }}><LogOut size={15} aria-hidden /> Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
