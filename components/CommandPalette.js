import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';

const QUICK_ACTIONS = [
  { id: 'search', icon: '🔍', label: 'Search spokes...', action: 'search' },
  { id: 'code', icon: '💻', label: 'Code Generator', href: '/tools/code-generator' },
  { id: 'lint', icon: '✅', label: 'Script Linter', href: '/tools/script-linter' },
  { id: 'error', icon: '🐛', label: 'Error Finder', href: '/tools/error-finder' },
  { id: 'query', icon: '📊', label: 'Query Builder', href: '/tools/query-builder' },
  { id: 'matrix', icon: '🔖', label: 'Version Matrix', href: '/tools/version-matrix' },
  { id: 'snippets', icon: '📋', label: 'Snippet Library', href: '/tools/snippets' },
  { id: 'cheatsheet', icon: '📖', label: 'Cheatsheet', href: '/tools/cheatsheet' },
  { id: 'spokes', icon: '🔌', label: 'Browse All Spokes', href: '/spokes' },
  { id: 'dash', icon: '📊', label: 'Dashboard', href: '/dashboard' },
  { id: 'pricing', icon: '💳', label: 'Pricing', href: '/pricing' },
  { id: 'docs', icon: '📚', label: 'API Docs', href: '/docs/api' },
];

const POPULAR_SPOKES = [
  { slug: 'slack', name: 'Slack', icon: '💬' },
  { slug: 'jira', name: 'Jira', icon: '🔷' },
  { slug: 'microsoft-teams', name: 'Teams', icon: '🟦' },
  { slug: 'aws', name: 'AWS', icon: '☁️' },
  { slug: 'github', name: 'GitHub', icon: '🐙' },
  { slug: 'salesforce', name: 'Salesforce', icon: '☁️' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();

  // Ctrl+K / Cmd+K to open
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setQuery('');
        setSelectedIdx(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const filtered = query.trim()
    ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_ACTIONS;

  const spokeResults = query.trim().length >= 2
    ? POPULAR_SPOKES.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  const allItems = [...filtered, ...spokeResults.map(s => ({ id: `spoke-${s.slug}`, icon: s.icon, label: s.name + ' Spoke', href: `/spoke/${s.slug}` }))];

  const handleSelect = useCallback((item) => {
    setOpen(false);
    if (item.action === 'search') {
      router.push(`/search?q=${encodeURIComponent(query || '')}`);
    } else if (item.href) {
      router.push(item.href);
    }
  }, [query, router]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, allItems.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && allItems[selectedIdx]) { handleSelect(allItems[selectedIdx]); }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 9998 }} />

      {/* Palette */}
      <div className="scale-in" style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '560px', zIndex: 9999, padding: '0 16px' }}>
        <div style={{ background: '#111120', border: '1px solid #2a2a3e', borderRadius: '20px', boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 60px rgba(108,99,255,0.08)', overflow: 'hidden' }}>

          {/* Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #1e1e2e' }}>
            <svg width="18" height="18" fill="none" stroke="#6c63ff" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Search or jump to..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '15px', fontFamily: 'inherit' }}
            />
            <kbd style={{ padding: '2px 8px', background: '#1a1a2e', borderRadius: '6px', fontSize: '11px', color: '#6b6b8a', border: '1px solid #2a2a3e' }}>ESC</kbd>
          </div>

          {/* Results */}
          <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '8px' }}>
            {query.trim().length >= 2 && (
              <div onClick={() => { setOpen(false); router.push(`/search?q=${encodeURIComponent(query)}`); }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', background: selectedIdx === -1 ? 'rgba(108,99,255,0.1)' : 'transparent', marginBottom: '4px' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.1)'}
                onMouseLeave={e => { if (selectedIdx !== -1) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ fontSize: '16px' }}>🔍</span>
                <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Search "<span style={{ color: '#6c63ff', fontWeight: '600' }}>{query}</span>"</span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#555' }}>Enter ↵</span>
              </div>
            )}

            {allItems.length > 0 && (
              <p style={{ color: '#555', fontSize: '11px', padding: '8px 14px 4px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>
                {query.trim() ? 'Results' : 'Quick Actions'}
              </p>
            )}

            {allItems.map((item, i) => (
              <div key={item.id} onClick={() => handleSelect(item)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', background: i === selectedIdx ? 'rgba(108,99,255,0.1)' : 'transparent', transition: 'background 0.1s' }}
                onMouseEnter={() => setSelectedIdx(i)}>
                <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
                <span style={{ color: '#d0d0e0', fontSize: '14px' }}>{item.label}</span>
                {i === selectedIdx && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#555' }}>↵</span>}
              </div>
            ))}

            {query.trim() && allItems.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#555', fontSize: '14px' }}>
                No results — press Enter to search
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div style={{ padding: '10px 20px', borderTop: '1px solid #1a1a2e', display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', color: '#444' }}>↑↓ navigate</span>
            <span style={{ fontSize: '11px', color: '#444' }}>↵ select</span>
            <span style={{ fontSize: '11px', color: '#444' }}>esc close</span>
          </div>
        </div>
      </div>
    </>
  );
}
