import { useState, useEffect } from 'react';

const TYPE_STYLES = {
  info:    { bg: '#0a1628', border: '#3b82f633', color: '#60a5fa', icon: 'ℹ️' },
  warning: { bg: '#1a1200', border: '#f59e0b33', color: '#fbbf24', icon: '⚠️' },
  success: { bg: '#052e16', border: '#16a34a33', color: '#4ade80', icon: '✅' },
  promo:   { bg: '#1a0a2e', border: '#a855f733', color: '#c084fc', icon: '🎉' },
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed]         = useState([]);

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem('dismissed_announcements') || '[]');
      setDismissed(d);
    } catch {}
    fetch('/api/announcements')
      .then(r => r.json())
      .then(d => setAnnouncements(d.announcements || []))
      .catch(() => {});
  }, []);

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem('dismissed_announcements', JSON.stringify(next)); } catch {}
  };

  const visible = announcements.filter(a => !dismissed.includes(a.id));
  if (!visible.length) return null;

  const ann   = visible[0];
  const style = TYPE_STYLES[ann.type] || TYPE_STYLES.info;

  return (
    <div style={{ background: style.bg, borderBottom: `1px solid ${style.border}`, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontFamily: "'DM Sans', system-ui, sans-serif", position: 'relative', zIndex: 99 }}>
      <span style={{ fontSize: '15px', flexShrink: 0 }}>{style.icon}</span>
      <span style={{ fontSize: '13px', color: style.color, fontWeight: '500', textAlign: 'center' }}>
        {ann.title && <strong style={{ marginRight: '4px' }}>{ann.title}</strong>}
        {ann.message}
      </span>
      {ann.cta_text && ann.cta_url && (
        <a href={ann.cta_url}
          style={{ padding: '3px 12px', background: style.color, color: '#000', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: '700', flexShrink: 0, opacity: 0.9 }}>
          {ann.cta_text}
        </a>
      )}
      <button onClick={() => dismiss(ann.id)}
        style={{ background: 'none', border: 'none', color: style.color, cursor: 'pointer', fontSize: '18px', opacity: 0.6, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}
