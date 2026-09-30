import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import QRCode from 'qrcode';
import { BadgeCheck } from 'lucide-react';

export interface Credential {
  number: string;
  title: string;
  recipient?: string;
  issued?: string;
  grade?: string;
  skills?: string[];
  issuer?: string;
  programme?: string;
  status?: string;
}

export const verifyUrl = (n: string) => `${window.location.origin}${window.location.pathname}#/verify/${encodeURIComponent(n)}`;
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

function Guilloche() {
  const paths = [0, 1, 2, 3].map((k) => {
    const pts: string[] = [];
    for (let i = 0; i <= 240; i++) {
      const th = (i / 240) * Math.PI * 2;
      const R = 74 + k * 13 + 9 * Math.sin(th * (7 + k * 3));
      pts.push(`${i ? 'L' : 'M'} ${(300 + Math.cos(th) * R * 2.05).toFixed(1)} ${(180 + Math.sin(th) * R * 1.15).toFixed(1)}`);
    }
    return pts.join(' ');
  });
  return (
    <svg className="cred-guil" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {paths.map((d, i) => <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="0.8" opacity={0.12 + i * 0.03} />)}
    </svg>
  );
}

/**
 * A credential that feels like an object: guilloche security pattern, a live QR to its public
 * verification page, and a sheen that follows the pointer. The seal appears only for ISSUED credentials.
 */
export function CredentialCard({ c, compact = false }: { c: Credential; compact?: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [qr, setQr] = useState<string>('');
  const mx = useMotionValue(0.5), my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 180, damping: 18 });
  const sheen = useTransform([mx, my], ([x, y]: number[]) => `radial-gradient(420px circle at ${x * 100}% ${y * 100}%, rgba(255,235,210,0.16), transparent 55%)`);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(verifyUrl(c.number), { margin: 1, width: 240, errorCorrectionLevel: 'M', color: { dark: '#0f1215', light: '#ece8df' } }).then((u) => { if (live) setQr(u); }).catch(() => {});
    return () => { live = false; };
  }, [c.number]);

  const move = (e: React.PointerEvent) => {
    if (reduce || e.pointerType === 'touch' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width); my.set((e.clientY - r.top) / r.height);
  };
  const leave = () => { mx.set(0.5); my.set(0.5); };
  const issued = (c.status ?? 'ISSUED') === 'ISSUED';

  return (
    <div className={`cred-wrap${compact ? ' cred-compact' : ''}`} onPointerMove={move} onPointerLeave={leave}>
      <motion.article ref={ref} className="cred" style={reduce ? undefined : { rotateX: rx, rotateY: ry }} aria-label={`Credential: ${c.title}`}>
        <Guilloche />
        <motion.div className="cred-sheen" style={{ background: sheen }} aria-hidden />
        <header><span className="cred-org">National Council for Cooperative Training</span>{issued && <span className="cred-seal"><BadgeCheck size={14} aria-hidden /> In the national registry</span>}{!issued && <span className="cred-seal cred-revoked">{c.status}</span>}</header>
        <div className="cred-kicker">Certificate of completion</div>
        {c.recipient && <div className="cred-name">{c.recipient}</div>}
        <h3 className="cred-title">{c.title}</h3>
        {(c.programme || c.grade) && <div className="cred-meta">{[c.programme, c.grade].filter(Boolean).join(' · ')}</div>}
        <footer>
          <div className="cred-facts">
            <div><small>Credential ID</small><span className="num">{c.number}</span></div>
            {c.issued && <div><small>Issued</small><span>{fmt(c.issued)}</span></div>}
            {c.issuer && <div><small>Issued by</small><span>{c.issuer}</span></div>}
          </div>
          {qr && <img className="cred-qr" src={qr} alt={`QR code linking to the public verification page for ${c.number}`} />}
        </footer>
      </motion.article>
    </div>
  );
}
