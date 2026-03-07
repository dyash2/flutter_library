import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';

export default function App({ Component, pageProps }) {
  return (
    <>
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
