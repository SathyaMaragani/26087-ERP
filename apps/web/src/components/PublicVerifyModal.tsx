import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Building2, Check, GraduationCap, ScanLine, Search, ShieldCheck, ShieldX, UserRound } from 'lucide-react';
import { api } from '../api/client';
import { certNumberFromScan, useQrScan } from '../lib/useQrScan';
import { EASE } from '../motion/primitives';
import { CredentialCard } from '../ui/CredentialCard';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/primitives';

interface Props { isOpen?: boolean; onClose: () => void; initialCode?: string }
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const STEPS = ['SCAN', 'LOOKUP', 'AUTHENTICITY', 'HOLDER', 'PROGRAMME', 'ISSUER'] as const;
const pretty = (s?: string) => (s ?? '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

/**
 * Public credential verification: SCAN QR → LOOKUP → AUTHENTICITY → HOLDER → PROGRAMME → ISSUER.
 * The backend performs a national-registry lookup and reports status; it does not check a cryptographic
 * signature, and this screen says exactly that.
 */
export function PublicVerifyModal({ isOpen = true, onClose, initialCode = '' }: Props) {
  const reduce = useReducedMotion();
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const timers = useRef<number[]>([]);

  const verify = async (raw: string) => {
    const value = certNumberFromScan(raw);
    if (!value) return;
    setCode(value); setLoading(true); setError(null); setResult(null); setStep(1);
    timers.current.forEach(clearTimeout); timers.current = [];
    try {
      const res = await api.certifications.verifyPublic(value);
      setResult(res);
      const last = res?.isValid ? STEPS.length - 1 : 1;
      for (let s = 2; s <= last; s++) timers.current.push(window.setTimeout(() => setStep(s), reduce ? 0 : (s - 1) * 360));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification lookup failed');
    } finally { setLoading(false); }
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const scan = useQrScan((raw) => verify(raw), () => setError('Camera unavailable. Allow camera access, or type the certificate number.'));

  // Deep link: #/verify/<code> verifies immediately.
  useEffect(() => {
    if (isOpen && initialCode) { setCode(initialCode); verify(initialCode); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialCode]);

  const onSubmit = (e: FormEvent) => { e.preventDefault(); verify(code); };
  const c = result?.certificate;
  const valid = !!(result?.isValid && c);
  const reached = (i: number) => step >= i;

  return (
    <Modal open={isOpen} onClose={onClose} title="Verify a certificate" width={720}>
      <p className="modal-lede"><ShieldCheck size={15} aria-hidden /> Public national registry · no sign-in required</p>

      <ol className="vflow" aria-label="Verification steps">
        {STEPS.map((s, i) => (
          <li key={s} className={`${reached(i + 1) ? 'is-on' : ''}${result && !valid && i >= 2 ? ' is-fail' : ''}`}>
            <span className="vflow-dot" aria-hidden>{reached(i + 1) && (valid || i < 2) ? <Check size={11} /> : null}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>

      <form onSubmit={onSubmit} className="verify-form">
        <label htmlFor="verify-code" className="sr-only">Certificate number</label>
        <input id="verify-code" className="mono-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Certificate number, e.g. NCCT-2026-XXXXX" autoComplete="off" spellCheck={false} />
        {scan.supported && <Button type="button" icon={<ScanLine size={15} />} onClick={scan.scanning ? scan.stop : scan.start}>{scan.scanning ? 'Stop' : 'Scan QR'}</Button>}
        <Button type="submit" variant="primary" loading={loading} icon={<Search size={15} />} disabled={!code.trim()}>Verify</Button>
      </form>
      {scan.scanning && <div className="scan-view"><video ref={scan.videoRef} muted playsInline aria-label="Camera preview" /><div className="scan-reticle" aria-hidden /></div>}

      <div aria-live="polite">
        {error && <div className="verify-result verify-bad" role="alert"><AlertTriangle size={18} aria-hidden /><div><strong>Couldn't verify</strong><p>{error}</p></div></div>}
        {result && !valid && (
          <motion.div className="verify-result verify-bad" role="alert" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <ShieldX size={20} aria-hidden />
            <div><strong>{result.status ? 'This credential is no longer valid' : 'No matching credential'}</strong><p>{result.message ?? 'This number does not match an active NCCT certificate. It may be mistyped, revoked, or never issued.'}</p></div>
          </motion.div>
        )}
        <AnimatePresence>
          {valid && (
            <motion.div className="vresult" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {reached(3) && (
                <motion.div className="vpanel vpanel-auth" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
                  <ShieldCheck size={20} aria-hidden /><div><strong>Authentic — found in the NCCT National Registry</strong><p>{result.message}</p><p className="vnote">This is a registry record lookup with a live status check. It is not a cryptographic signature verification.</p></div>
                </motion.div>
              )}
              <div className="vgrid">
                {reached(4) && <motion.section className="vpanel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}><h4><UserRound size={13} aria-hidden /> Holder</h4><strong>{c.recipient?.name}</strong><span className="cell-sub num">{c.recipient?.traineeCode}</span>{c.recipient?.cooperativeAffiliation && <span className="cell-sub">{c.recipient.cooperativeAffiliation}</span>}</motion.section>}
                {reached(5) && <motion.section className="vpanel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}><h4><GraduationCap size={13} aria-hidden /> Programme</h4><strong>{c.programme?.title ?? '—'}</strong><span className="cell-sub num">{c.programme?.code}</span><span className="cell-sub">{c.programme?.category}</span></motion.section>}
                {reached(6) && <motion.section className="vpanel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}><h4><Building2 size={13} aria-hidden /> Issuer</h4><strong>{c.issuingAuthority?.institution}</strong><span className="cell-sub">{pretty(c.issuingAuthority?.type)}{c.issuingAuthority?.state ? ` · ${c.issuingAuthority.state}` : ''}</span><span className="cell-sub">Issued {fmt(c.issuedDate)}</span></motion.section>}
              </div>
              {reached(6) && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}>
                  <CredentialCard compact c={{ number: c.certificateNumber, title: c.title, recipient: c.recipient?.name, issued: c.issuedDate, grade: c.grade, issuer: c.issuingAuthority?.institution, programme: c.programme?.title, status: c.status }} />
                  {c.skillsAcquired?.length > 0 && (<><div className="eyebrow vskills-h">Endorsed competencies</div><ul className="chips chips-inline">{c.skillsAcquired.map((s: string) => <li key={s}>{s}</li>)}</ul></>)}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
