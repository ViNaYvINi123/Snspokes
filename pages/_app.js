
import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) {
    // Browser error boundary - console.error is intentional here for debugging
    if (typeof window !== 'undefined') console.error('[ErrorBoundary]', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0f', color:'#fff', textAlign:'center', padding:'24px', fontFamily:'system-ui' }}>
          <div>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>💥</div>
            <h2 style={{ fontSize:'24px', fontWeight:'800', margin:'0 0 12px' }}>Something went wrong</h2>
            <p style={{ color:'#9999bb', marginBottom:'24px', fontSize:'14px' }}>{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button onClick={() => { this.setState({ hasError:false, error:null }); window.location.reload(); }}
              style={{ padding:'10px 24px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'8px', color:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:'600' }}>
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { SessionProvider, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import '../styles/globals.css';
import AnnouncementBanner from '../components/AnnouncementBanner';
import CookieBanner from '../components/CookieBanner';
import Chatbot from '../components/Chatbot';
import CommandPalette from '../components/CommandPalette';
import { KeyboardHelp } from '../components/CommandPalette';

// Pages that don't need the onboarding check
const PUBLIC_PAGES = ['/login', '/register', '/onboarding', '/forgot-password', '/404', '/join-team', '/privacy', '/terms'];

function OnboardingGuard({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated') return;
    // Only redirect to onboarding from /dashboard — don't block other pages
    if (router.pathname === '/dashboard' && session?.user?.onboarded === false) {
      router.push('/onboarding');
    }
  }, [status, session, router.pathname]);

  return children;
}


function MaintenanceCheck({ children }) {
  const [maintenance, setMaintenance] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (router.pathname.startsWith('/admin')) return; // admin bypasses maintenance
    fetch('/api/health')
      .then(r => r.json())
      .then(d => { if (d.maintenance_mode === true) setMaintenance(true); })
      .catch(() => {});
  }, []);

  if (maintenance) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'24px', fontFamily:"'Syne', system-ui, sans-serif" }}>
      <div style={{ fontSize:'52px', marginBottom:'20px' }}>🔧</div>
      <h1 style={{ color:'#fff', fontSize:'28px', fontWeight:'800', marginBottom:'10px' }}>Down for Maintenance</h1>
      <p style={{ color:'#6b7280', fontSize:'15px', maxWidth:'380px', lineHeight:'1.6' }}>We're doing some quick improvements. We'll be back shortly!</p>
    </div>
  );
  return children;
}

function ShortcutHelp() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '?' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShow(s => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return <KeyboardHelp open={show} onClose={() => setShow(false)} />;
}

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <ErrorBoundary>
      <SessionProvider session={session}>
        <MaintenanceCheck>
          <OnboardingGuard>
            <AnnouncementBanner />
            <Component {...pageProps} />
            <CommandPalette />
            <ShortcutHelp />
            <Chatbot />
            <CookieBanner />
          </OnboardingGuard>
        </MaintenanceCheck>
      </SessionProvider>
    </ErrorBoundary>
  );
}
