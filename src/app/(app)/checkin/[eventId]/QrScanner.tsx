"use client";

import { useEffect, useRef, useState } from "react";

/** Continuously scans QR codes with the phone's back camera. Needs HTTPS (or localhost). */
export function QrScanner({ onScan }: { onScan: (text: string) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let cancelled = false;
    let busy = false;
    const recent = new Map<string, number>(); // ignore the same card for a few seconds

    // Resolves to a stop() function once the camera has started (or null if it failed).
    const started = (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return null;
      const scanner = new Html5Qrcode("qr-reader", { verbose: false });
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (text) => {
            const now = Date.now();
            if (busy || (recent.get(text) ?? 0) > now - 4000) return;
            busy = true;
            recent.set(text, now);
            try { await onScanRef.current(text); } finally { busy = false; }
          },
          () => {}, // "no QR in this frame" — ignore
        );
      } catch {
        if (!cancelled) setError("Can't open the camera. Allow camera access for this site in your browser settings, then reload.");
        return null;
      }
      return async () => { await scanner.stop(); scanner.clear(); };
    })();

    return () => {
      cancelled = true;
      started.then((stop) => stop?.()).catch(() => {});
    };
  }, []);

  return (
    <div className="space-y-2">
      <div id="qr-reader" className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-black" />
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>
      ) : (
        <p className="text-center text-sm text-gray-600">Hold the member&apos;s card in front of the camera. Keep this screen open for the next person.</p>
      )}
    </div>
  );
}
