import Link from 'next/link';

export default function UpgradeWall({ message, feature }) {
  return (
    <div style={{ padding: '32px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(168,85,247,0.04))', border: '1px solid rgba(108,99,255,0.15)', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
      <h3 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Daily limit reached</h3>
      <p style={{ color: '#777', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
        {message || `You've used all your free ${feature || 'AI'} requests for today. Upgrade to Pro for 20x more.`}
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/pricing" style={{ padding: '10px 28px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>
          Upgrade to Pro — ₹799/mo
        </Link>
        <span style={{ padding: '10px 16px', color: '#555', fontSize: '13px', alignSelf: 'center' }}>or wait for daily reset</span>
      </div>
      <div style={{ marginTop: '20px', display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '12px', color: '#555' }}>
        <span>✅ 2,000 searches/day</span>
        <span>✅ 500 AI generations</span>
        <span>✅ Priority AI models</span>
      </div>
    </div>
  );
}
