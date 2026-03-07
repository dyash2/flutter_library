import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';
import Head from 'next/head';

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
