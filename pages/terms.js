import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Terms() {
  const s = { page: { minHeight:'100vh', background:'#080810', fontFamily:"'DM Sans', system-ui, sans-serif" }, content: { maxWidth:'720px', margin:'0 auto', padding:'80px 24px 60px', color:'#c4c4e0', lineHeight:'1.8', fontSize:'14px' }, h1: { fontSize:'28px', fontWeight:'800', color:'#e2e8f0', marginBottom:'24px' }, h2: { fontSize:'18px', fontWeight:'700', color:'#e2e8f0', margin:'32px 0 12px' }, p: { marginBottom:'16px' } };

  return (
    <>
      <Head><title>Terms of Service — snspokes</title></Head>
      <Navbar />
      <div style={s.page}>
        <div style={s.content}>
          <h1 style={s.h1}>Terms of Service</h1>
          <p style={s.p}>Last updated: April 2026</p>

          <h2 style={s.h2}>1. Acceptance</h2>
          <p style={s.p}>By using snspokes, you agree to these terms. If you do not agree, please do not use the service.</p>

          <h2 style={s.h2}>2. Service Description</h2>
          <p style={s.p}>snspokes is a reference platform for ServiceNow Integration Hub spokes. We provide AI-generated documentation, search tools, and developer utilities.</p>

          <h2 style={s.h2}>3. User Accounts</h2>
          <p style={s.p}>You are responsible for maintaining the security of your account. You must not share your credentials or use the service for unauthorized purposes.</p>

          <h2 style={s.h2}>4. Subscriptions & Payments</h2>
          <p style={s.p}>Paid plans are billed monthly through Razorpay. You can cancel at any time. Refunds are handled on a case-by-case basis.</p>

          <h2 style={s.h2}>5. Acceptable Use</h2>
          <p style={s.p}>You may not use snspokes to abuse APIs, scrape content in bulk, reverse engineer the platform, or engage in any activity that disrupts the service for other users.</p>

          <h2 style={s.h2}>6. AI-Generated Content</h2>
          <p style={s.p}>Spoke documentation is generated using AI models. While we strive for accuracy, we do not guarantee that all AI-generated content is error-free. Always verify critical information against official ServiceNow documentation.</p>

          <h2 style={s.h2}>7. Limitation of Liability</h2>
          <p style={s.p}>snspokes is provided "as is" without warranties. We are not liable for any damages arising from the use of this service.</p>

          <h2 style={s.h2}>8. Contact</h2>
          <p style={s.p}>For questions about these terms, contact us at legal@snspokes.com.</p>
        </div>
      </div>
      <Footer />
    </>
  );
}
