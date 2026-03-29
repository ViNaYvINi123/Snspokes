import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const FEATURED = [
  { slug: 'slack', name: 'Slack', icon: '💬', desc: 'Send messages, create channels, manage users and notifications', color: '#4A154B' },
  { slug: 'jira', name: 'Jira', icon: '🔷', desc: 'Create issues, update sprints, sync projects with Jira', color: '#0052CC' },
  { slug: 'microsoft-teams', name: 'Microsoft Teams', icon: '🟦', desc: 'Post messages, manage channels, send adaptive cards', color: '#5059C9' },
  { slug: 'github', name: 'GitHub', icon: '🐙', desc: 'Manage repos, issues, pull requests and workflows', color: '#238636' },
  { slug: 'aws', name: 'AWS', icon: '☁️', desc: 'Manage EC2, S3, Lambda and other AWS services', color: '#FF9900' },
  { slug: 'pagerduty', name: 'PagerDuty', icon: '🚨', desc: 'Create incidents, manage on-call schedules and alerts', color: '#25c151' },
];

const STATS = [
  { value: '200+', label: 'Integration Spokes' },
  { value: '50K+', label: 'Monthly Developers' },
  { value: '100%', label: 'Free to Use' },
  { value: '24/7', label: 'AI Powered' },
];

export default function Home() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      <Head>
        <title>snspokes — ServiceNow Integration Hub Spokes Reference</title>
        <meta name="description" content="The definitive reference for ServiceNow Integration Hub spokes. Search, explore and understand every spoke with AI-powered explanations." />
      </Head>
      <Navbar />
      <main>

        {/* Hero */}
        <section className="hero-bg grid-bg" style={{ paddingTop: '140px', paddingBottom: '100px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '10%', left: '15%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '30%', right: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', border: '1px solid rgba(108,99,255,0.3)', background: 'rgba(108,99,255,0.08)', marginBottom: '32px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6c63ff', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '13px', color: '#8b85ff', fontWeight: '500' }}>AI-Powered ServiceNow Reference</span>
            </div>

            <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: '800', lineHeight: '1.1', marginBottom: '24px', color: '#fff' }}>
              The Reference for{' '}
              <span className="gradient-text">ServiceNow Spokes</span>
            </h1>

            <p style={{ fontSize: '18px', color: '#9999bb', lineHeight: '1.7', marginBottom: '48px', maxWidth: '600px', margin: '0 auto 48px' }}>
              Search any Integration Hub spoke and instantly get setup guides, available actions, code examples, and AI-powered explanations.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} style={{ maxWidth: '600px', margin: '0 auto 40px' }}>
              <div style={{ display: 'flex', gap: '12px', padding: '8px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '16px' }}>
                <span style={{ paddingLeft: '12px', display: 'flex', alignItems: 'center', fontSize: '20px' }}>🔍</span>
                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search spokes... e.g. Slack, Jira, AWS"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '16px', fontFamily: 'Syne, sans-serif', padding: '8px 0' }} />
                <button type="submit" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' }}>
                  Search
                </button>
              </div>
            </form>

            {/* Quick links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
              {['Slack', 'Jira', 'GitHub', 'AWS', 'Teams', 'PagerDuty', 'Salesforce', 'Okta'].map(s => (
                <button key={s} onClick={() => router.push(`/search?q=${s}`)} style={{ padding: '6px 14px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '20px', color: '#8b85ff', fontSize: '13px', cursor: 'pointer', fontFamily: 'Syne, sans-serif', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.15)'; e.currentTarget.style.borderColor = '#6c63ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.2)'; }}
                >{s}</button>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section style={{ padding: '60px 24px', borderBottom: '1px solid #1e1e2e' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '24px', textAlign: 'center' }}>
            {STATS.map(s => (
              <div key={s.label}>
                <div style={{ fontSize: '36px', fontWeight: '800', color: '#6c63ff', marginBottom: '8px' }}>{s.value}</div>
                <div style={{ fontSize: '14px', color: '#6b6b8a' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Spokes */}
        <section style={{ padding: '80px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '36px', fontWeight: '800', color: '#fff', marginBottom: '12px' }}>Popular Spokes</h2>
              <p style={{ color: '#6b6b8a', fontSize: '16px' }}>Most searched Integration Hub spokes by ServiceNow developers</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {FEATURED.map(spoke => (
                <Link key={spoke.slug} href={`/spoke/${spoke.slug}`} style={{ textDecoration: 'none' }}>
                  <div className="card-hover" style={{ padding: '24px', borderRadius: '16px', background: '#0f0f1a', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: spoke.color + '22', border: `1px solid ${spoke.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{spoke.icon}</div>
                      <div>
                        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>{spoke.name}</h3>
                        <span style={{ fontSize: '11px', color: '#6b6b8a', fontFamily: 'JetBrains Mono, monospace' }}>snspokes/{spoke.slug}</span>
                      </div>
                    </div>
                    <p style={{ color: '#9999bb', fontSize: '14px', lineHeight: '1.5' }}>{spoke.desc}</p>
                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: '#6c63ff', fontSize: '13px', fontWeight: '600' }}>View details →</div>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <Link href="/spokes" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#9999bb', textDecoration: 'none', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6c63ff'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.color = '#9999bb'; }}
              >View all spokes →</Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ padding: '80px 24px', background: '#0a0a14' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: '36px', fontWeight: '800', color: '#fff', marginBottom: '12px' }}>How It Works</h2>
              <p style={{ color: '#6b6b8a', fontSize: '16px' }}>Get spoke details in seconds, not hours</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
              {[
                { step: '01', title: 'Search any spoke', desc: 'Type the spoke name — Slack, Jira, AWS, or any of 200+ Integration Hub spokes', icon: '🔍' },
                { step: '02', title: 'AI analyzes it', desc: 'Our AI powered by Ollama instantly generates comprehensive spoke reference docs', icon: '🤖' },
                { step: '03', title: 'Get full reference', desc: 'See setup steps, all actions, code examples, common errors and fixes', icon: '📋' },
              ].map(item => (
                <div key={item.step} style={{ padding: '32px', background: '#0f0f1a', borderRadius: '16px', border: '1px solid #1e1e2e' }}>
                  <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#6c63ff', fontWeight: '600', marginBottom: '16px' }}>{item.step}</div>
                  <div style={{ fontSize: '32px', marginBottom: '16px' }}>{item.icon}</div>
                  <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '10px' }}>{item.title}</h3>
                  <p style={{ color: '#6b6b8a', fontSize: '14px', lineHeight: '1.6' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '100px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '40px', fontWeight: '800', color: '#fff', marginBottom: '16px' }}>Start exploring spokes <span className="gradient-text">for free</span></h2>
            <p style={{ color: '#6b6b8a', fontSize: '16px', marginBottom: '40px' }}>No credit card required. Search any ServiceNow Integration Hub spoke instantly.</p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register" style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', borderRadius: '10px', color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: '600' }}>Get started free →</Link>
              <Link href="/spokes" style={{ padding: '14px 32px', border: '1px solid #1e1e2e', borderRadius: '10px', color: '#9999bb', textDecoration: 'none', fontSize: '15px', fontWeight: '500', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6c63ff'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.color = '#9999bb'; }}
              >Browse spokes</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
