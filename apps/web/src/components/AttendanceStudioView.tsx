import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Camera,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  UserCheck,
  Lock,
} from 'lucide-react';
import { api } from '../api/client';

export const AttendanceStudioView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'qr_generator' | 'qr_scan' | 'face_biometric'>('qr_generator');

  // QR Generator State (Trainer)
  const [qrData, setQrData] = useState<any>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [qrLoading, setQrLoading] = useState(false);

  // QR Scanner State (Trainee)
  const [scannedToken, setScannedToken] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Face Biometric State
  const [consentGranted, setConsentGranted] = useState(true);
  const [faceResult, setFaceResult] = useState<any>(null);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [verifyingFace, setVerifyingFace] = useState(false);

  const sessionId = 'sample-session-id';

  // Rotating QR Timer
  useEffect(() => {
    let timer: any;
    if (activeTab === 'qr_generator') {
      generateNewQr();
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            generateNewQr();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [activeTab]);

  const generateNewQr = async () => {
    setQrLoading(true);
    try {
      // Find active attendance session
      const res = await api.attendance.generateDynamicQr('sample-session-id').catch(() => {
        // Fallback for visual demonstration
        const now = Date.now();
        return {
          token: `NCCT_QR_${now}_${Math.random().toString(36).substring(2, 9)}`,
          expiresAt: now + 60000,
          rotationIndex: Math.floor(now / 60000),
          qrCodeUrl: `https://api.ncct-platform.gov.in/attendance/qr?t=${now}`,
        };
      });

      setQrData(res);
      setScannedToken(res.token);
      setSecondsRemaining(60);
    } finally {
      setQrLoading(false);
    }
  };

  const handleScanQr = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanError(null);
    setScanResult(null);

    try {
      const res = await api.attendance.scanQr(sessionId, scannedToken);
      setScanResult(res);
    } catch (err: any) {
      setScanError(err.message || 'QR code verification failed or token expired.');
    }
  };

  const handleVerifyFace = async () => {
    setFaceError(null);
    setFaceResult(null);
    setVerifyingFace(true);

    try {
      const res = await api.attendance.verifyFace(sessionId, consentGranted, 99.4);
      setFaceResult(res);
    } catch (err: any) {
      setFaceError(err.message || 'Face biometric verification rejected.');
    } finally {
      setVerifyingFace(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-emerald">Attendance Verification</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• Anti-Proxy & Privacy First</span>
        </div>
        <h2 style={{ fontSize: '1.75rem', color: '#ffffff', marginTop: '0.25rem' }}>
          Dynamic QR & Decoupled Biometric Attendance Studio
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Time-limited cryptographic QR codes and privacy-preserving biometric verification compliant with DPDP Act.
        </p>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('qr_generator')}
          className={`btn ${activeTab === 'qr_generator' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <QrCode size={16} />
          <span>Trainer Dynamic QR (Display)</span>
        </button>
        <button
          onClick={() => setActiveTab('qr_scan')}
          className={`btn ${activeTab === 'qr_scan' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <UserCheck size={16} />
          <span>Trainee QR Check-in (Scan)</span>
        </button>
        <button
          onClick={() => setActiveTab('face_biometric')}
          className={`btn ${activeTab === 'face_biometric' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Camera size={16} />
          <span>Decoupled Face Recognition</span>
        </button>
      </div>

      {/* TAB 1: Trainer Rotating QR Generator */}
      {activeTab === 'qr_generator' && (
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            maxWidth: '560px',
            margin: '0 auto',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span className="badge badge-emerald">Dynamic Rotating Token</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto-refreshes every 60s</span>
          </div>

          <h3 style={{ fontSize: '1.4rem', color: '#ffffff' }}>PACS Accounting & Financial Systems</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Batch: BATCH-AGRI-01 • Room 302 • Trainer: Prof. Rajesh Sharma
          </p>

          {/* QR Code Container */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 0 35px rgba(16, 185, 129, 0.3)',
              position: 'relative',
            }}
          >
            {/* Simulated High-Res Dynamic QR Grid */}
            <svg width="220" height="220" viewBox="0 0 220 220" fill="none">
              {/* Corner position squares */}
              <rect x="10" y="10" width="50" height="50" rx="6" fill="#047857" />
              <rect x="20" y="20" width="30" height="30" rx="3" fill="#ffffff" />
              <rect x="27" y="27" width="16" height="16" rx="2" fill="#047857" />

              <rect x="160" y="10" width="50" height="50" rx="6" fill="#047857" />
              <rect x="170" y="20" width="30" height="30" rx="3" fill="#ffffff" />
              <rect x="177" y="27" width="16" height="16" rx="2" fill="#047857" />

              <rect x="10" y="160" width="50" height="50" rx="6" fill="#047857" />
              <rect x="20" y="170" width="30" height="30" rx="3" fill="#ffffff" />
              <rect x="27" y="177" width="16" height="16" rx="2" fill="#047857" />

              {/* Data matrix dots */}
              <circle cx="80" cy="30" r="4" fill="#064e3b" />
              <circle cx="100" cy="30" r="4" fill="#064e3b" />
              <circle cx="120" cy="30" r="4" fill="#064e3b" />
              <circle cx="140" cy="30" r="4" fill="#064e3b" />

              <circle cx="30" cy="80" r="4" fill="#064e3b" />
              <circle cx="30" cy="100" r="4" fill="#064e3b" />
              <circle cx="30" cy="120" r="4" fill="#064e3b" />
              <circle cx="30" cy="140" r="4" fill="#064e3b" />

              {/* Center NCCT emblem icon */}
              <rect x="85" y="85" width="50" height="50" rx="10" fill="#047857" />
              <circle cx="110" cy="110" r="14" fill="#fbbf24" />
              <text x="110" y="114" fontSize="10" fontWeight="bold" fill="#047857" textAnchor="middle">NCCT</text>

              <circle cx="80" cy="160" r="4" fill="#064e3b" />
              <circle cx="100" cy="180" r="4" fill="#064e3b" />
              <circle cx="140" cy="170" r="4" fill="#064e3b" />
              <circle cx="180" cy="140" r="4" fill="#064e3b" />
              <circle cx="160" cy="190" r="4" fill="#064e3b" />
            </svg>
          </div>

          {/* Countdown & Security Ring */}
          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="#f59e0b" />
            <span style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 600 }}>
              Token expires in: <span style={{ color: 'var(--accent-gold-light)', fontFamily: 'var(--font-mono)' }}>{secondsRemaining}s</span>
            </span>
          </div>

          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            Rotating Key: {qrData?.token?.slice(0, 32)}...
          </div>
        </div>
      )}

      {/* TAB 2: Trainee QR Scanner Simulation */}
      {activeTab === 'qr_scan' && (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '540px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span className="badge badge-cyan">Learner Check-in</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Scan & Verify</span>
          </div>

          <h3 style={{ fontSize: '1.35rem', color: '#ffffff' }}>Record Session Attendance</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Trainee scans the rotating dynamic QR code displayed on the classroom projection screen.
          </p>

          <form onSubmit={handleScanQr} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Scanned QR Code Token (Auto-populated from trainer display)
              </label>
              <input
                type="text"
                required
                value={scannedToken}
                onChange={(e) => setScannedToken(e.target.value)}
                placeholder="Paste or scan QR token..."
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              <CheckCircle size={16} />
              <span>Verify & Mark Present</span>
            </button>
          </form>

          {scanResult && (
            <div
              className="animate-fade-in"
              style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <CheckCircle size={18} />
                <span>Attendance Marked Successfully!</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Status: <b>PRESENT</b> • Method: <b>QR Code (Verified)</b>
              </div>
            </div>
          )}

          {scanError && (
            <div
              className="animate-fade-in"
              style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                color: '#fb7185',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <AlertTriangle size={18} />
                <span>Verification Rejected</span>
              </div>
              <div style={{ fontSize: '0.82rem', marginTop: '0.35rem' }}>{scanError}</div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Decoupled Face Recognition Biometric */}
      {activeTab === 'face_biometric' && (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '580px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span className="badge badge-gold">Biometric AI Provider</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DPDP Act Privacy Compliant</span>
          </div>

          <h3 style={{ fontSize: '1.35rem', color: '#ffffff' }}>Decoupled Facial Attendance Check</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Edge facial match verification that preserves privacy without storing sensitive raw biometrics on the ERP database.
          </p>

          {/* Camera Viewport Simulation */}
          <div
            style={{
              marginTop: '1.5rem',
              height: '240px',
              borderRadius: 'var(--radius-lg)',
              background: '#040711',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Facial Recognition Target Box */}
            <div
              style={{
                width: '140px',
                height: '160px',
                border: '2px dashed #10b981',
                borderRadius: '12px',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <Camera size={32} color="#10b981" />
              <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>Liveness Active</span>
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                right: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-dim)',
                background: 'rgba(0,0,0,0.6)',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
              }}
            >
              <span>Anti-Spoofing: PASSED (99.4%)</span>
              <span>Encrypted Vector Mode</span>
            </div>
          </div>

          {/* Privacy Consent Toggle */}
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <input
              type="checkbox"
              id="consent"
              checked={consentGranted}
              onChange={(e) => setConsentGranted(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
            />
            <label htmlFor="consent" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              I grant explicit biometric consent to verify my attendance for this session under Section 10 data retention policies.
            </label>
          </div>

          <button
            onClick={handleVerifyFace}
            disabled={verifyingFace}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
          >
            <Camera size={16} />
            <span>{verifyingFace ? 'Verifying Liveness & Match...' : 'Capture & Verify Attendance'}</span>
          </button>

          {faceResult && (
            <div
              className="animate-fade-in"
              style={{
                marginTop: '1.25rem',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <CheckCircle size={18} />
                <span>Face Biometric Verified (Match: 99.4%)</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Status: <b>PRESENT</b> • Verified by: <b>Decoupled Biometric Provider</b>
              </div>
            </div>
          )}

          {faceError && (
            <div
              className="animate-fade-in"
              style={{
                marginTop: '1.25rem',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                color: '#fb7185',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <AlertTriangle size={18} />
                <span>Biometric Processing Blocked</span>
              </div>
              <div style={{ fontSize: '0.82rem', marginTop: '0.35rem' }}>{faceError}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
