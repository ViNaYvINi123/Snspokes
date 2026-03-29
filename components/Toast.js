import { useState, useCallback, useEffect } from 'react';

const ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
const COLORS = {
  success: { bg: '#052e16', border: '#16a34a44', text: '#4ade80' },
  error:   { bg: '#2d0a0a', border: '#dc262644', text: '#f87171' },
  warning: { bg: '#1f1400', border: '#d9770644', text: '#fbbf24' },
  info:    { bg: '#0c1a2e', border: '#3b82f644', text: '#60a5fa' },
};

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}

export function ToastContainer({ toasts, dismiss }) {
  return (
    <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', pointerEvents: 'none' }}>
      {toasts.map(t => {
        const c = COLORS[t.type] || COLORS.info;
        return (
          <div key={t.id}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px', color: c.text, fontSize: '13px', fontWeight: '500', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', pointerEvents: 'all', cursor: 'pointer', maxWidth: '400px', backdropFilter: 'blur(12px)' }}
            onClick={() => dismiss(t.id)}>
            <span>{ICONS[t.type]}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <span style={{ opacity: 0.5, fontSize: '16px', lineHeight: 1 }}>×</span>
          </div>
        );
      })}
    </div>
  );
}
