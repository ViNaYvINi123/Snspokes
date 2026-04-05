import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const SUGGESTED = [
  { icon: '🔌', text: 'How do I setup the Slack spoke?' },
  { icon: '💻', text: 'Write a Business Rule for auto-assignment' },
  { icon: '🐛', text: 'Fix: ACL restricts access to this record' },
  { icon: '📊', text: 'Build an encoded query for active incidents' },
  { icon: '🌐', text: 'How does OAuth 2.0 work in ServiceNow?' },
  { icon: '⚡', text: 'Compare Flow Designer vs Workflow Editor' },
];

/* ─── Format AI response: detect code blocks and render them ─── */
function FormatMessage({ text }) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const lines = part.slice(3, -3).split('\n');
      const lang = lines[0].trim();
      const code = (lang && !lang.includes(' ') ? lines.slice(1) : lines).join('\n').trim();
      return <CodeBlock key={i} code={code} lang={lang} />;
    }
    // Format markdown-lite: **bold**, headers, bullet points
    const formatted = part
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/^### (.*$)/gm, '<div style="font-size:14px;font-weight:700;color:#e2e8f0;margin:12px 0 6px">$1</div>')
      .replace(/^## (.*$)/gm, '<div style="font-size:15px;font-weight:700;color:#e2e8f0;margin:14px 0 6px">$1</div>')
      .replace(/^- (.*$)/gm, '<div style="display:flex;gap:8px;margin:3px 0"><span style="color:#6c63ff;flex-shrink:0">•</span><span>$1</span></div>')
      .replace(/^\d+\. (.*$)/gm, '<div style="display:flex;gap:8px;margin:3px 0"><span style="color:#6c63ff;flex-shrink:0;font-weight:600">$&</span></div>')
      .replace(/`([^`]+)`/g, '<code style="background:#1a1a2e;padding:1px 6px;border-radius:4px;font-family:JetBrains Mono,monospace;font-size:12px;color:#a8b2d8">$1</code>');
    return <div key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
  });
}

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ position: 'relative', margin: '10px 0', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1e1e2e' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: '#111827', borderBottom: '1px solid #1e1e2e' }}>
        <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>{lang || 'code'}</span>
        <button onClick={copy} style={{ padding: '2px 10px', background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(108,99,255,0.1)', border: 'none', borderRadius: '4px', color: copied ? '#4ade80' : '#8b85ff', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '12px', background: '#0a0a14', fontSize: '11.5px', fontFamily: "'JetBrains Mono', monospace", color: '#a8b2d8', lineHeight: '1.6', overflow: 'auto', maxHeight: '200px' }}>{code}</pre>
    </div>
  );
}

/* ─── Typing dots animation ─── */
function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✨</div>
      <div style={{ padding: '12px 16px', background: '#1a1a2e', borderRadius: '14px 14px 14px 4px', border: '1px solid #1e1e2e', display: 'flex', gap: '5px', alignItems: 'center' }}>
        <span style={{ color: '#6c63ff', fontSize: '12px', marginRight: '4px' }}>Thinking</span>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6c63ff', animation: `bounce 1.2s infinite ${i * 0.15}s`, opacity: 0.7 }} />
        ))}
      </div>
    </div>
  );
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hey! 👋 I'm your AI dev assistant. Ask me anything — ServiceNow, coding, debugging, or any tech question. I search docs and community knowledge to give you the best answer." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnread(0); setTimeout(() => inputRef.current?.focus(), 100); }
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
        history: messages.slice(-8).map(m => ({ role: m.role, content: m.text }))
      }, { timeout: 120000 });
      const answer = res.data?.answer || 'Sorry, no response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', text: answer, model: res.data?.model, latency: res.data?.latency_ms, cached: res.data?.cached }]);
      if (!open) setUnread(u => u + 1);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ AI service is temporarily unavailable. Please try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', text: "Chat cleared! 🧹 What would you like to know?" }]);
  };

  return (
    <>
      <style>{`
        @keyframes bounce { 0%,80%,100% { transform: translateY(0) } 40% { transform: translateY(-6px) } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
        @keyframes pulse2 { 0%,100%{box-shadow:0 0 0 0 rgba(108,99,255,0.4)} 50%{box-shadow:0 0 0 12px rgba(108,99,255,0)} }
      `}</style>

      {open && (
        <div style={{ position: 'fixed', bottom: '90px', right: '24px', zIndex: 1000, width: '400px', maxWidth: 'calc(100vw - 48px)', maxHeight: '70vh', background: '#0c0c18', border: '1px solid #1e1e2e', borderRadius: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(108,99,255,0.06)', animation: 'slideUp 0.25s ease' }}>

          {/* Header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(168,85,247,0.04))', borderRadius: '20px 20px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>✨</div>
              <div>
                <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '700' }}>AI Assistant</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                  <span style={{ color: '#4ade80', fontSize: '10px' }}>Online</span>
                  <span style={{ color: '#444', fontSize: '10px' }}>· ServiceNow + General</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={clearChat} title="Clear chat" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e2e', borderRadius: '8px', color: '#555', width: '30px', height: '30px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
              <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e1e2e', borderRadius: '8px', color: '#555', width: '30px', height: '30px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '200px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', animation: 'slideUp 0.2s ease' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0, alignSelf: 'flex-end' }}>✨</div>
                )}
                <div style={{ maxWidth: '82%' }}>
                  <div style={{
                    padding: msg.role === 'user' ? '10px 14px' : '12px 16px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #6c63ff, #a855f7)' : '#141420',
                    border: msg.role === 'user' ? 'none' : '1px solid #1e1e2e',
                    color: '#e0e0f0', fontSize: '13px', lineHeight: '1.7',
                  }}>
                    {msg.role === 'assistant' ? <FormatMessage text={msg.text} /> : msg.text}
                  </div>
                  {msg.role === 'assistant' && (msg.model || msg.cached) && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', paddingLeft: '4px' }}>
                      {msg.cached && <span style={{ fontSize: '10px', color: '#4ade80' }}>⚡ cached</span>}
                      {msg.model && <span style={{ fontSize: '10px', color: '#444' }}>{msg.model}</span>}
                      {msg.latency && <span style={{ fontSize: '10px', color: '#444' }}>{msg.latency}ms</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && <TypingDots />}

            {/* Suggested questions — only show at start */}
            {messages.length <= 1 && !loading && (
              <div style={{ marginTop: '4px' }}>
                <p style={{ color: '#444', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>Try asking</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {SUGGESTED.map(q => (
                    <button key={q.text} onClick={() => sendMessage(q.text)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left', padding: '9px 12px', background: 'rgba(108,99,255,0.04)', border: '1px solid #1a1a2e', borderRadius: '10px', color: '#8888aa', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.1)'; e.currentTarget.style.borderColor = '#6c63ff30'; e.currentTarget.style.color = '#b0b0d0'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.04)'; e.currentTarget.style.borderColor = '#1a1a2e'; e.currentTarget.style.color = '#8888aa'; }}>
                      <span>{q.icon}</span> {q.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid #1e1e2e' }}>
            <div style={{ display: 'flex', gap: '8px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '14px', padding: '5px 5px 5px 14px', transition: 'border-color 0.2s' }}
              onFocusCapture={e => e.currentTarget.style.borderColor = '#6c63ff40'}
              onBlurCapture={e => e.currentTarget.style.borderColor = '#1e1e2e'}>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask anything..."
                disabled={loading}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '13px', fontFamily: 'inherit', padding: '8px 0' }} />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                style={{ width: '36px', height: '36px', borderRadius: '10px', background: input.trim() && !loading ? 'linear-gradient(135deg, #6c63ff, #a855f7)' : '#1a1a2e', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
            <p style={{ color: '#333', fontSize: '10px', textAlign: 'center', marginTop: '8px' }}>
              AI-powered · ServiceNow docs + community + general knowledge
            </p>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button onClick={() => { setOpen(!open); setUnread(0); }}
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, width: '56px', height: '56px', borderRadius: '16px', background: open ? '#1e1e2e' : 'linear-gradient(135deg, #6c63ff, #a855f7)', border: open ? '1px solid #2e2e3e' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: open ? 'none' : '0 8px 32px rgba(108,99,255,0.35)', transition: 'all 0.3s', animation: !open && unread === 0 ? 'none' : 'none' }}>
        {open ? '✕' : '💬'}
        {!open && unread > 0 && (
          <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</div>
        )}
      </button>
    </>
  );
}
