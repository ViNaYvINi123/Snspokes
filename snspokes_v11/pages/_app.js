import { SessionProvider } from 'next-auth/react';
import '../styles/globals.css';
import Chatbot from '../components/Chatbot';
import CookieBanner from '../components/CookieBanner';
import AnnouncementBanner from '../components/AnnouncementBanner';

// Start cron jobs (server-side only)
if (typeof window === 'undefined') {
  import('../lib/cron').then(m => m.startCronJobs()).catch(() => {});
}

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
      <Chatbot />
      <CookieBanner />
      <AnnouncementBanner />
    </SessionProvider>
  );
}
