/**
 * Command Palette — Ctrl+K
 * Instant navigation, search, recent history, quick actions
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';

const BASE_COMMANDS = [
  { id:'search',     icon:'🔍', label:'Search anything…',    action:'focus_search', category:'quick',   hint:'↵ to open search' },
  { id:'code-gen',   icon:'💻', label:'Code Generator',      href:'/tools/code-generator', category:'tools', hint:'AI-powered scripts' },
  { id:'error',      icon:'🐛', label:'Error Finder',        href:'/tools/error-finder',   category:'tools', hint:'Paste error → get fix' },
  { id:'cheatsheet', icon:'📖', label:'Cheatsheet',          href:'/tools/cheatsheet',     category:'tools', hint:'Quick reference' },
  { id:'api-ref',    icon:'📡', label:'API Reference',       href:'/api-reference',         category:'nav',   hint:'36 APIs documented' },
  { id:'spokes',     icon:'🔌', label:'All Spokes',          href:'/spokes',               category:'nav',   hint:'200+ integrations' },
  { id:'search-pg',  icon:'⌕',  label:'Search Page',         href:'/search',               category:'nav',   hint:'Full semantic search' },
  { id:'dashboard',  icon:'📊', label:'Dashboard',           href:'/dashboard',            category:'nav',   hint:'Your activity' },
  { id:'pricing',    icon:'💳', label:'Pricing',             href:'/pricing',              category:'nav',   hint:'Free + Pro plans' },
  { id:'slack',      icon:'💬', label:'Slack Spoke',         href:'/spoke/slack',          category:'spoke', hint:'OAuth, actions, errors' },
  { id:'github',     icon:'🐙', label:'GitHub Spoke',        href:'/spoke/github',         category:'spoke', hint:'Webhook, issues, PRs' },
  { id:'jira',       icon:'🔷', label:'Jira Spoke',          href:'/spoke/jira',           category:'spoke', hint:'Tickets, transitions' },
  { id:'gliderecord',icon:'⚙️', label:'GlideRecord API',    href:'/api-reference',        category:'api',   hint:'25 methods' },
  { id:'keyboard',   icon:'⌨️', label:'Keyboard Shortcuts',  action:'keyboard',            category:'quick', hint:'Show all shortcuts' },
];

const CATEGORY_ORDER = ['quick', 'tools', 'nav', 'spoke', 'api'];
const CATEGORY_LABELS = { quick:'QUICK ACTIONS', tools:'TOOLS', nav:'NAVIGATE', spoke:'POPULAR SPOKES', api:'APIs' };

function getSession() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('sn_session') || '';
}

export default function CommandPalette({ onShowKeyboard }) {
  const router = useRouter();
  const [open, setOpen]   = useState(false);
  const [q, setQ]         = useState('');
  const [idx, setIdx]     = useState(0);
  const [recent, setRecent] = useState([]);
  const inputRef  = useRef(null);
  const listRef   = useRef(null);
  const mono = { fontFamily:"'JetBrains Mono',monospace" };

  // Load recent searches
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const s = getSession();
    if (!s) return;
    fetch(`/api/activity?action=history&session=${s}`)
      .then(r => r.json())
      .then(d => setRecent((d.history || []).slice(0, 5)))
      .catch(() => {});
  }, [open]);

  // Open/close
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); setOpen(o => !o); setQ(''); setIdx(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Build filtered list
  const recentCommands = recent.map((r, i) => ({
    id:`recent_${i}`, icon:'↺', label:r.query, action:'search_recent',
    query: r.query, category:'recent', hint:'recent search',
  }));

  const allCommands = q.trim()
    ? BASE_COMMANDS.filter(c =>
        c.label.toLowerCase().includes(q.toLowerCase()) ||
        (c.hint || '').toLowerCase().includes(q.toLowerCase())
      )
    : BASE_COMMANDS;

  const displayCommands = q.trim()
    ? allCommands
    : [...(recentCommands.length ? [{ id:'_rhead', type:'header', label:'RECENT', category:'_header' }, ...recentCommands] : []),
       ...allCommands];

  const selectable = displayCommands.filter(c => c.type !== 'header');

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i+1, selectable.length-1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i-1, 0)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = selectable[idx];
        if (cmd) execute(cmd);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, idx, selectable]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${idx}"]`);
    el?.scrollIntoView({ block:'nearest', behavior:'smooth' });
  }, [idx]);

  const execute = useCallback((cmd) => {
    setOpen(false); setQ('');
    if (cmd.action === 'focus_search') { router.push('/search'); return; }
    if (cmd.action === 'keyboard')     { onShowKeyboard?.(); return; }
    if (cmd.action === 'search_recent'){ router.push(`/search?q=${encodeURIComponent(cmd.query)}`); return; }
    if (cmd.href)                      { router.push(cmd.href); return; }
    if (q.trim())                      { router.push(`/search?q=${encodeURIComponent(q.trim())}`); }
  }, [q, router, onShowKeyboard]);

  // Group commands by category
  const grouped = {};
  displayCommands.forEach(cmd => {
    if (!grouped[cmd.category]) grouped[cmd.category] = [];
    grouped[cmd.category].push(cmd);
  });

  let globalIdx = 0;

  if (!open) return null;

  return (
    <div onClick={() => setOpen(false)}
      style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,.7)',
        backdropFilter:'blur(12px)', display:'flex', alignItems:'flex-start',
        justifyContent:'center', paddingTop:'80px', padding:'80px 16px 16px' }}>

      <style>{`
        @keyframes paletteIn { from{opacity:0;transform:scale(.96) translateY(-8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .cmd-item:hover { background:rgba(108,99,255,.08)!important; }
        .cmd-item.selected { background:rgba(108,99,255,.12)!important; border-color:rgba(108,99,255,.25)!important; }
      `}</style>

      <div onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:'600px', background:'#06060e',
          border:'1px solid rgba(255,255,255,.1)', borderRadius:'20px', overflow:'hidden',
          boxShadow:'0 32px 80px rgba(0,0,0,.8)', animation:'paletteIn .2s cubic-bezier(.22,1,.36,1)' }}>

        {/* Search input */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'14px 16px',
          borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <svg width="16" height="16" fill="none" stroke="#4b5563" strokeWidth="2.2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setIdx(0); }}
            placeholder="Search commands, spokes, APIs…"
            style={{ flex:1, background:'none', border:'none', outline:'none',
              color:'#e8eaf6', fontSize:'15px', fontFamily:"'DM Sans',sans-serif" }} />
          <kbd style={{ ...mono, fontSize:'10px', padding:'2px 7px', background:'rgba(255,255,255,.05)',
            border:'1px solid rgba(255,255,255,.1)', borderRadius:'5px', color:'#374151' }}>esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight:'440px', overflowY:'auto', padding:'6px' }}>
          {selectable.length === 0 && (
            <div style={{ padding:'32px', textAlign:'center' }}>
              <div style={{ ...mono, fontSize:'11px', color:'#374151' }}>No commands match "{q}"</div>
              <button onClick={() => execute({ action:'search_recent', query:q })}
                style={{ marginTop:'12px', ...mono, fontSize:'11px', padding:'8px 16px',
                  background:'rgba(108,99,255,.1)', border:'1px solid rgba(108,99,255,.2)',
                  borderRadius:'8px', color:'#8b85ff', cursor:'pointer' }}>
                Search for "{q}" →
              </button>
            </div>
          )}

          {Object.entries(grouped).map(([cat, cmds]) => (
            <div key={cat}>
              {cat !== '_header' && cmds.some(c => c.type !== 'header') && (
                <div style={{ ...mono, fontSize:'9px', color:'#1e1e2e', padding:'8px 10px 4px',
                  letterSpacing:'1.5px' }}>
                  {CATEGORY_LABELS[cat] || cat.toUpperCase()}
                </div>
              )}
              {cmds.map((cmd) => {
                if (cmd.type === 'header') return null;
                const myIdx = globalIdx++;
                const isSel = myIdx === idx;
                return (
                  <button key={cmd.id}
                    data-idx={myIdx}
                    className={`cmd-item${isSel?' selected':''}`}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setIdx(myIdx)}
                    style={{ display:'flex', alignItems:'center', gap:'12px', width:'100%',
                      padding:'9px 10px', background:isSel ? 'rgba(108,99,255,.12)' : 'transparent',
                      border:`1px solid ${isSel ? 'rgba(108,99,255,.25)' : 'transparent'}`,
                      borderRadius:'10px', cursor:'pointer', textAlign:'left', transition:'all .1s',
                      marginBottom:'2px' }}>
                    <span style={{ fontSize:'16px', flexShrink:0, width:'22px', textAlign:'center' }}>{cmd.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:'#e2e8f0', fontSize:'13.5px', fontFamily:"'DM Sans',sans-serif",
                        fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {cmd.label}
                      </div>
                      {cmd.hint && (
                        <div style={{ ...mono, fontSize:'9.5px', color:'#374151', marginTop:'1px' }}>{cmd.hint}</div>
                      )}
                    </div>
                    {isSel && (
                      <kbd style={{ ...mono, fontSize:'9px', padding:'1px 6px', background:'rgba(108,99,255,.15)',
                        border:'1px solid rgba(108,99,255,.25)', borderRadius:'4px', color:'#8b85ff', flexShrink:0 }}>↵</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:'8px 14px', borderTop:'1px solid rgba(255,255,255,.04)',
          display:'flex', gap:'16px', alignItems:'center' }}>
          {[['↑↓','navigate'],['↵','open'],['esc','close']].map(([k,l]) => (
            <div key={k} style={{ display:'flex', gap:'5px', alignItems:'center' }}>
              <kbd style={{ ...mono, fontSize:'9px', padding:'1px 6px', background:'rgba(255,255,255,.05)',
                border:'1px solid rgba(255,255,255,.08)', borderRadius:'4px', color:'#374151' }}>{k}</kbd>
              <span style={{ ...mono, fontSize:'9px', color:'#1e1e2e' }}>{l}</span>
            </div>
          ))}
          <div style={{ marginLeft:'auto', ...mono, fontSize:'9px', color:'#1e1e2e' }}>
            {selectable.length} commands
          </div>
        </div>
      </div>
    </div>
  );
}
