import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../api/client';
import { Drawer } from '../ui/Modal';
import { EmptyState, ErrorState, LoadingBlock } from '../ui/primitives';
import { useAsync } from '../lib/useAsync';

/** Bell + drawer, backed by /notifications. Polls the unread count once a minute. */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const refreshCount = useCallback(() => {
    api.notifications.unreadCount().then((r) => setUnread(r.unreadCount ?? 0)).catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const t = window.setInterval(refreshCount, 60000);
    return () => window.clearInterval(t);
  }, [refreshCount]);

  return (
    <>
      <button className="icon-btn icon-btn-lg" onClick={() => setOpen(true)} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-haspopup="dialog">
        <Bell size={17} />
        {unread > 0 && <span className="bell-badge" aria-hidden>{unread > 9 ? '9+' : unread}</span>}
      </button>
      <Drawer open={open} onClose={() => { setOpen(false); refreshCount(); }} title="Notifications" width={400}>
        <NotificationList onChanged={refreshCount} />
      </Drawer>
    </>
  );
}

function NotificationList({ onChanged }: { onChanged: () => void }) {
  const { data, error, loading, reload } = useAsync(() => api.notifications.mine(), []);

  const markRead = async (id: string) => {
    try { await api.notifications.markRead(id); reload(); onChanged(); } catch { /* row stays unread; list reload will reflect server truth */ }
  };

  if (loading) return <LoadingBlock label="Loading notifications" />;
  if (error) return <ErrorState detail={error} onRetry={reload} />;
  if (!data || data.length === 0) return <EmptyState icon={<Bell size={22} />} title="You're all caught up" detail="New approvals, sessions and certificates will appear here." />;

  return (
    <ul className="notif-list">
      {data.map((n: any) => (
        <li key={n.id} className={n.read ? 'is-read' : ''}>
          <div>
            <div className="notif-title">{n.title}</div>
            {n.message && <div className="notif-msg">{n.message}</div>}
            <div className="notif-time num">{n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</div>
          </div>
          {!n.read && <button className="icon-btn" onClick={() => markRead(n.id)} aria-label="Mark as read"><CheckCheck size={15} /></button>}
        </li>
      ))}
    </ul>
  );
}
