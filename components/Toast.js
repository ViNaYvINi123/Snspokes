import { useState, useEffect, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warn: (msg) => addToast(msg, 'warn'),
  };

  const COLORS = {
    success: { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)', text: '#4ade80', icon: '✓' },
    error:   { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', text: '#f87171', icon: '✕' },
    info:    { bg: 'rgba(108,99,255,0.12)', border: 'rgba(108,99,255,0.25)', text: '#8b85ff', icon: 'ℹ' },
    warn:    { bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.25)', text: '#facc15', icon: '⚠' },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
        {toasts.map(t => {
          const c = COLORS[t.type] || COLORS.info;
          return (
            <div key={t.id} style={{ padding: '12px 18px', background: c.bg, border: '1px solid ' + c.border, borderRadius: '12px', color: c.text, fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'slideIn 0.25s ease', pointerEvents: 'auto', minWidth: '200px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>{c.icon}</span>
              {t.message}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(40px) } to { opacity:1; transform:none } }`}</style>
    </ToastContext.Provider>
  );
}
