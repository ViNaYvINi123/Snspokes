import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const SUGGESTED = [
  '🔌 How do I setup the Slack spoke?',
  '💻 Write a GlideRecord script for incidents',
  '🐛 Fix: ACL restricts access to this record',
  '📊 Build an encoded query for active changes',
  '⚡ What\'s new in Yokohama release?',
];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! 👋 I'm your snspokes assistant. Ask me anything — spokes, setup guides, code help, or general questions!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => 's_' + Date.now() + '_' + Math.random().toString(36).slice(2,8));
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post('/api/chatbot', {
        session_id: sessionId,
        question,
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.text }))
      }, { timeout: 120000 });
      setMessages(prev => [...prev, { role: 'assistant', text: res.data?.answer || 'Sorry, no response. Please try again.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ AI unavailable. Please try again shortly.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div style={{ position: 'fixed', bottom: '90px', right: '24px', zIndex: 1000, width: '380px', maxHeight: '560px', background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', animation: 'slideUp 0.3s ease' }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(168,85,247,0.05))', borderRadius: '20px 20px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🤖</div>
              <div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '700' }}>SN Assistant</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
                  <span style={{ color: '#4ade80', fontSize: '11px' }}>Online · Powered by Ollama</span>
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #1e1e2e', borderRadius: '8px', color: '#6b6b8a', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, marginRight: '8px', alignSelf: 'flex-end' }}>🤖</div>}
                <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg, #6c63ff, #a855f7)' : '#1a1a2e', border: msg.role === 'user' ? 'none' : '1px solid #1e1e2e', color: '#fff', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🤖</div>
                <div style={{ padding: '10px 14px', background: '#1a1a2e', borderRadius: '16px 16px 16px 4px', border: '1px solid #1e1e2e', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6c63ff', animation: `bounce 1s infinite ${i * 0.2}s` }} />)}
                </div>
              </div>
            )}
            {messages.length === 1 && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <p style={{ color: '#6b6b8a', fontSize: '11px', marginBottom: '2px' }}>SUGGESTED</p>
                {SUGGESTED.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} style={{ textAlign: 'left', padding: '8px 12px', background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '10px', color: '#8b85ff', fontSize: '12px', cursor: 'pointer', fontFamily: 'Syne, sans-serif', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.12)'; e.currentTarget.style.borderColor = '#6c63ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.2)'; }}
                  >{q}</button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #1e1e2e' }}>
            <div style={{ display: 'flex', gap: '8px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '6px 6px 6px 14px' }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="Ask about any spoke..." disabled={loading}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '13px', fontFamily: 'Syne, sans-serif', padding: '6px 0' }} />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ width: '34px', height: '34px', borderRadius: '8px', background: input.trim() && !loading ? 'linear-gradient(135deg, #6c63ff, #a855f7)' : '#1e1e2e', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>→</button>
            </div>
            <p style={{ color: '#6b6b8a', fontSize: '10px', textAlign: 'center', marginTop: '8px' }}>Powered by Ollama on Hetzner</p>
          </div>
        </div>
      )}

      <button onClick={() => setOpen(!open)} style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, width: '56px', height: '56px', borderRadius: '16px', background: open ? '#1e1e2e' : 'linear-gradient(135deg, #6c63ff, #a855f7)', border: open ? '1px solid #2e2e3e' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: open ? 'none' : '0 8px 32px rgba(108,99,255,0.4)', transition: 'all 0.3s' }}>
        {open ? '✕' : '💬'}
      </button>
    </>
  );
}
