import { useId, useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, LogIn } from 'lucide-react';
import { navigate } from '../lib/route';
import { useAuth } from '../state/auth';
import { ApiError } from '../api/client';
import { DEMO_ACCOUNTS, ROLE_META, type UiRole } from '../types';
import { Button } from '../ui/primitives';
import { Wordmark } from '../ui/Wordmark';
import { NCCTNetworkGateway } from './NCCTNetworkGateway';

export function Login() {
  const reduce = useReducedMotion();
  const { login } = useAuth();
  const emailId = useId(), pwId = useId(), errId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<UiRole | null>(null);

  const pick = (a: (typeof DEMO_ACCOUNTS)[number]) => {
    setPreview(a.role); setEmail(a.email); setPassword(a.password); setError('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      await login(email.trim(), password);
      navigate('#/app');
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError('Unable to reach the NCCT service. Check your connection and try again.');
      } else if (err instanceof ApiError && err.status >= 500) {
        setError('The NCCT service is temporarily unavailable. Please try again shortly.');
      } else {
        const msg = err instanceof Error ? err.message : 'Sign-in failed';
        setError(/invalid|unauthor|credential/i.test(msg) ? 'Those credentials were not recognised.' : msg);
      }
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <a className="skip-link" href="#signin-form">Skip to sign in</a>
      <header className="land-top">
        <Wordmark />
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={15} />} onClick={() => navigate('#/')}>Back to overview</Button>
      </header>

      <motion.div className="login-card"
        initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
        <div className="eyebrow">Secure access</div>
        <h1 className="display display-sm">Enter your <em>workspace</em></h1>
        <p className="login-sub">Sign in with your NCCT account. Your role decides what you see.</p>

        <form id="signin-form" onSubmit={submit} noValidate aria-describedby={error ? errId : undefined}>
          <div className="field">
            <label htmlFor={emailId}>Email</label>
            <input id={emailId} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@institution.gov.in" />
          </div>
          <div className="field">
            <label htmlFor={pwId}>Password</label>
            <div className="pw-wrap">
              <input id={pwId} type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              <button type="button" className="icon-btn pw-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div id={errId} className="form-error" role="alert" aria-live="assertive">{error}</div>
          <Button type="submit" variant="primary" size="lg" magnetic loading={busy} disabled={!email || !password} icon={<LogIn size={17} />} className="login-submit">
            Sign in
          </Button>
        </form>

        {import.meta.env.DEV && (
          <div className="demo">
            <div className="eyebrow">Demo accounts · development build</div>
            <div className="demo-grid" role="group" aria-label="Fill credentials for a seeded demo account">
              {DEMO_ACCOUNTS.map((a) => (
                <button key={a.role} type="button" className={`demo-chip${preview === a.role ? ' is-active' : ''}`} onClick={() => pick(a)} onPointerEnter={() => !email && setPreview(a.role)} aria-pressed={preview === a.role}>
                  <strong>{ROLE_META[a.role].label}</strong>
                  <small>{ROLE_META[a.role].title}</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <NCCTNetworkGateway />
    </div>
  );
}
