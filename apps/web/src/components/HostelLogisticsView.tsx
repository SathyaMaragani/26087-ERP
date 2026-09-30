import { useState, type FormEvent } from 'react';
import { BedDouble, Building2, PackageCheck, Plus, UserPlus, Wrench } from 'lucide-react';
import { api } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { useToast } from '../state/toast';
import { Modal } from '../ui/Modal';
import { Field } from '../ui/Field';
import { RadialGauge } from '../ui/charts';
import { CapBar } from '../ui/CapBar';
import { Badge, Button, EmptyState, ErrorState, LoadingBlock, PageHeader, Surface, Tabs } from '../ui/primitives';
import { statusTone } from '../features/home/shared';

type Tab = 'hostel' | 'logistics';
const CATEGORIES = ['TRAINING_KITS', 'MEALS', 'EQUIPMENT', 'TRANSPORT', 'VENUE'];
const FLOW = ['PENDING', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED'] as const;
const pretty = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export function HostelLogisticsView() {
  const [tab, setTab] = useState<Tab>('hostel');
  return (
    <>
      <PageHeader eyebrow="Campus & logistics" title={<>Beds, meals and <em className="serif-em">supplies</em></>} description="Residential capacity and the supplies each programme depends on." />
      <Tabs label="Campus section" tabs={[{ id: 'hostel', label: 'Hostel' }, { id: 'logistics', label: 'Logistics' }]} value={tab} onChange={setTab} />
      <div className="att-body">{tab === 'hostel' ? <Hostel /> : <Logistics />}</div>
    </>
  );
}

/* ------------------------------------------------------------------ Hostel */
function Hostel() {
  const occ = useAsync(() => api.hostel.getOccupancy(), []);
  const hostels = useAsync(() => api.hostel.list(), []);
  const [hostelOpen, setHostelOpen] = useState(false);
  const [roomFor, setRoomFor] = useState<any | null>(null);
  const [allocFor, setAllocFor] = useState<any | null>(null);
  const reload = () => { occ.reload(); hostels.reload(); };

  return (
    <div className="home-grid">
      <div className="span-4">
        <Surface eyebrow="Occupancy" title="Beds in use">
          {occ.loading && !occ.data ? <LoadingBlock /> : occ.error ? <ErrorState detail={occ.error} onRetry={occ.reload} /> : !occ.data || occ.data.totalBeds === 0 ? <EmptyState icon={<BedDouble size={22} />} title="No beds configured" detail="Add a hostel and its rooms. Each bed then shows as available, occupied or under maintenance, and occupancy updates as you allocate." /> : (
            <div className="center">
              <RadialGauge size={160} label="Occupied" value={occ.data.occupancyRatePercent} tone="copper" sub={`${occ.data.occupiedBeds} of ${occ.data.totalBeds} beds`} />
              <div className="capwrap"><CapBar capacity={occ.data.totalBeds} occupied={occ.data.occupiedBeds} maintenance={0} /></div>
              <dl className="mini-stats">
                <div><dt>Rooms</dt><dd className="num">{occ.data.totalRooms}</dd></div>
                <div><dt>Available</dt><dd className="num">{occ.data.availableBeds}</dd></div>
                <div><dt>Maintenance</dt><dd className="num">{occ.data.maintenanceRooms}</dd></div>
              </dl>
            </div>
          )}
        </Surface>
      </div>
      <div className="span-8">
        <Surface eyebrow="Hostels" title="Buildings and rooms" action={<Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setHostelOpen(true)}>Add hostel</Button>}>
          {hostels.loading && !hostels.data ? <LoadingBlock /> : hostels.error ? <ErrorState detail={hostels.error} onRetry={hostels.reload} /> : (hostels.data ?? []).length === 0 ? <EmptyState icon={<Building2 size={22} />} title="No hostels yet" /> : (
            <div className="hostels">
              {(hostels.data ?? []).map((h: any) => (
                <section key={h.id} className="hostel">
                  <header>
                    <div><strong className="cell-strong">{h.name}</strong><div className="cell-sub">{h.building} · {pretty(h.gender ?? 'Any')} · {h.totalRooms} rooms planned</div></div>
                    <div className="row-actions"><Button size="sm" onClick={() => setRoomFor(h)}>Add room</Button><Button size="sm" icon={<UserPlus size={13} />} onClick={() => setAllocFor(h)} disabled={(h.rooms ?? []).length === 0}>Allocate bed</Button></div>
                  </header>
                  {(h.rooms ?? []).length > 0 && (() => {
                    const rooms = h.rooms as any[];
                    const cap = rooms.reduce((n, r) => n + r.bedCapacity, 0), occupied = rooms.reduce((n, r) => n + r.occupiedBeds, 0);
                    const maint = rooms.filter((r) => r.isUnderMaintenance).reduce((n, r) => n + Math.max(0, r.bedCapacity - r.occupiedBeds), 0);
                    return <CapBar capacity={cap} occupied={occupied} maintenance={maint} />;
                  })()}
                  {(h.rooms ?? []).length === 0 ? <p className="cell-sub">No rooms added yet.</p> : (
                    <ul className="rooms">
                      {h.rooms.map((r: any) => (
                        <li key={r.id} className={`room${r.isUnderMaintenance ? ' is-maint' : r.occupiedBeds >= r.bedCapacity ? ' is-full' : ''}`} title={`Room ${r.roomNumber}: ${r.occupiedBeds} of ${r.bedCapacity} beds`}>
                          <span className="room-no num">{r.roomNumber}</span>
                          <span className="beds" role="img" aria-label={`${r.occupiedBeds} of ${r.bedCapacity} beds occupied`}>{Array.from({ length: r.bedCapacity }, (_, i) => <i key={i} className={i < r.occupiedBeds ? 'on' : ''} />)}</span>
                          {r.isUnderMaintenance && <Wrench size={12} aria-label="Under maintenance" />}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}
        </Surface>
      </div>
      <HostelModal open={hostelOpen} onClose={() => setHostelOpen(false)} onDone={() => { setHostelOpen(false); reload(); }} />
      <RoomModal hostel={roomFor} onClose={() => setRoomFor(null)} onDone={() => { setRoomFor(null); reload(); }} />
      <AllocateModal hostel={allocFor} onClose={() => setAllocFor(null)} onDone={() => { setAllocFor(null); reload(); }} />
    </div>
  );
}

function HostelModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', building: '', gender: 'MALE', totalRooms: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api.hostel.create({ name: f.name.trim(), building: f.building.trim(), gender: f.gender, ...(f.totalRooms && { totalRooms: Number(f.totalRooms) }) }); toast.success('Hostel added', f.name); setF({ name: '', building: '', gender: 'MALE', totalRooms: '' }); onDone(); }
    catch (err) { toast.error('Could not add the hostel', err instanceof Error ? err.message : undefined); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add a hostel" width={480}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Name" wide>{(p) => <input {...p} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        <Field label="Building">{(p) => <input {...p} required value={f.building} onChange={(e) => setF({ ...f, building: e.target.value })} />}</Field>
        <Field label="Intended for">{(p) => <select {...p} value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="MALE">Men</option><option value="FEMALE">Women</option><option value="MIXED">Mixed</option></select>}</Field>
        <Field label="Planned rooms" wide>{(p) => <input {...p} type="number" min={1} value={f.totalRooms} onChange={(e) => setF({ ...f, totalRooms: e.target.value })} />}</Field>
        <div className="form-actions span-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>Add hostel</Button></div>
      </form>
    </Modal>
  );
}

function RoomModal({ hostel, onClose, onDone }: { hostel: any | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ roomNumber: '', floor: '1', bedCapacity: '2' });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!hostel) return; setBusy(true);
    try { await api.hostel.addRoom(hostel.id, { roomNumber: f.roomNumber.trim(), floor: Number(f.floor), bedCapacity: Number(f.bedCapacity) }); toast.success(`Room ${f.roomNumber} added`); setF({ ...f, roomNumber: '' }); onDone(); }
    catch (err) { toast.error('Could not add the room', err instanceof Error ? err.message : undefined); } finally { setBusy(false); }
  };
  return (
    <Modal open={!!hostel} onClose={onClose} title={hostel ? `Add a room · ${hostel.name}` : 'Add a room'} width={440}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Room number" wide>{(p) => <input {...p} required value={f.roomNumber} onChange={(e) => setF({ ...f, roomNumber: e.target.value })} />}</Field>
        <Field label="Floor">{(p) => <input {...p} type="number" min={0} required value={f.floor} onChange={(e) => setF({ ...f, floor: e.target.value })} />}</Field>
        <Field label="Beds">{(p) => <input {...p} type="number" min={1} required value={f.bedCapacity} onChange={(e) => setF({ ...f, bedCapacity: e.target.value })} />}</Field>
        <div className="form-actions span-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy}>Add room</Button></div>
      </form>
    </Modal>
  );
}

function AllocateModal({ hostel, onClose, onDone }: { hostel: any | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const trainees = useAsync(() => (hostel ? api.trainees.list() : Promise.resolve([] as any[])), [hostel?.id]);
  const [f, setF] = useState({ roomId: '', traineeId: '', checkInDate: '', checkOutDate: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ok = !f.checkInDate || !f.checkOutDate || f.checkOutDate >= f.checkInDate;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.hostel.allocate({ ...f, checkInDate: new Date(f.checkInDate).toISOString(), checkOutDate: new Date(f.checkOutDate).toISOString() }); toast.success('Bed allocated'); setF({ roomId: '', traineeId: '', checkInDate: '', checkOutDate: '' }); onDone(); }
    catch (er) { setErr(er instanceof Error ? er.message : 'Could not allocate the bed'); } finally { setBusy(false); }
  };
  return (
    <Modal open={!!hostel} onClose={onClose} title={hostel ? `Allocate a bed · ${hostel.name}` : 'Allocate a bed'} width={500}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Room" wide>{(p) => <select {...p} required value={f.roomId} onChange={(e) => setF({ ...f, roomId: e.target.value })}><option value="">Select a room…</option>{(hostel?.rooms ?? []).filter((r: any) => !r.isUnderMaintenance).map((r: any) => <option key={r.id} value={r.id} disabled={r.occupiedBeds >= r.bedCapacity}>Room {r.roomNumber} — {r.bedCapacity - r.occupiedBeds} of {r.bedCapacity} free</option>)}</select>}</Field>
        <Field label="Trainee" wide>{(p) => <select {...p} required value={f.traineeId} onChange={(e) => setF({ ...f, traineeId: e.target.value })}><option value="">Select a trainee…</option>{(trainees.data ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName} · {t.traineeCode}</option>)}</select>}</Field>
        <Field label="Check-in">{(p) => <input {...p} type="date" required value={f.checkInDate} onChange={(e) => setF({ ...f, checkInDate: e.target.value })} />}</Field>
        <Field label="Check-out" hint={ok ? undefined : 'Check-out must not be before check-in.'}>{(p) => <input {...p} type="date" required min={f.checkInDate} value={f.checkOutDate} onChange={(e) => setF({ ...f, checkOutDate: e.target.value })} aria-invalid={!ok} />}</Field>
        <div className="form-error span-2" role="alert">{err}</div>
        <div className="form-actions span-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy} disabled={!ok}>Allocate</Button></div>
      </form>
    </Modal>
  );
}

/* --------------------------------------------------------------- Logistics */
function Logistics() {
  const toast = useToast();
  const items = useAsync(() => api.logistics.list(), []);
  const [open, setOpen] = useState(false);

  const advance = async (it: any) => {
    const next = FLOW[FLOW.indexOf(it.status) + 1];
    if (!next) return;
    try { await api.logistics.updateStatus(it.id, next); toast.success(`${it.title}`, `Now ${pretty(next).toLowerCase()}`); items.reload(); }
    catch (e) { toast.error('Could not update the status', e instanceof Error ? e.message : undefined); }
  };

  const byProgramme = (items.data ?? []).reduce((m: Record<string, any[]>, it: any) => { (m[it.programme?.title ?? 'Unassigned'] ??= []).push(it); return m; }, {});

  return (
    <>
      <div className="toolbar"><div className="grow" /><Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>Add requirement</Button></div>
      {items.loading && !items.data ? <LoadingBlock label="Loading logistics" /> : items.error ? <ErrorState detail={items.error} onRetry={items.reload} /> : (items.data ?? []).length === 0 ? (
        <Surface><EmptyState icon={<PackageCheck size={22} />} title="No logistics requirements yet" detail="Track training kits, meals, equipment and transport per programme." /></Surface>
      ) : Object.entries(byProgramme).map(([title, list]) => (
        <Surface key={title} eyebrow="Programme" title={title} className="log-group">
          <ul className="log-list">
            {list.map((it: any) => {
              const step = FLOW.indexOf(it.status);
              return (
                <li key={it.id}>
                  <div className="log-main"><strong className="cell-strong">{it.title}</strong><div className="cell-sub">{pretty(it.category)} · qty <span className="num">{it.quantity}</span>{it.vendorName ? ` · ${it.vendorName}` : ''}{typeof it.cost === 'number' ? ` · ₹${it.cost.toLocaleString('en-IN')}` : ''}</div>{it.remarks && <div className="cell-sub">{it.remarks}</div>}</div>
                  <ol className="steps" aria-label={`Status: ${pretty(it.status)}`}>{FLOW.map((s, i) => <li key={s} className={i <= step ? 'on' : ''} title={pretty(s)} />)}</ol>
                  <Badge tone={statusTone(it.status === 'IN_PROGRESS' ? 'ONGOING' : it.status === 'PENDING' ? 'SUBMITTED' : 'COMPLETED')} dot>{pretty(it.status)}</Badge>
                  <Button size="sm" disabled={step >= FLOW.length - 1} onClick={() => advance(it)}>{step >= FLOW.length - 1 ? 'Done' : `Mark ${pretty(FLOW[step + 1]).toLowerCase()}`}</Button>
                </li>
              );
            })}
          </ul>
        </Surface>
      ))}
      <LogisticsModal open={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); items.reload(); }} />
    </>
  );
}

function LogisticsModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const programmes = useAsync(() => (open ? api.programmes.list() : Promise.resolve([] as any[])), [open]);
  const [f, setF] = useState({ programmeId: '', category: 'TRAINING_KITS', title: '', quantity: '1', vendorName: '', cost: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api.logistics.create({ programmeId: f.programmeId, category: f.category, title: f.title.trim(), quantity: Number(f.quantity), ...(f.vendorName.trim() && { vendorName: f.vendorName.trim() }), ...(f.cost && { cost: Number(f.cost) }) }); toast.success('Requirement added', f.title); setF({ ...f, title: '', vendorName: '', cost: '' }); onDone(); }
    catch (err) { toast.error('Could not add the requirement', err instanceof Error ? err.message : undefined); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add a logistics requirement" width={520}>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Programme" wide>{(p) => <select {...p} required value={f.programmeId} onChange={(e) => setF({ ...f, programmeId: e.target.value })}><option value="">Select a programme…</option>{(programmes.data ?? []).map((g: any) => <option key={g.id} value={g.id}>{g.title}</option>)}</select>}</Field>
        <Field label="Category">{(p) => <select {...p} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{pretty(c)}</option>)}</select>}</Field>
        <Field label="Quantity">{(p) => <input {...p} type="number" min={1} required value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />}</Field>
        <Field label="Item" wide>{(p) => <input {...p} required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}</Field>
        <Field label="Vendor (optional)">{(p) => <input {...p} value={f.vendorName} onChange={(e) => setF({ ...f, vendorName: e.target.value })} />}</Field>
        <Field label="Cost in ₹ (optional)">{(p) => <input {...p} type="number" min={0} value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} />}</Field>
        <div className="form-actions span-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" loading={busy} disabled={!f.programmeId}>Add</Button></div>
      </form>
    </Modal>
  );
}
