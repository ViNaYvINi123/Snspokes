import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import UpgradeWall from '../components/UpgradeWall';
import Footer from '../components/Footer';
import axios from 'axios';
import { useSession } from 'next-auth/react';

/* ─── Typewriter placeholder ─── */
function useTypewriter(phrases, speed = 60, pause = 2000) {
  const [text, setText] = useState('');
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const phrase = phrases[idx];
    const timer = setTimeout(() => {
      if (!deleting) {
        setText(phrase.slice(0, charIdx + 1));
        if (charIdx + 1 === phrase.length) setTimeout(() => setDeleting(true), pause);
        else setCharIdx(c => c + 1);
      } else {
        setText(phrase.slice(0, charIdx));
        if (charIdx === 0) { setDeleting(false); setIdx(i => (i + 1) % phrases.length); }
        else setCharIdx(c => c - 1);
      }
    }, deleting ? 30 : speed);
    return () => clearTimeout(timer);
  }, [charIdx, deleting, idx]);
  return text;
}


/* ─── Render markdown in AI responses ─── */
function FormatMessage({ text }) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const lines = part.slice(3, -3).split('\n');
      const lang = lines[0].trim();
      const code = (lang && !lang.includes(' ') ? lines.slice(1) : lines).join('\n').trim();
      return <SearchCodeBlock key={i} code={code} lang={lang} />;
    }
    const formatted = part
      .replace(/\*\*(.*?)\*\*/g, '<b style="color:#e2e8f0">$1</b>')
      .replace(/^### (.*$)/gm, '<div style="font-size:15px;font-weight:700;color:#e2e8f0;margin:16px 0 8px">$1</div>')
      .replace(/^## (.*$)/gm, '<div style="font-size:17px;font-weight:700;color:#e2e8f0;margin:20px 0 8px">$1</div>')
      .replace(/^- (.*$)/gm, '<div style="display:flex;gap:8px;margin:4px 0;padding-left:4px"><span style="color:#6c63ff;flex-shrink:0">•</span><span>$1</span></div>')
      .replace(/`([^`]+)`/g, '<code style="background:#1a1a2e;padding:2px 7px;border-radius:5px;font-family:JetBrains Mono,monospace;font-size:12px;color:#a8b2d8">$1</code>')
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #1e1e2e;margin:16px 0"/>');
    return <div key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
  });
}

function SearchCodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ position:'relative', margin:'12px 0', borderRadius:'12px', overflow:'hidden', border:'1px solid #1e1e2e' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', background:'#111827', borderBottom:'1px solid #1e1e2e' }}>
        <span style={{ fontSize:'11px', color:'#555', textTransform:'uppercase', fontWeight:'600' }}>{lang || 'code'}</span>
        <button onClick={copy} style={{ padding:'3px 12px', background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(108,99,255,0.1)', border:'1px solid ' + (copied ? 'rgba(74,222,128,0.2)' : 'rgba(108,99,255,0.15)'), borderRadius:'6px', color: copied ? '#4ade80' : '#8b85ff', fontSize:'11px', cursor:'pointer', fontFamily:'inherit', fontWeight:'600' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin:0, padding:'14px', background:'#0a0a14', fontSize:'12px', fontFamily:"'JetBrains Mono', monospace", color:'#a8b2d8', lineHeight:'1.65', overflow:'auto', maxHeight:'300px' }}>{code}</pre>
    </div>
  );
}

function LoadingPhase({ phase }) {
  const [idx, setIdx] = useState(0);
  const msgs = ['Searching spoke database…', 'Generating AI answer…', 'Formatting results…'];
  useEffect(() => { const t = setInterval(() => setIdx(i => (i + 1) % msgs.length), 2000); return () => clearInterval(t); }, []);
  if (!phase) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '14px 18px', background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(168,85,247,0.03))', borderRadius: '12px', border: '1px solid rgba(108,99,255,0.12)' }}>
      <div style={{ width: '18px', height: '18px', border: '2px solid #2a2a3e', borderTopColor: '#6c63ff', borderRightColor: '#a855f7', borderRadius: '50%', animation: 'spin 0.75s linear infinite', flexShrink: 0 }} />
      <span style={{ color: '#8b85ff', fontSize: '13px', fontWeight: '500' }}>{msgs[idx]}</span>
    </div>
  );
}

/* ─── Shimmer skeleton ─── */
function ResultSkeleton() {
  const shimmer = { background: 'linear-gradient(90deg, #111827 25%, #1a1a2e 50%, #111827 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '8px' };
  return (
    <div style={{ padding: '24px', borderRadius: '16px', background: '#0d0d18', border: '1px solid #1a1a2e', marginBottom: '12px' }}>
      <div style={{ display: 'flex', gap: '14px' }}>
        <div style={{ ...shimmer, width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ ...shimmer, height: '18px', width: '40%', marginBottom: '10px' }} />
          <div style={{ ...shimmer, height: '14px', width: '90%', marginBottom: '6px' }} />
          <div style={{ ...shimmer, height: '14px', width: '60%' }} />
        </div>
      </div>
    </div>
  );
}

function AISkeleton() {
  const shimmer = { background: 'linear-gradient(90deg, #0f1020 25%, #171730 50%, #0f1020 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '6px' };
  return (
    <div style={{ padding: '28px', borderRadius: '20px', background: 'linear-gradient(135deg, #0d0d1a 0%, #10101f 100%)', border: '1px solid rgba(108,99,255,0.2)', marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spin" style={{ width: '16px', height: '16px', border: '2px solid rgba(108,99,255,0.3)', borderTopColor: '#6c63ff', borderRadius: '50%' }} />
        </div>
        <span style={{ color: '#6c63ff', fontSize: '13px', fontWeight: '600' }}>Generating answer...</span>
      </div>
      <div style={{ ...shimmer, height: '14px', width: '95%', marginBottom: '10px' }} />
      <div style={{ ...shimmer, height: '14px', width: '80%', marginBottom: '10px' }} />
      <div style={{ ...shimmer, height: '14px', width: '88%', marginBottom: '10px' }} />
      <div style={{ ...shimmer, height: '14px', width: '45%' }} />
    </div>
  );
}

/* ─── AI Response with animated reveal ─── */
function AIResponse({ answer, meta, onStream }) {
  const [copied, setCopied] = useState(false);
  if (!answer || answer.error) return null;
  const copyCode = (code) => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="fade-in" style={{ padding: '28px', borderRadius: '20px', background: 'linear-gradient(135deg, #0d0d1a 0%, #10101f 100%)', border: '1px solid rgba(108,99,255,0.2)', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
      {/* Glow effect */}
      <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '60%', height: '200%', background: 'radial-gradient(ellipse, rgba(108,99,255,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✨</div>
          <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '700' }}>AI Answer</span>
          {answer.confidence && (
            <span style={{ fontSize: '11px', padding: '3px 10px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '20px', color: '#4ade80', fontWeight: '600' }}>
              {Math.round(answer.confidence * 100)}% confident
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {meta?.cached && <span style={{ fontSize: '11px', padding: '3px 10px', background: 'rgba(250,204,21,0.08)', borderRadius: '20px', color: '#facc15' }}>⚡ cached</span>}
          {meta?.model && <span style={{ fontSize: '11px', padding: '3px 10px', background: 'rgba(108,99,255,0.08)', borderRadius: '20px', color: '#8b85ff' }}>{meta.model}</span>}
        </div>
      </div>

      <div style={{ color: '#c8c8e0', fontSize: '14px', lineHeight: '1.85', position: 'relative' }}><FormatMessage text={answer.answer} /></div>

      {answer.code_example && (
        <div style={{ position: 'relative', marginTop: '16px' }}>
          <button onClick={() => copyCode(answer.code_example)}
            style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 12px', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: '6px', color: '#8b85ff', fontSize: '11px', cursor: 'pointer', zIndex: 2, fontFamily: 'inherit' }}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
          <pre style={{ fontFamily: 'JetBrains Mono, monospace', background: '#080812', border: '1px solid #1a1a2e', borderRadius: '12px', padding: '18px', fontSize: '13px', overflow: 'auto', color: '#a8b2d8', lineHeight: '1.6' }}>{answer.code_example}</pre>
        </div>
      )}

      {answer.key_points?.length > 0 && (
        <div style={{ marginTop: '18px', padding: '16px', background: 'rgba(108,99,255,0.04)', borderRadius: '12px', border: '1px solid rgba(108,99,255,0.1)' }}>
          <p style={{ color: '#8b85ff', fontSize: '11px', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Key Points</p>
          {answer.key_points.map((pt, i) => (
            <div key={i} className="fade-in" style={{ display: 'flex', gap: '10px', marginBottom: '8px', animationDelay: `${i * 0.1}s` }}>
              <span style={{ color: '#6c63ff', fontSize: '8px', marginTop: '6px' }}>●</span>
              <span style={{ color: '#a0a0c0', fontSize: '13px', lineHeight: '1.6' }}>{pt}</span>
            </div>
          ))}
        </div>
      )}

      {onStream && (
        <button onClick={onStream} style={{ marginTop: '16px', padding: '8px 18px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '10px', color: '#a855f7', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>
          ⚡ Get deeper answer (stream)
        </button>
      )}
    </div>
  );
}

/* ─── Stream response ─── */
function StreamResponse({ text, streaming }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [text]);
  if (!text && !streaming) return null;
  return (
    <div className="fade-in" style={{ padding: '28px', borderRadius: '20px', background: 'linear-gradient(135deg, #0d0d1a 0%, #0f0f20 100%)', border: '1px solid rgba(168,85,247,0.25)', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-50%', right: '-20%', width: '50%', height: '200%', background: 'radial-gradient(ellipse, rgba(168,85,247,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #a855f7, #6c63ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>⚡</div>
        <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '700' }}>Live Response</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: streaming ? 'rgba(168,85,247,0.12)' : 'rgba(74,222,128,0.1)', color: streaming ? '#c084fc' : '#4ade80' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: streaming ? '#c084fc' : '#4ade80', animation: streaming ? 'pulse 1s infinite' : 'none' }} />
          {streaming ? 'Streaming...' : 'Complete'}
        </div>
      </div>
      <div style={{ color: '#c8c8e0', fontSize: '14px', lineHeight: '1.85' }}>
        <FormatMessage text={text} />
        {streaming && <span style={{ display: 'inline-block', width: '2px', height: '16px', background: '#a855f7', marginLeft: '2px', animation: 'blink 0.7s step-end infinite', verticalAlign: 'text-bottom' }} />}
        <div ref={endRef} />
      </div>
    </div>
  );
}

/* ─── Spoke result card ─── */
function SpokeCard({ spoke, index }) {
  const colors = ['#6c63ff', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];
  const accent = colors[index % colors.length];
  return (
    <Link href={`/spoke/${spoke.slug}`} style={{ textDecoration: 'none' }}>
      <div className="card-hover fade-in" style={{ padding: '22px', borderRadius: '16px', background: '#0d0d18', cursor: 'pointer', animationDelay: `${index * 0.06}s` }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${accent}15`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
            {spoke.icon || '🔌'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h3 style={{ color: '#f0f0f8', fontSize: '15px', fontWeight: '700' }}>{spoke.name}</h3>
              {spoke.category && (
                <span style={{ padding: '2px 10px', background: `${accent}12`, border: `1px solid ${accent}25`, borderRadius: '20px', fontSize: '11px', color: accent, fontWeight: '500' }}>{spoke.category}</span>
              )}
              {spoke.view_count > 0 && <span style={{ fontSize: '11px', color: '#555' }}>👁 {spoke.view_count}</span>}
            </div>
            <p style={{ color: '#8888aa', fontSize: '13px', lineHeight: '1.55', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {spoke.description}
            </p>
            {spoke.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                {spoke.tags.slice(0, 4).map(t => (
                  <span key={t} style={{ fontSize: '10px', padding: '2px 8px', background: '#111827', border: '1px solid #1e1e2e', borderRadius: '6px', color: '#6b6b8a' }}>{t}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ color: accent, fontSize: '18px', opacity: 0.5 }}>→</div>
        </div>
      </div>
    </Link>
  );
}


/* ─── Follow-up questions (Perplexity-style) ─── */
function FollowUpQuestions({ query, onSearch }) {
  const suggestions = [
    query.includes('spoke') ? 'How to set up authentication?' : 'Show me a code example',
    query.includes('error') ? 'What causes this error?' : 'Best practices for this',
    'Compare with alternatives',
  ].filter(Boolean);
  return (
    <div className="fade-in" style={{ marginTop: '16px', padding: '16px', background: 'rgba(108,99,255,0.03)', borderRadius: '14px', border: '1px solid rgba(108,99,255,0.08)' }}>
      <p style={{ color: '#555', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Follow-up questions</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {suggestions.map(q => (
          <button key={q} onClick={() => onSearch(query + ' - ' + q)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'transparent', border: '1px solid #1a1a2e', borderRadius: '10px', color: '#9999bb', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6c63ff40'; e.currentTarget.style.color = '#b0b0d0'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a2e'; e.currentTarget.style.color = '#9999bb'; }}>
            <span style={{ color: '#6c63ff', fontSize: '12px' }}>→</span> {q}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Feedback buttons ─── */
function FeedbackButtons() {
  const [vote, setVote] = useState(null);
  if (vote) return <span className="fade-in" style={{ fontSize: '12px', color: '#4ade80', padding: '4px 12px', background: 'rgba(74,222,128,0.08)', borderRadius: '20px' }}>Thanks for feedback!</span>;
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      <button onClick={() => setVote('up')} style={{ padding: '4px 10px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '8px', color: '#4ade80', fontSize: '13px', cursor: 'pointer' }} title="Helpful">👍</button>
      <button onClick={() => setVote('down')} style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', color: '#f87171', fontSize: '13px', cursor: 'pointer' }} title="Not helpful">👎</button>
    </div>
  );
}

/* ─── Related searches ─── */
function RelatedSearches({ query, onSearch }) {
  const base = query.split(' ')[0];
  const related = [
    base + ' spoke setup guide',
    base + ' authentication config',
    base + ' common errors',
    base + ' code examples GlideRecord',
    base + ' vs alternatives',
  ].filter(r => r !== query);
  return (
    <div className="fade-in" style={{ marginTop: '32px', padding: '20px', background: '#0a0a14', borderRadius: '16px', border: '1px solid #141420' }}>
      <p style={{ color: '#555', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>Related searches</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {related.map(r => (
          <button key={r} onClick={() => onSearch(r)}
            style={{ padding: '7px 14px', background: 'rgba(108,99,255,0.05)', border: '1px solid #1e1e2e', borderRadius: '20px', color: '#8888aa', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6c63ff40'; e.currentTarget.style.background = 'rgba(108,99,255,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.background = 'rgba(108,99,255,0.05)'; }}>
            🔍 {r}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*           MAIN SEARCH PAGE             */
/* ═══════════════════════════════════════ */
export default function Search() {
  const router = useRouter();
  const { q } = router.query;
  const { data: session } = useSession();
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);
  const placeholder = useTypewriter(['Search Slack spoke setup...', 'How to configure OAuth 2.0...', 'GlideRecord best practices...', 'Error: ACL restricted...', 'Integration Hub actions...'], 50, 1800);

  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState([]);
  const [aiAnswer, setAiAnswer] = useState(null);
  const [streamedText, setStreamedText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [error, setError] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const [searched, setSearched] = useState(false);
  const [meta, setMeta] = useState({});
  const [focused, setFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  // Load search history from localStorage
  useEffect(() => {
    try { setSearchHistory(JSON.parse(localStorage.getItem('sn_search_history') || '[]')); } catch {}
  }, []);

  // Save search to history
  const saveToHistory = (q) => {
    try {
      const history = JSON.parse(localStorage.getItem('sn_search_history') || '[]');
      const filtered = history.filter(h => h !== q);
      const updated = [q, ...filtered].slice(0, 10);
      localStorage.setItem('sn_search_history', JSON.stringify(updated));
      setSearchHistory(updated);
    } catch {}
  };

  // "/" shortcut to focus search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => { if (q) { setQueryText(q); doSearch(q); } }, [q]);

  const doSearch = async (searchQuery) => {
    if (!searchQuery?.trim()) return;
    saveToHistory(searchQuery.trim());
    setLoading(true); setError(''); setLoadingPhase('Searching database…'); setSearched(true);
    setResults([]); setAiAnswer(null); setStreamedText('');
    const start = Date.now();
    try {
      const res = await axios.post('/api/search', { query: searchQuery.trim(), user_id: session?.user?.id || null }, { timeout: 15000 });
      if (res.data.success) {
        setResults(res.data.results || []);
        setAiAnswer(res.data.ai_answer);
        setMeta({ cached: res.data.cached, model: res.data.model, latency: res.data.latency_ms || (Date.now() - start) });
      } else { setError(res.data.error || 'Search failed'); }
    } catch (err) {
      setError(err.response?.status === 429 ? `Rate limit — wait ${err.response.data.retry_after || 60}s` : 'Search unavailable. Please retry.');
    } finally { setLoading(false); setLoadingPhase(''); }
  };

  const doStream = async () => {
    if (!queryText.trim() || streaming) return;
    setStreaming(true); setStreamedText(''); setError(''); setAiAnswer(null);
    try {
      const res = await fetch('/api/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: queryText.trim(), user_id: session?.user?.id }) });
      if (!res.ok) { const e = await res.json(); setError(e.error || 'Stream failed'); setStreaming(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk') setStreamedText(p => p + data.content);
            if (data.type === 'done') setMeta(m => ({ ...m, model: data.model }));
            if (data.type === 'error') setError(data.message);
          } catch {}
        }
      }
    } catch { setError('Stream failed. Please retry.'); }
    finally { setStreaming(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    router.push(`/search?q=${encodeURIComponent(queryText.trim())}`, undefined, { shallow: true });
    doSearch(queryText);
  };

  const quickSearch = (term) => { setQueryText(term); router.push(`/search?q=${encodeURIComponent(term)}`); doSearch(term); };

  return (
    <>
      <Head>
        <title>{q ? `${q} — snspokes` : 'Search — snspokes'}</title>
        <meta name="description" content="AI-powered ServiceNow spoke search" />
      </Head>
      <Navbar />

      <main style={{ paddingTop: '80px', minHeight: '100vh' }}>
        {/* ─── Hero Search ─── */}
        <section className="hero-bg" style={{ padding: searched ? '32px 24px 24px' : '80px 24px 60px', transition: 'padding 0.4s ease' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            {!searched && (
              <div className="fade-in" style={{ textAlign: 'center', marginBottom: '36px' }}>
                <h1 style={{ fontSize: '36px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '10px' }}>
                  <span className="gradient-text">Search anything.</span> Get instant answers.
                </h1>
                <p style={{ color: '#6b6b8a', fontSize: '15px' }}>Spokes, scripts, errors, APIs — AI-powered answers in seconds</p>
              </div>
            )}

            {/* Search input */}
            <form onSubmit={handleSearch}>
              <div style={{
                display: 'flex', gap: '8px', padding: '6px', borderRadius: '18px',
                background: focused ? 'rgba(15,15,26,0.95)' : 'rgba(15,15,26,0.8)',
                border: `1.5px solid ${focused ? '#6c63ff' : '#1e1e2e'}`,
                boxShadow: focused ? '0 0 30px rgba(108,99,255,0.12), 0 0 80px rgba(108,99,255,0.05)' : '0 4px 30px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease', backdropFilter: 'blur(20px)',
              }}>
                <div style={{ paddingLeft: '16px', display: 'flex', alignItems: 'center' }}>
                  {loading ? (
                    <div className="spin" style={{ width: '18px', height: '18px', border: '2px solid #2a2a3e', borderTopColor: '#6c63ff', borderRadius: '50%' }} />
                  ) : (
                    <svg width="18" height="18" fill="none" stroke="#6b6b8a" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  )}
                </div>
                <input ref={inputRef} type="text" value={queryText} onChange={e => setQueryText(e.target.value)}
                  onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                  placeholder={queryText ? '' : placeholder} autoFocus
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f0f0f8', fontSize: '15px', fontFamily: 'inherit', padding: '12px 8px' }}
                />
                {queryText && (
                  <button type="button" onClick={() => { setQueryText(''); inputRef.current?.focus(); }}
                    style={{ padding: '8px', background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center' }}>✕</button>
                )}
                <button type="button" onClick={doStream} disabled={streaming || !queryText.trim()} title="Ask AI directly"
                  style={{ padding: '10px 16px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '12px', color: '#c084fc', fontSize: '12px', cursor: streaming ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', opacity: queryText.trim() ? 1 : 0.4, transition: 'opacity 0.2s', fontWeight: '600' }}>
                  ⚡ Ask AI
                </button>
                <button type="submit" disabled={loading}
                  style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #6c63ff, #a855f7)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', transition: 'transform 0.15s, opacity 0.2s', opacity: queryText.trim() ? 1 : 0.5 }}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >Search</button>
              </div>
            </form>

            {/* Quick suggestions */}
            {!searched && (
              <div className="fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '24px' }}>
                {['Slack spoke setup', 'OAuth 2.0 config', 'GlideRecord examples', 'REST message errors', 'Flow Designer tips'].map(s => (
                  <button key={s} onClick={() => quickSearch(s)}
                    style={{ padding: '7px 16px', background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: '20px', color: '#8b85ff', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.15)'; }}
                  >{s}</button>
                ))}
              </div>
            )}

            {/* Meta */}
            {meta.latency && !loading && (
              <div className="fade-in" style={{ display: 'flex', gap: '16px', marginTop: '14px', justifyContent: searched ? 'flex-start' : 'center' }}>
                <span style={{ fontSize: '11px', color: '#555' }}>⏱ {meta.latency}ms</span>
                {meta.cached && <span style={{ fontSize: '11px', color: '#4ade80' }}>⚡ cached</span>}
              </div>
            )}
          </div>
        </section>

        {/* ─── Results ─── */}
        <section style={{ padding: '28px 24px 60px' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto' }}>

            {/* Loading skeletons */}
            {loading && (
              <>
                <AISkeleton />
                <ResultSkeleton />
                <ResultSkeleton />
                <ResultSkeleton />
              </>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="fade-in" style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '14px', color: '#f87171', marginBottom: '24px', fontSize: '14px' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Stream response */}
            <StreamResponse text={streamedText} streaming={streaming} />

            {/* AI answer */}
            {!loading && <AIResponse answer={aiAnswer} meta={meta} onStream={!streamedText && queryText.trim() ? doStream : null} />}

            {/* Follow-up questions */}
            {!loading && aiAnswer && !aiAnswer.error && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <FeedbackButtons />
              </div>
            )}
            {!loading && aiAnswer && !aiAnswer.error && <FollowUpQuestions query={queryText} onSearch={quickSearch} />}

            {/* Spoke results */}
            {!loading && results.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <p style={{ color: '#6b6b8a', fontSize: '13px' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: '700' }}>{results.length}</span> spoke{results.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                {results.map((spoke, i) => <SpokeCard key={spoke.slug || i} spoke={spoke} index={i} />)}
              </>
            )}

            {/* Related searches */}
            {!loading && searched && results.length > 0 && <RelatedSearches query={queryText} onSearch={quickSearch} />}

            {/* Empty state */}
            {!loading && searched && results.length === 0 && !aiAnswer && !error && !streamedText && (
              <div className="fade-in" style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 20px' }}>🔍</div>
                <h3 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No results found</h3>
                <p style={{ color: '#6b6b8a', fontSize: '14px', marginBottom: '20px' }}>Try a different query or browse all spokes</p>
                <Link href="/spokes" style={{ padding: '10px 24px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '12px', color: '#8b85ff', fontSize: '13px', textDecoration: 'none', fontWeight: '600' }}>Browse All Spokes</Link>
              </div>
            )}

            {/* Search history */}
            {!searched && !loading && searchHistory.length > 0 && (
              <div className="fade-in" style={{ marginBottom: '20px' }}>
                <p style={{ color: '#555', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Recent searches</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {searchHistory.slice(0, 5).map(h => (
                    <button key={h} onClick={() => quickSearch(h)}
                      style={{ padding: '6px 14px', background: '#0d0d18', border: '1px solid #1a1a2e', borderRadius: '20px', color: '#8888aa', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#6c63ff40'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a2e'}>
                      🕐 {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Initial state — before any search */}
            {!searched && !loading && (
              <div className="fade-in" style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', maxWidth: '520px', margin: '0 auto' }}>
                  {[
                    { icon: '🔌', label: 'Spoke Docs', desc: 'Setup guides for 200+ spokes' },
                    { icon: '💻', label: 'Code Examples', desc: 'GlideRecord, REST, Flow Designer' },
                    { icon: '🐛', label: 'Error Fixes', desc: 'AI-powered error analysis' },
                    { icon: '⚡', label: 'AI Answers', desc: 'Instant answers to any question' },
                  ].map(c => (
                    <div key={c.label} style={{ padding: '20px 16px', borderRadius: '14px', background: '#0d0d18', border: '1px solid #1a1a2e', textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{c.icon}</div>
                      <p style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{c.label}</p>
                      <p style={{ color: '#555', fontSize: '11px' }}>{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
