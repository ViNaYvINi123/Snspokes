import { useState } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { formatScript } from '../../lib/scriptFormatter';

export default function Formatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [changes, setChanges] = useState([]);
  const [copied, setCopied] = useState(false);

  const doFormat = () => {
    const { formatted, changes: c } = formatScript(input);
    setOutput(formatted);
    setChanges(c);
  };

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <>
      <Head><title>Script Formatter — snspokes</title></Head>
      <Navbar />
      <main style={{ paddingTop: '80px', minHeight: '100vh' }}>
        <section style={{ padding: '40px 24px 20px', borderBottom: '1px solid #1a1a2e' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}><span className="gradient-text">Script Formatter</span></h1>
            <p style={{ color: '#666', fontSize: '14px' }}>Auto-indent, cleanup, and best practice hints — zero AI, instant</p>
          </div>
        </section>
        <section style={{ padding: '24px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>Input</span>
                <button onClick={doFormat} style={{ padding: '6px 18px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>Format ⚡</button>
              </div>
              <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste your ServiceNow script here..."
                style={{ width: '100%', height: '400px', padding: '16px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '12px', color: '#a8b2d8', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", lineHeight: '1.6', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase' }}>Output</span>
                {output && <button onClick={copy} style={{ padding: '6px 14px', background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(108,99,255,0.1)', border: '1px solid ' + (copied ? 'rgba(74,222,128,0.25)' : 'rgba(108,99,255,0.2)'), borderRadius: '8px', color: copied ? '#4ade80' : '#8b85ff', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>{copied ? '✓ Copied' : 'Copy'}</button>}
              </div>
              <pre style={{ width: '100%', height: '400px', padding: '16px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '12px', color: '#a8b2d8', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", lineHeight: '1.6', overflow: 'auto', margin: 0, boxSizing: 'border-box' }}>{output || 'Formatted output will appear here...'}</pre>
            </div>
          </div>
          {changes.length > 0 && (
            <div style={{ maxWidth: '1000px', margin: '16px auto 0' }}>
              {changes.map((c, i) => (
                <div key={i} style={{ fontSize: '12px', color: c.startsWith('⚠️') ? '#facc15' : '#4ade80', padding: '4px 0' }}>{c.startsWith('⚠️') ? c : '✅ ' + c}</div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
