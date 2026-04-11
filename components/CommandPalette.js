import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

export function KeyboardHelp({ open, onClose }) {
  if (!open) return null;
  const shortcuts = [
    { keys: ['⌘', 'K'],     label: 'Command palette' },
    { keys: ['↑', '↓'],     label: 'Navigate results' },
    { keys: ['↵'],           label: 'Select / open' },
    { keys: ['⌘', 'C'],     label: 'Copy result' },
    { keys: ['⌘', 'S'],     label: 'Save to memory' },
    { keys: ['Esc'],         label: 'Close / dismiss' },
    { keys: ['?'],           label: 'Show keyboard help' },
  ];
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)' }} onClick={onClose}>
      <div style={{ background:'#0a0a14', border:'1px solid #1a1a2e', borderRadius:'14px', padding:'24px', maxWidth:'380px', width:'100%', margin:'16px' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'20px' }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#6c63ff', letterSpacing:'1.5px' }}>KEYBOARD_SHORTCUTS</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:'16px' }}>×</button>
        </div>
        {shortcuts.map((s,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #0d0d18' }}>
            <span style={{ color:'#6b7280', fontSize:'13px' }}>{s.label}</span>
            <div style={{ display:'flex', gap:'4px' }}>
              {s.keys.map((k,j)=>(
                <kbd key={j} style={{ padding:'2px 8px', background:'#111', border:'1px solid #1e1e2e', borderRadius:'5px', fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#9ca3af' }}>{k}</kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const BASE_COMMANDS = [
  { id:'search',     icon:'⌕',  label:'Search spokes...',         action:'search',  category:'actions' },
  { id:'code',       icon:'💻', label:'Code Generator',            href:'/tools/code-generator', category:'tools', tag:'code_gen' },
  { id:'error',      icon:'🐛', label:'Error Finder',              href:'/tools/error-finder',   category:'tools', tag:'err_fix' },
  { id:'cheatsheet', icon:'📖', label:'Cheatsheet',                href:'/tools/cheatsheet',     category:'tools', tag:'ref_docs' },
  { id:'spokes',     icon:'🔌', label:'Browse All Spokes',         href:'/spokes',      category:'nav' },
  { id:'search_pg',  icon:'🔍', label:'Search Page',               href:'/search',      category:'nav' },
  { id:'dashboard',  icon:'📊', label:'Dashboard',                 href:'/dashboard',   category:'nav' },
  { id:'pricing',    icon:'💳', label:'Pricing',                   href:'/pricing',     category:'nav' },
];

export default function CommandPalette() {
  const router = useRouter();
  const { data: session } = useSession();
  const [open,     setOpen]     = useState(false);
  const [q,        setQ]        = useState('');
  const [selected, setSelected] = useState(0);
  const [spokes,   setSpokes]   = useState([]);
  const [memory,   setMemory]   = useState({ history:[], saved:[] });
  const [toast,    setToast]    = useState(null);
  const inputRef = useRef(null);

  // Show toast
  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  };

  // Load memory
  const loadMemory = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const r = await fetch('/api/user/memory');
      const d = await r.json();
      if (d.success) setMemory(d);
    } catch {}
  }, [session]);

  // Open/close
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setQ(''); setSelected(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      loadMemory();
    }
  }, [open]);

  // Close on route change
  useEffect(() => { setOpen(false); }, [router.pathname]);

  // Search spokes
  useEffect(() => {
    if (!q.trim() || q.length < 2) { setSpokes([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        setSpokes((d.results||[]).slice(0,4));
      } catch {}
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  // Build items list
  const filtered = q.trim()
    ? BASE_COMMANDS.filter(c => c.label.toLowerCase().includes(q.toLowerCase()) || c.tag?.includes(q.toLowerCase()))
    : BASE_COMMANDS;

  const spokeItems = spokes.map(s => ({
    id:`spoke-${s.slug}`, icon:s.icon||'🔌', label:`${s.name} Spoke`,
    href:`/spoke/${s.slug}`, category:'spokes', spoke:s,
  }));

  const recentItems = (!q && memory.history?.length)
    ? memory.history.slice(0,3).map((h,i) => ({
        id:`hist-${i}`, icon:'🕐', label:h.query, action:'search_recent',
        query:h.query, category:'recent',
      }))
    : [];

  const savedItems = (!q && memory.saved?.length)
    ? memory.saved.slice(0,3).map(s => ({
        id:`saved-${s.id}`, icon:'⭐', label:s.name||s.query, action:'search_recent',
        query:s.query, category:'saved', savedId:s.id,
      }))
    : [];

  const allItems = [...recentItems, ...savedItems, ...filtered, ...spokeItems];

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key==='ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s+1, allItems.length-1)); }
      if (e.key==='ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s-1, 0)); }
      if (e.key==='Enter')     { e.preventDefault(); execute(allItems[selected]); }
      // ⌘C — copy selected item label
      if ((e.metaKey||e.ctrlKey) && e.key==='c' && allItems[selected]) {
        e.preventDefault();
        const item = allItems[selected];
        const text = item.spoke?.description || item.query || item.label;
        navigator.clipboard?.writeText(text).then(() => showToast('Copied to clipboard'));
      }
      // ⌘S — save to memory
      if ((e.metaKey||e.ctrlKey) && e.key==='s' && allItems[selected]) {
        e.preventDefault();
        const item = allItems[selected];
        const query = item.query || item.label;
        if (session?.user?.id) {
          fetch('/api/user/memory', { method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ action:'save_query', query, name:item.label }) })
            .then(() => { showToast('Saved to memory ⭐'); loadMemory(); })
            .catch(() => showToast('Save failed', 'error'));
        } else {
          showToast('Sign in to save searches');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, selected, allItems, session]);

  const execute = (item) => {
    if (!item) return;
    setOpen(false);
    if (item.action === 'search' || item.action === 'search_recent') {
      const query = item.query || q;
      if (query?.trim()) router.push('/search?q=' + encodeURIComponent(query.trim()));
    } else if (item.href) {
      router.push(item.href);
    }
  };

  const categoryLabel = { actions:'Actions', tools:'Tools', nav:'Navigation', spokes:'Spokes', recent:'Recent', saved:'Saved' };

  // Group items by category
  const groups = [];
  let lastCat = null;
  allItems.forEach((item, idx) => {
    if (item.category !== lastCat) {
      groups.push({ type:'label', label:categoryLabel[item.category]||item.category, idx });
      lastCat = item.category;
    }
    groups.push({ type:'item', item, idx });
  });

  if (!open) return null;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:10001, padding:'10px 18px', background:toast.type==='error'?'#2d0a0a':'#0a1a12', border:`1px solid ${toast.type==='error'?'rgba(248,113,113,.3)':'rgba(74,222,128,.3)'}`, borderRadius:'10px', color:toast.type==='error'?'#f87171':'#4ade80', fontSize:'13px', fontFamily:"'JetBrains Mono',monospace", boxShadow:'0 8px 32px rgba(0,0,0,.4)' }}>
          {toast.msg}
        </div>
      )}

      {/* Backdrop */}
      <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,.65)', backdropFilter:'blur(6px)' }} onClick={()=>setOpen(false)} />

      {/* Palette */}
      <div style={{ position:'fixed', top:'15%', left:'50%', transform:'translateX(-50%)', zIndex:9001, width:'100%', maxWidth:'600px', padding:'0 16px' }}>
        <div className='spring-in' style={{ background:'#06060e', border:'1px solid #1a1a2e', borderRadius:'16px', overflow:'hidden', boxShadow:'0 24px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(108,99,255,.1)' }}>

          {/* Input */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'14px 18px', borderBottom:'1px solid #0d0d18' }}>
            <svg width="15" height="15" fill="none" stroke="#374151" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input ref={inputRef} value={q} onChange={e=>{setQ(e.target.value);setSelected(0);}}
              placeholder="search or type a command..."
              style={{ flex:1, background:'none', border:'none', outline:'none', color:'#e8eaf6', fontSize:'15px', fontFamily:"'JetBrains Mono',monospace" }}
            />
            <div style={{ display:'flex', gap:'4px' }}>
              <kbd style={{ padding:'1px 6px', background:'#0a0a14', border:'1px solid #1a1a2e', borderRadius:'4px', fontSize:'10px', color:'#374151', fontFamily:"'JetBrains Mono',monospace" }}>esc</kbd>
            </div>
          </div>

          {/* Results */}
          <div style={{ maxHeight:'380px', overflowY:'auto', padding:'8px' }}>
            {groups.length === 0 && (
              <div style={{ padding:'28px', textAlign:'center', color:'#2a2a3a', fontFamily:"'JetBrains Mono',monospace", fontSize:'11px' }}>NO_RESULTS</div>
            )}
            {groups.map((g, gi) => g.type === 'label' ? (
              <div key={`lbl-${gi}`} style={{ padding:'6px 10px 3px', fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#1e1e2e', textTransform:'uppercase', letterSpacing:'1.5px' }}>
                {g.label}
              </div>
            ) : (
              <div key={g.item.id}
                style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 10px', borderRadius:'9px', cursor:'pointer', background:g.idx===selected?'rgba(108,99,255,.1)':'transparent', border:`1px solid ${g.idx===selected?'rgba(108,99,255,.2)':'transparent'}`, transition:'all .1s' }}
                onClick={()=>execute(g.item)}
                onMouseEnter={()=>setSelected(g.idx)}>
                <span style={{ fontSize:'16px', flexShrink:0, width:'22px', textAlign:'center' }}>{g.item.icon}</span>
                <span style={{ flex:1, color:g.idx===selected?'#e8eaf6':'#9ca3af', fontSize:'13.5px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {g.item.label}
                </span>
                {g.item.tag && (
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#6c63ff', background:'rgba(108,99,255,.08)', padding:'2px 7px', borderRadius:'4px', flexShrink:0 }}>{g.item.tag}</span>
                )}
                {g.idx===selected && (
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#374151', flexShrink:0 }}>↵ open</span>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding:'8px 16px', borderTop:'1px solid #0d0d18', display:'flex', gap:'12px', alignItems:'center' }}>
            {[['↵','open'],['⌘C','copy'],['⌘S','save']].map(([k,l])=>(
              <div key={k} style={{ display:'flex', gap:'5px', alignItems:'center' }}>
                <kbd style={{ padding:'1px 6px', background:'#0a0a14', border:'1px solid #1a1a2e', borderRadius:'4px', fontSize:'9px', color:'#374151', fontFamily:"'JetBrains Mono',monospace" }}>{k}</kbd>
                <span style={{ fontSize:'10px', color:'#1e1e2e', fontFamily:"'JetBrains Mono',monospace" }}>{l}</span>
              </div>
            ))}
            {session?.user?.id && memory.saved?.length > 0 && (
              <span style={{ marginLeft:'auto', fontSize:'10px', color:'#1e1e2e', fontFamily:"'JetBrains Mono',monospace" }}>{memory.saved.length} saved</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
