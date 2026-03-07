import '../styles/globals.css';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Head from 'next/head';

// ─────────────────────────────────────────────────────────────
// Capture the install prompt at MODULE LEVEL — before React mounts.
// beforeinstallprompt fires once, very early. Any useEffect is too late.
// ─────────────────────────────────────────────────────────────
let _deferredPrompt = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    // Notify any mounted component
    window.dispatchEvent(new Event('pwa-installable'));
  });
}

// ── Install Banner ────────────────────────────────────────────
function InstallBanner() {
  const [visible, setVisible]       = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Already running as installed PWA — hide forever
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // User dismissed before — respect that
    if (localStorage.getItem('pwa-banner-dismissed')) return;

    // Prompt was already captured before this component mounted
    if (_deferredPrompt) {
      setVisible(true);
      return;
    }

    // Otherwise wait for it
    const handler = () => setVisible(true);
    window.addEventListener('pwa-installable', handler);
    return () => window.removeEventListener('pwa-installable', handler);
  }, []);

  const handleInstall = async () => {
    if (!_deferredPrompt) return;
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    _deferredPrompt = null;
    setVisible(false);
    if (outcome === 'accepted') {
      setTimeout(() => {
        import('react-hot-toast').then(({ default: toast }) =>
          toast.success('Flutter Library installed! Open it from your home screen 🎉')
        );
      }, 800);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-banner-dismissed', '1');
    setVisible(false);
  };

  if (!visible || isStandalone) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="mx-4 mb-4 rounded-2xl border border-[#027DFD]/40 bg-[#0E1621]/95 backdrop-blur-md overflow-hidden"
        style={{ boxShadow: '0 -4px 40px rgba(2,125,253,0.18), 0 8px 32px rgba(0,0,0,0.5)' }}
      >
        {/* Gradient top accent */}
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg,#027DFD,#54C5F8,#027DFD)' }} />

        <div className="flex items-center gap-4 px-5 py-4">
          {/* App icon */}
          <div
            className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg,#027DFD 0%,#54C5F8 100%)' }}
          >
            📘
          </div>

          {/* Copy */}
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm text-white leading-tight">
              Install Flutter Library
            </p>
            <p className="text-xs text-[#8B9BB4] font-body mt-0.5 leading-snug">
              Add to home screen · works offline · no browser chrome
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDismiss}
              className="px-3 py-2 rounded-xl text-xs font-display text-[#8B9BB4] hover:text-white border border-[#1E2D42] hover:border-[#2A3F5C] transition-all"
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              className="px-4 py-2 rounded-xl text-xs font-display text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#027DFD,#0A8FFF)' }}
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────
export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="application-name" content="FlutterLib" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FlutterLib" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#027DFD" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
      </Head>

      <Component {...pageProps} />
      <InstallBanner />

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#151F2E',
            color: '#E8EEF7',
            border: '1px solid #1E2D42',
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#027DFD', secondary: '#0E1621' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#0E1621' } },
        }}
      />
    </>
  );
}
