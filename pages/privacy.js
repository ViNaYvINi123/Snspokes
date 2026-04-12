import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Privacy() {
  const s = { page: { minHeight:'100vh', background:'#080810', fontFamily:"'DM Sans', system-ui, sans-serif" }, content: { maxWidth:'720px', margin:'0 auto', padding:'80px 24px 60px', color:'#c4c4e0', lineHeight:'1.8', fontSize:'14px' }, h1: { fontSize:'28px', fontWeight:'800', color:'#e2e8f0', marginBottom:'24px' }, h2: { fontSize:'18px', fontWeight:'700', color:'#e2e8f0', margin:'32px 0 12px' }, p: { marginBottom:'16px' } };

  return (
    <>
      <Head><title>Privacy Policy — snspokes</title></Head>
      <Navbar />
      <div style={s.page}>
        <div style={s.content}>
          <h1 style={s.h1}>Privacy Policy</h1>
          <p style={s.p}>Last updated: April 2026</p>

          <h2 style={s.h2}>1. Information We Collect</h2>
          <p style={s.p}>When you create an account, we collect your name, email address, and authentication provider details. We also collect usage data such as search queries, page views, and feature usage to improve the service.</p>

          <h2 style={s.h2}>2. How We Use Your Information</h2>
          <p style={s.p}>We use your information to provide and improve snspokes, personalize your experience, process payments, and send important updates about the service.</p>

          <h2 style={s.h2}>3. Data Storage</h2>
          <p style={s.p}>Your data is stored on secure servers hosted by Hetzner in Europe. We use encryption in transit (SSL/TLS) and follow industry security best practices.</p>

          <h2 style={s.h2}>4. Third-Party Services</h2>
          <p style={s.p}>We use Google OAuth for authentication, Razorpay for payment processing, and OpenRouter for AI features. Each service has its own privacy policy.</p>

          <h2 style={s.h2}>5. Your Rights</h2>
          <p style={s.p}>You can request to view, update, or delete your personal data at any time by contacting us. You can also delete your account from the dashboard settings.</p>

          <h2 style={s.h2}>6. Contact</h2>
          <p style={s.p}>For privacy-related questions, contact us at privacy@snspokes.com.</p>
        </div>
      </div>
      <Footer />
    </>
  );
}
