import { useState, useEffect } from 'react';
import http from '../lib/http';

function getCookieConsent() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/cookie_consent=([^;]+)/);
  if (!match) return null;
  try { return JSON.parse(atob(match[1])); } catch { return null; }
}

export default function CookieBanner() {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState({
    necessary: true,
    analytics: false,
    preferences: false,
    marketing: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = getCookieConsent();
    if (!existing) {
      setTimeout(() => setShow(true), 1500);
    }
  }, []);

  const save = async (presets = null) => {
    const data = presets || consent;
    try {
      await http.post('/api/cookies', { consent: { ...data, necessary: true } });
      setSaved(true);
      setTimeout(() => setShow(false), 1000);
    } catch {
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <div style={{ position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',zIndex:9999,width:'100%',maxWidth:'560px',padding:'0 16px',fontFamily:'DM Sans, sans-serif' }}>
        <div style={{ background:'#fff',borderRadius:'16px',boxShadow:'0 20px 60px rgba(0,0,0,0.15)',border:'1px solid #e5e7eb',overflow:'hidden',animation:'slideUp 0.3s ease' }}>

          {/* Main banner */}
          <div style={{ padding:'20px 24px' }}>
            <div style={{ display:'flex',alignItems:'flex-start',gap:'14px',marginBottom:'16px' }}>
              <span style={{ fontSize:'24px' }}>🍪</span>
              <div>
                <h3 style={{ fontSize:'15px',fontWeight:'700',color:'#111827',marginBottom:'5px' }}>We use cookies</h3>
                <p style={{ fontSize:'13px',color:'#6b7280',lineHeight:'1.5' }}>
                  We use cookies to improve your experience, analyze traffic, and personalize content.
                  You can choose which categories to allow.
                </p>
              </div>
            </div>

            {/* Detailed controls */}
            {showDetails && (
              <div style={{ marginBottom:'16px',display:'flex',flexDirection:'column',gap:'10px' }}>
                {[
                  { key:'necessary', label:'Necessary', desc:'Required for authentication and security', locked:true },
                  { key:'analytics', label:'Analytics', desc:'Help us understand site usage' },
                  { key:'preferences', label:'Preferences', desc:'Remember your settings' },
                  { key:'marketing', label:'Marketing', desc:'Personalized content' },
                ].map(cat => (
                  <div key={cat.key} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'#111827',borderRadius:'8px',border:'1px solid #1e1e2e' }}>
                    <div>
                      <div style={{ fontSize:'13px',fontWeight:'600',color:'#111827',marginBottom:'2px' }}>{cat.label}</div>
                      <div style={{ fontSize:'11px',color:'#9ca3af' }}>{cat.desc}</div>
                    </div>
                    <button onClick={() => !cat.locked && setConsent(c=>({...c,[cat.key]:!c[cat.key]}))} style={{
                      width:'36px',height:'20px',borderRadius:'10px',border:'none',cursor:cat.locked ? 'not-allowed' : 'pointer',
                      background: consent[cat.key] ? '#6c63ff' : '#d1d5db',
                      position:'relative',transition:'background 0.2s',flexShrink:0,
                    }}>
                      <div style={{ position:'absolute',top:'2px',left: consent[cat.key] ? '18px' : '2px',width:'16px',height:'16px',borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display:'flex',gap:'8px',flexWrap:'wrap' }}>
              <button onClick={() => save({ necessary:true,analytics:true,preferences:true,marketing:true })}
                style={{ flex:2,minWidth:'120px',padding:'9px',background:'#111827',border:'none',borderRadius:'8px',color:'#fff',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit' }}>
                {saved ? '✅ Saved!' : 'Accept All'}
              </button>
              <button onClick={() => save({ necessary:true,analytics:false,preferences:false,marketing:false })}
                style={{ flex:1,minWidth:'100px',padding:'9px',background:'#111827',border:'1px solid #e5e7eb',borderRadius:'8px',color:'#374151',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit' }}>
                Necessary Only
              </button>
              {showDetails ? (
                <button onClick={() => save()} style={{ flex:1,minWidth:'100px',padding:'9px',background:'#ede9fe',border:'1px solid #c4b5fd',borderRadius:'8px',color:'#6c63ff',fontSize:'13px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit' }}>
                  Save Choices
                </button>
              ) : (
                <button onClick={() => setShowDetails(true)} style={{ flex:1,minWidth:'100px',padding:'9px',background:'transparent',border:'1px solid #e5e7eb',borderRadius:'8px',color:'#6b7280',fontSize:'13px',cursor:'pointer',fontFamily:'inherit' }}>
                  Customize
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
