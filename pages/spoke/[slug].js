import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import http from '../../lib/http';
import { useSession } from 'next-auth/react';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ padding:'4px 12px', background: copied ? 'rgba(74,222,128,.15)' : 'rgba(108,99,255,.1)', border:`1px solid ${copied ? 'rgba(74,222,128,.3)' : 'rgba(108,99,255,.2)'}`, borderRadius:'6px', color: copied ? '#4ade80' : '#8b85ff', fontSize:'11px', cursor:'pointer', fontFamily:"'JetBrains Mono',monospace", transition:'all .15s' }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function Skeleton() {
  return (
    <div style={{ padding:'80px 24px', minHeight:'100vh', paddingTop:'120px' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ maxWidth:'1000px', margin:'0 auto' }}>
        <div style={{ width:'60px', height:'60px', borderRadius:'14px', background:'#1a1a2e', marginBottom:'16px', animation:'pulse 1.5s infinite' }} />
        <div style={{ width:'40%', height:'28px', background:'#1a1a2e', borderRadius:'6px', marginBottom:'12px', animation:'pulse 1.5s infinite' }} />
        <div style={{ width:'70%', height:'16px', background:'#1a1a2e', borderRadius:'6px', marginBottom:'40px', animation:'pulse 1.5s infinite' }} />
        {[1,2,3].map(i => <div key={i} style={{ width:'100%', height:'80px', background:'#0d0d18', borderRadius:'12px', marginBottom:'12px', animation:'pulse 1.5s infinite' }} />)}
      </div>
    </div>
  );
}

const parseJSON = (v) => { try { return typeof v === 'string' ? JSON.parse(v) : (Array.isArray(v) ? v : []); } catch { return []; } };

const TABS = [
  { id:'overview', label:'Overview', icon:'📖' },
  { id:'setup', label:'Setup Guide', icon:'⚙️' },
  { id:'actions', label:'Actions', icon:'⚡' },
  { id:'code', label:'Code & API', icon:'💻' },
  { id:'troubleshooting', label:'Troubleshooting', icon:'🔧' },
];

export default function SpokePage() {
  const router = useRouter();
  const { slug } = router.query;
  const { data: session } = useSession();
  const [spoke, setSpoke] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [bookmarked, setBookmarked] = useState(false);
  const [rating, setRating] = useState(0);

  useEffect(() => { if (slug) fetchSpoke(slug); }, [slug]);

  const fetchSpoke = async (s) => {
    setLoading(true); setError('');
    try {
      const res = await http.post('/api/spoke', { slug: s }, { timeout: 90000 });
      if (res.data?.success && res.data?.spoke) setSpoke(res.data.spoke);
      else setError('Spoke not found.');
    } catch (e) { setError(e.message || 'Failed to load'); }
    setLoading(false);
  };

  if (loading) return <><Navbar /><Skeleton /></>;
  if (error || !spoke) return (
    <><Navbar />
      <div style={{ minHeight:'100vh', paddingTop:'120px', textAlign:'center', padding:'120px 24px' }}>
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>🔌</div>
        <h2 style={{ color:'#e2e8f0', fontSize:'20px', marginBottom:'8px' }}>{error || 'Spoke not found'}</h2>
        <button onClick={() => fetchSpoke(slug)} style={{ padding:'10px 24px', background:'linear-gradient(135deg,#6c63ff,#a855f7)', border:'none', borderRadius:'8px', color:'#fff', cursor:'pointer', marginTop:'12px' }}>Try Again</button>
      </div>
    </>
  );

  const setupSteps = parseJSON(spoke.setup_steps);
  const actions = parseJSON(spoke.actions);
  const commonErrors = parseJSON(spoke.common_errors);
  const prerequisites = parseJSON(spoke.prerequisites);
  const tags = Array.isArray(spoke.tags) ? spoke.tags : [];
  const actionCount = actions.length;

  // Determine which tabs have content
  const hasSetup = setupSteps.length > 0 || prerequisites.length > 0;
  const hasActions = actionCount > 0;
  const hasCode = spoke.code_example || spoke.sample_payload || spoke.sample_response;
  const hasTrouble = commonErrors.length > 0;

  return (
    <>
      <Head>
        <title>{spoke.name} Spoke — snspokes</title>
        <meta name="description" content={`Complete reference for the ${spoke.name} Integration Hub spoke. Setup guide, actions, inputs/outputs, code examples.`} />
      </Head>
      <Navbar />
      <style>{`
        .tab-btn { padding:10px 18px; border:none; border-bottom:2px solid transparent; background:none; color:#6b7280; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .15s; display:flex; align-items:center; gap:6px; }
        .tab-btn:hover { color:#e2e8f0; }
        .tab-btn.active { color:#8b85ff; border-bottom-color:#6c63ff; }
        .info-card { padding:20px; background:#0d0d18; border:1px solid #1e1e2e; border-radius:12px; margin-bottom:14px; }
        .info-card:hover { border-color:rgba(108,99,255,.2); }
        .info-card { transition: border-color .2s; }
        @media(max-width:768px) { .spoke-grid { grid-template-columns:1fr!important; } .tab-scroll { overflow-x:auto; } }
      `}</style>

      <main style={{ paddingTop:'70px', minHeight:'100vh', background:'#040407', fontFamily:"'DM Sans',sans-serif" }}>

        {/* ══ HEADER ══ */}
        <section style={{ padding:'40px 24px 0', borderBottom:'1px solid #1e1e2e', background:'linear-gradient(180deg,rgba(108,99,255,.04) 0%,transparent 100%)' }}>
          <div style={{ maxWidth:'1000px', margin:'0 auto' }}>
            <Link href="/spokes" style={{ color:'#4b5563', textDecoration:'none', fontSize:'13px', display:'inline-flex', alignItems:'center', gap:'4px', marginBottom:'20px' }}>← All Spokes</Link>

            <div style={{ display:'flex', alignItems:'flex-start', gap:'20px', marginBottom:'24px', flexWrap:'wrap' }}>
              <div style={{ width:'64px', height:'64px', borderRadius:'14px', background:'rgba(108,99,255,.1)', border:'1px solid rgba(108,99,255,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', flexShrink:0 }}>
                {spoke.icon || '🔌'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom:'6px' }}>
                  <h1 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'28px', fontWeight:800, color:'#f0f4ff', margin:0 }}>{spoke.name}</h1>
                  {spoke.category && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#8b85ff', background:'rgba(108,99,255,.08)', border:'1px solid rgba(108,99,255,.15)', padding:'3px 10px', borderRadius:'20px' }}>{spoke.category}</span>}
                  {spoke.tier && spoke.tier !== 'professional' && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#4ade80', background:'rgba(74,222,128,.08)', border:'1px solid rgba(74,222,128,.15)', padding:'3px 10px', borderRadius:'20px' }}>{spoke.tier}</span>}
                </div>
                <p style={{ color:'#6b7280', fontSize:'15px', lineHeight:1.6, margin:'0 0 12px' }}>{spoke.description}</p>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {spoke.plugin_id && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#4b5563', background:'#0a0a14', border:'1px solid #1e1e2e', padding:'3px 10px', borderRadius:'4px' }}>{spoke.plugin_id}</span>}
                  {spoke.min_version && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#4ade80', background:'rgba(74,222,128,.06)', border:'1px solid rgba(74,222,128,.12)', padding:'3px 10px', borderRadius:'4px' }}>Since {spoke.min_version}</span>}
                  {spoke.credential_type && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#f59e0b', background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.12)', padding:'3px 10px', borderRadius:'4px' }}>{spoke.credential_type}</span>}
                  {actionCount > 0 && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#0ea5e9', background:'rgba(14,165,233,.06)', border:'1px solid rgba(14,165,233,.12)', padding:'3px 10px', borderRadius:'4px' }}>{actionCount} actions</span>}
                </div>
              </div>
            </div>

            {/* TABS */}
            <div className="tab-scroll" style={{ display:'flex', gap:'2px', borderBottom:'none' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`tab-btn ${tab === t.id ? 'active' : ''}`}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ══ CONTENT ══ */}
        <section style={{ padding:'32px 24px 60px' }}>
          <div style={{ maxWidth:'1000px', margin:'0 auto' }}>
            <div className="spoke-grid" style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:'32px' }}>

              {/* MAIN CONTENT */}
              <div>

                {/* ── OVERVIEW TAB ── */}
                {tab === 'overview' && (
                  <>
                    {spoke.official_description && (
                      <div className="info-card">
                        <h3 style={{ color:'#e2e8f0', fontSize:'15px', fontWeight:700, marginBottom:'10px' }}>📖 Overview</h3>
                        <p style={{ color:'#9ca3af', fontSize:'14px', lineHeight:1.7 }}>{spoke.official_description}</p>
                      </div>
                    )}

                    {spoke.ai_description && (
                      <div className="info-card">
                        <h3 style={{ color:'#e2e8f0', fontSize:'15px', fontWeight:700, marginBottom:'10px' }}>🤖 AI Summary</h3>
                        <p style={{ color:'#9ca3af', fontSize:'14px', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{spoke.ai_description}</p>
                      </div>
                    )}

                    {spoke.personal_tip && (
                      <div style={{ padding:'20px', background:'rgba(108,99,255,.04)', border:'1px solid rgba(108,99,255,.15)', borderRadius:'12px', marginBottom:'14px' }}>
                        <h3 style={{ color:'#8b85ff', fontSize:'14px', fontWeight:700, marginBottom:'8px' }}>💡 Pro Tip</h3>
                        <p style={{ color:'#c4c4e0', fontSize:'14px', lineHeight:1.7 }}>{spoke.personal_tip}</p>
                      </div>
                    )}

                    {/* Quick stats */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'10px', marginBottom:'14px' }}>
                      {[
                        { label:'Actions', value: actionCount, color:'#6c63ff' },
                        { label:'Setup Steps', value: setupSteps.length, color:'#4ade80' },
                        { label:'Known Errors', value: commonErrors.length, color:'#f87171' },
                        { label:'Version', value: spoke.min_version || 'N/A', color:'#f59e0b' },
                      ].map(s => (
                        <div key={s.label} style={{ padding:'16px', background:'#0d0d18', border:'1px solid #1e1e2e', borderRadius:'10px', textAlign:'center' }}>
                          <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:'24px', fontWeight:800, color:s.color }}>{s.value}</div>
                          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#4b5563', marginTop:'4px' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {tags.length > 0 && (
                      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                        {tags.map(t => <span key={t} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#6b7280', background:'rgba(255,255,255,.03)', border:'1px solid #1e1e2e', padding:'4px 12px', borderRadius:'20px' }}>{t}</span>)}
                      </div>
                    )}

                    {!spoke.official_description && !spoke.ai_description && (
                      <div className="info-card" style={{ textAlign:'center', padding:'40px' }}>
                        <p style={{ color:'#4b5563', fontSize:'14px' }}>Overview will be available after AI enrichment. Run sync from admin panel.</p>
                      </div>
                    )}
                  </>
                )}

                {/* ── SETUP TAB ── */}
                {tab === 'setup' && (
                  <>
                    {prerequisites.length > 0 && (
                      <div className="info-card" style={{ marginBottom:'20px' }}>
                        <h3 style={{ color:'#e2e8f0', fontSize:'15px', fontWeight:700, marginBottom:'12px' }}>📋 Prerequisites</h3>
                        {prerequisites.map((p, i) => (
                          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'8px 0', borderBottom: i < prerequisites.length-1 ? '1px solid #1a1a2e' : 'none' }}>
                            <span style={{ color:'#4ade80', fontSize:'14px', flexShrink:0 }}>✓</span>
                            <span style={{ color:'#9ca3af', fontSize:'14px', lineHeight:1.5 }}>{typeof p === 'string' ? p : p.name || JSON.stringify(p)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {setupSteps.length > 0 ? (
                      <div>
                        <h3 style={{ color:'#e2e8f0', fontSize:'16px', fontWeight:700, marginBottom:'16px' }}>⚙️ Step-by-Step Setup</h3>
                        {setupSteps.map((step, i) => (
                          <div key={i} style={{ display:'flex', gap:'16px', padding:'18px', background:'#0d0d18', border:'1px solid #1e1e2e', borderRadius:'12px', marginBottom:'10px' }}>
                            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(108,99,255,.15)', border:'1px solid rgba(108,99,255,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, color:'#8b85ff', flexShrink:0 }}>{i+1}</div>
                            <div style={{ flex:1 }}>
                              <p style={{ color:'#e2e8f0', fontSize:'14px', lineHeight:1.6 }}>{typeof step === 'string' ? step : step.title || JSON.stringify(step)}</p>
                              {step.detail && <p style={{ color:'#6b7280', fontSize:'13px', marginTop:'6px', lineHeight:1.5 }}>{step.detail}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="info-card" style={{ textAlign:'center', padding:'40px' }}>
                        <p style={{ color:'#4b5563' }}>Setup guide will be generated during next sync.</p>
                      </div>
                    )}
                  </>
                )}

                {/* ── ACTIONS TAB ── */}
                {tab === 'actions' && (
                  <>
                    {actions.length > 0 ? actions.map((action, i) => {
                      const name = typeof action === 'string' ? action : action.name;
                      const desc = typeof action === 'object' ? action.description : null;
                      const inputs = typeof action === 'object' && Array.isArray(action.inputs) ? action.inputs : [];
                      const outputs = typeof action === 'object' && Array.isArray(action.outputs) ? action.outputs : [];

                      return (
                        <div key={i} className="info-card">
                          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom: desc || inputs.length ? '12px' : 0 }}>
                            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'#8b85ff', background:'rgba(108,99,255,.1)', border:'1px solid rgba(108,99,255,.2)', padding:'2px 8px', borderRadius:'4px' }}>ACTION</span>
                            <span style={{ color:'#e2e8f0', fontSize:'15px', fontWeight:600 }}>{name}</span>
                          </div>
                          {desc && <p style={{ color:'#6b7280', fontSize:'13px', lineHeight:1.5, marginBottom:'14px' }}>{desc}</p>}

                          {inputs.length > 0 && (
                            <div style={{ marginBottom:'14px' }}>
                              <h4 style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#4ade80', letterSpacing:'1px', marginBottom:'8px' }}>INPUTS</h4>
                              <div style={{ border:'1px solid #1e1e2e', borderRadius:'8px', overflow:'hidden' }}>
                                <div style={{ display:'grid', gridTemplateColumns:'140px 80px 60px 1fr', gap:0, background:'#0a0a14', padding:'6px 12px', borderBottom:'1px solid #1e1e2e' }}>
                                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#4b5563' }}>NAME</span>
                                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#4b5563' }}>TYPE</span>
                                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#4b5563' }}>REQ</span>
                                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#4b5563' }}>DESCRIPTION</span>
                                </div>
                                {inputs.map((inp, j) => (
                                  <div key={j} style={{ display:'grid', gridTemplateColumns:'140px 80px 60px 1fr', gap:0, padding:'8px 12px', borderBottom: j < inputs.length-1 ? '1px solid #111' : 'none' }}>
                                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', color:'#e2e8f0' }}>{inp.name}</span>
                                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#f59e0b' }}>{inp.type}</span>
                                    <span style={{ fontSize:'11px', color: inp.required ? '#f87171' : '#4b5563' }}>{inp.required ? 'Yes' : 'No'}</span>
                                    <span style={{ fontSize:'12px', color:'#6b7280' }}>{inp.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {outputs.length > 0 && (
                            <div>
                              <h4 style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#0ea5e9', letterSpacing:'1px', marginBottom:'8px' }}>OUTPUTS</h4>
                              <div style={{ border:'1px solid #1e1e2e', borderRadius:'8px', overflow:'hidden' }}>
                                {outputs.map((out, j) => (
                                  <div key={j} style={{ display:'grid', gridTemplateColumns:'140px 80px 1fr', gap:0, padding:'8px 12px', borderBottom: j < outputs.length-1 ? '1px solid #111' : 'none' }}>
                                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', color:'#e2e8f0' }}>{out.name}</span>
                                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'#0ea5e9' }}>{out.type}</span>
                                    <span style={{ fontSize:'12px', color:'#6b7280' }}>{out.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }) : (
                      <div className="info-card" style={{ textAlign:'center', padding:'40px' }}>
                        <p style={{ color:'#4b5563' }}>No actions documented yet.</p>
                      </div>
                    )}
                  </>
                )}

                {/* ── CODE TAB ── */}
                {tab === 'code' && (
                  <>
                    {spoke.code_example && (
                      <div className="info-card">
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                          <h3 style={{ color:'#e2e8f0', fontSize:'15px', fontWeight:700 }}>💻 Code Example</h3>
                          <CopyBtn text={spoke.code_example} />
                        </div>
                        <pre style={{ fontFamily:"'JetBrains Mono',monospace", background:'#020208', border:'1px solid rgba(255,255,255,.06)', borderRadius:'8px', padding:'16px', fontSize:'12px', color:'#7dd3fc', lineHeight:1.7, overflow:'auto', margin:0 }}>{spoke.code_example}</pre>
                      </div>
                    )}

                    {spoke.sample_payload && (
                      <div className="info-card">
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                          <h3 style={{ color:'#e2e8f0', fontSize:'15px', fontWeight:700 }}>📤 Sample Request Payload</h3>
                          <CopyBtn text={spoke.sample_payload} />
                        </div>
                        <pre style={{ fontFamily:"'JetBrains Mono',monospace", background:'#020208', border:'1px solid rgba(255,255,255,.06)', borderRadius:'8px', padding:'16px', fontSize:'12px', color:'#a8b2d8', lineHeight:1.7, overflow:'auto', margin:0 }}>{spoke.sample_payload}</pre>
                      </div>
                    )}

                    {spoke.sample_response && (
                      <div className="info-card">
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                          <h3 style={{ color:'#e2e8f0', fontSize:'15px', fontWeight:700 }}>📥 Sample Response</h3>
                          <CopyBtn text={spoke.sample_response} />
                        </div>
                        <pre style={{ fontFamily:"'JetBrains Mono',monospace", background:'#020208', border:'1px solid rgba(255,255,255,.06)', borderRadius:'8px', padding:'16px', fontSize:'12px', color:'#4ade80', lineHeight:1.7, overflow:'auto', margin:0 }}>{spoke.sample_response}</pre>
                      </div>
                    )}

                    {!spoke.code_example && !spoke.sample_payload && (
                      <div className="info-card" style={{ textAlign:'center', padding:'40px' }}>
                        <p style={{ color:'#4b5563' }}>Code examples will be generated during AI enrichment sync.</p>
                      </div>
                    )}
                  </>
                )}

                {/* ── TROUBLESHOOTING TAB ── */}
                {tab === 'troubleshooting' && (
                  <>
                    {commonErrors.length > 0 ? commonErrors.map((err, i) => {
                      const errText = typeof err === 'string' ? err : err.error;
                      const fixText = typeof err === 'object' ? err.fix : null;
                      return (
                        <div key={i} style={{ padding:'18px', background:'rgba(239,68,68,.03)', border:'1px solid rgba(239,68,68,.12)', borderRadius:'12px', marginBottom:'10px' }}>
                          <div style={{ display:'flex', alignItems:'flex-start', gap:'10px', marginBottom: fixText ? '10px' : 0 }}>
                            <span style={{ color:'#f87171', fontSize:'14px', flexShrink:0 }}>⚠️</span>
                            <span style={{ color:'#f87171', fontSize:'14px', fontWeight:600 }}>{errText}</span>
                          </div>
                          {fixText && (
                            <div style={{ display:'flex', alignItems:'flex-start', gap:'10px', paddingLeft:'24px' }}>
                              <span style={{ color:'#4ade80', fontSize:'14px', flexShrink:0 }}>✅</span>
                              <span style={{ color:'#9ca3af', fontSize:'13px', lineHeight:1.6 }}>{fixText}</span>
                            </div>
                          )}
                        </div>
                      );
                    }) : (
                      <div className="info-card" style={{ textAlign:'center', padding:'40px' }}>
                        <p style={{ color:'#4b5563' }}>No known errors documented for this spoke.</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* SIDEBAR */}
              <div>
                <div style={{ position:'sticky', top:'80px' }}>
                  <div style={{ padding:'18px', background:'#0d0d18', border:'1px solid #1e1e2e', borderRadius:'14px', marginBottom:'14px' }}>
                    <h3 style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#4b5563', letterSpacing:'1.5px', marginBottom:'14px' }}>SPOKE INFO</h3>
                    {[
                      { label:'Plugin ID', value: spoke.plugin_id },
                      { label:'Auth Type', value: spoke.credential_type },
                      { label:'Category', value: spoke.category },
                      { label:'Min Version', value: spoke.min_version },
                      { label:'Tier', value: spoke.tier },
                    ].filter(a => a.value).map(a => (
                      <div key={a.label} style={{ marginBottom:'12px', paddingBottom:'12px', borderBottom:'1px solid #111' }}>
                        <div style={{ fontSize:'10px', color:'#4b5563', marginBottom:'3px', textTransform:'uppercase', letterSpacing:'.5px' }}>{a.label}</div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', color:'#c4c4e0' }}>{a.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Quick nav */}
                  <div style={{ padding:'18px', background:'#0d0d18', border:'1px solid #1e1e2e', borderRadius:'14px', marginBottom:'14px' }}>
                    <h3 style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color:'#4b5563', letterSpacing:'1.5px', marginBottom:'12px' }}>QUICK NAV</h3>
                    {TABS.map(t => (
                      <button key={t.id} onClick={() => setTab(t.id)}
                        style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 10px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'13px', marginBottom:'2px', transition:'all .1s', fontFamily:"'DM Sans',sans-serif",
                          background: tab === t.id ? 'rgba(108,99,255,.1)' : 'transparent',
                          color: tab === t.id ? '#8b85ff' : '#6b7280',
                        }}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>

                  <a href="https://docs.servicenow.com" target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'12px', background:'rgba(108,99,255,.06)', border:'1px solid rgba(108,99,255,.15)', borderRadius:'10px', color:'#8b85ff', fontSize:'13px', textDecoration:'none', transition:'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(108,99,255,.12)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(108,99,255,.06)'}>
                    📄 ServiceNow Docs ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
