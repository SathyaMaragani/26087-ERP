import { useCallback, useEffect, useRef, useState } from 'react';

type Detector = { detect: (v: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };

/** Camera QR scanning where the browser exposes BarcodeDetector; callers fall back to typing when unsupported. */
export function useQrScan(onCode: (raw: string) => void, onError?: () => void) {
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cb = useRef(onCode);
  cb.current = onCode;

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | undefined;
    let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        const Ctor = (window as unknown as { BarcodeDetector: new (o: object) => Detector }).BarcodeDetector;
        const det = new Ctor({ formats: ['qr_code'] });
        const loop = async () => {
          if (stop || !videoRef.current) return;
          try {
            const hit = await det.detect(videoRef.current);
            if (hit[0]?.rawValue) { setScanning(false); cb.current(hit[0].rawValue); return; }
          } catch { /* frame not ready */ }
          window.setTimeout(loop, 220);
        };
        loop();
      } catch { setScanning(false); onError?.(); }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return { supported, scanning, start: useCallback(() => setScanning(true), []), stop: useCallback(() => setScanning(false), []), videoRef };
}

/** A scanned certificate QR may be a full URL or just the number. */
export function certNumberFromScan(raw: string): string {
  try {
    const m = raw.match(/verify\/([^/?#\s]+)/i);
    return decodeURIComponent(m ? m[1] : raw).trim().toUpperCase();
  } catch { return raw.trim().toUpperCase(); }
}
