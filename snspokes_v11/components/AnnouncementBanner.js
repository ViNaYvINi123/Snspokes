import { useState, useEffect } from 'react';
import axios from 'axios';

const TYPE_STYLES = {
  info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', icon: 'ℹ️' },
  warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '⚠️' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', icon: '✅' },
  promo:   { bg: '#faf5ff', border: '#e9d5ff', color: '#7c3aed', icon: '🎉' },
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    // Check localStorage for dismissed IDs
    try {
      const d = JSON.parse(localStorage.getItem('dismissed_announcements') || '[]');
      setDismissed(d);
    } catch {}

    axios.get('/api/announcements').then(r => {
      setAnnouncements(r.data.announcements || []);
    }).catch(() => {});
  }, []);

  const dismiss = (id) => {
    const newDismissed = [...dismissed, id];
    setDismissed(newDismissed);
    try { localStorage.setItem('dismissed_announcements', JSON.stringify(newDismissed)); } catch {}
  };

  const visible = announcements.filter(a => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const ann = visible[0]; // Show first active announcement
  const style = TYPE_STYLES[ann.type] || TYPE_STYLES.info;

  return (
    <div style={{ background: style.bg, borderBottom: `1px solid ${style.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <span>{style.icon}</span>
      <span style={{ fontSize: '13px', color: style.color, fontWeight: '500' }}>
        <strong>{ann.title}</strong>{ann.message ? ` — ${ann.message}` : ''}
      </span>
      {ann.cta_text && ann.cta_url && (
        <a href={ann.cta_url} style={{ padding: '3px 12px', background: style.color, color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
          {ann.cta_text}
        </a>
      )}
      <button onClick={() => dismiss(ann.id)} style={{ background: 'none', border: 'none', color: style.color, cursor: 'pointer', fontSize: '16px', opacity: 0.6, flexShrink: 0, padding: '0 4px' }}>×</button>
    </div>
  );
}
