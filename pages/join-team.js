import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function JoinTeam() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { token } = router.query;
  const [state, setState] = useState('loading'); // loading | joining | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/join-team?token=' + token);
      return;
    }
    if (status === 'authenticated' && token) {
      joinTeam();
    }
  }, [status, token]);

  async function joinTeam() {
    setState('joining');
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept_invite', token }),
      });
      const data = await res.json();
      if (data.success) {
        setState('success');
        setTimeout(() => router.push('/team'), 2000);
      } else {
        setState('error');
        setMessage(data.error || 'Invalid or expired invite link.');
      }
    } catch {
      setState('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  return (
    <>
      <Head>
        <title>Join Team — snspokes</title>
      </Head>
      <Navbar />
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#0a0a0f' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          {state === 'loading' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <p style={{ color: '#9999bb' }}>Loading...</p>
            </>
          )}
          {state === 'joining' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>Joining team...</h2>
              <p style={{ color: '#9999bb' }}>Please wait</p>
            </>
          )}
          {state === 'success' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <h2 style={{ color: '#4ade80', fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>You joined the team!</h2>
              <p style={{ color: '#9999bb' }}>Redirecting to team page...</p>
            </>
          )}
          {state === 'error' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
              <h2 style={{ color: '#f87171', fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>Could not join team</h2>
              <p style={{ color: '#9999bb', marginBottom: '24px' }}>{message}</p>
              <Link href="/" style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#6c63ff,#a855f7)', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
                Go Home
              </Link>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
