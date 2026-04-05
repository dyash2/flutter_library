import '../styles/globals.css';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Head from 'next/head';
import { DomainProvider, useDomain } from '../context/DomainContext';

// ─────────────────────────────────────────────────────────────
// Capture the install prompt at MODULE LEVEL — before React mounts.
// beforeinstallprompt fires once, very early. Any useEffect is too late.
// ─────────────────────────────────────────────────────────────
let _deferredPrompt = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    window.dispatchEvent(new Event('pwa-installable'));
  });
}

// ── Install Banner ────────────────────────────────────────────
function InstallBanner() {
  const { domain } = useDomain();
  const [visible, setVisible]           = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    if (localStorage.getItem('pwa-banner-dismissed')) return;

    if (_deferredPrompt) { setVisible(true); return; }

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
          toast.success(`${domain.shortName} installed! Open it from your home screen 🎉`)
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
        className="mx-4 mb-4 rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
          boxShadow: '0 -4px 40px var(--accent-glow), 0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Gradient top accent */}
        <div className="h-0.5 w-full"
          style={{ background: `linear-gradient(90deg, var(--accent), var(--accent-light), var(--accent))` }} />

        <div className="flex items-center gap-4 px-5 py-4">
          {/* App icon */}
          <div
            className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-xl"
            style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-light))` }}
          >
            {domain.icon}
          </div>

          {/* Copy */}
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm leading-tight" style={{ color: 'var(--text)' }}>
              Install {domain.shortName}
            </p>
            <p className="text-xs font-body mt-0.5 leading-snug" style={{ color: 'var(--muted)' }}>
              Add to home screen · works offline · no browser chrome
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDismiss}
              className="px-3 py-2 rounded-xl text-xs font-display transition-all"
              style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              className="px-4 py-2 rounded-xl text-xs font-display text-white transition-all"
              style={{ background: `linear-gradient(135deg, var(--accent), var(--accent-light))` }}
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inner App (has access to DomainContext) ───────────────────
function InnerApp({ Component, pageProps }) {
  const { domain } = useDomain();

  return (
    <>
      <Head>
        <meta name="application-name" content={domain.shortName} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={domain.shortName} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content={domain.accent} />
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
            background: 'var(--card)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: 'var(--accent)', secondary: 'var(--bg)' } },
          error:   { iconTheme: { primary: '#f87171',       secondary: 'var(--bg)' } },
        }}
      />
    </>
  );
}

// ── App root ──────────────────────────────────────────────────
export default function App({ Component, pageProps }) {
  return (
    <DomainProvider>
      <InnerApp Component={Component} pageProps={pageProps} />
    </DomainProvider>
  );
}
