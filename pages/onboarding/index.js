import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

const STEPS = [
  { id: 'role',    title: "What's your role?",         subtitle: 'Help us personalise your experience' },
  { id: 'version', title: 'Which ServiceNow version?', subtitle: 'We show you relevant spokes and compatibility info' },
  { id: 'goals',   title: 'What do you want to do?',   subtitle: 'Select all that apply' },
];
const ROLES = [
  { id: 'developer',  label: 'Developer',       icon: '👨‍💻', desc: 'Build integrations & scripts' },
  { id: 'admin',      label: 'SN Admin',         icon: '⚙️',  desc: 'Configure & manage instances' },
  { id: 'architect',  label: 'Architect',        icon: '🏗️', desc: 'Design solutions & integrations' },
  { id: 'consultant', label: 'Consultant',       icon: '💼', desc: 'Implement for clients' },
  { id: 'student',    label: 'Student/Learning', icon: '📚', desc: 'Learning ServiceNow' },
];
const VERSIONS = ['Yokohama (2025)','Xanadu (2024)','Washington DC (2024)','Vancouver (2023)','Utah (2023)','Tokyo (2022)','San Diego (2022)','Rome (2021)'];
const GOALS = [
  { id: 'search',   label: 'Search spokes',    icon: '🔍' },
  { id: 'generate', label: 'Generate SN code', icon: '💻' },
  { id: 'debug',    label: 'Debug errors',     icon: '🐛' },
  { id: 'lint',     label: 'Lint scripts',     icon: '✅' },
  { id: 'query',    label: 'Build queries',    icon: '📊' },
  { id: 'api',      label: 'Use the API',      icon: '🔑' },
];

export default function Onboarding() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({ role: '', version: '', goals: [] });
  const [saving, setSaving]   = useState(false);

  const current  = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  function toggleGoal(id) {
    setAnswers(a => ({ ...a, goals: a.goals.includes(id) ? a.goals.filter(g => g !== id) : [...a.goals, id] }));
  }
  const canNext = () => {
    if (step === 0) return !!answers.role;
    if (step === 1) return !!answers.version;
    if (step === 2) return answers.goals.length > 0;
    return false;
  };
  async function finish() {
    setSaving(true);
    try {
      // Map field names to what API expects + strip year from version
      const payload = {
        role: answers.role,
        sn_version: (answers.version || '').split(' (')[0],  // "Yokohama (2025)" → "Yokohama"
        use_case: (answers.goals || []).join(', '),
      };
      const res = await fetch('/api/user/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      // Always update session — even if API fails, let user through
      await update({ onboarded: true });
    } catch {}
    // Always redirect — don't trap user on onboarding
    router.push('/dashboard');
  }

  const S = {
    page:   { minHeight:'100vh', background:'#0a0a0f', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:"'Syne', system-ui, sans-serif" },
    card:   { width:'100%', maxWidth:'520px', background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'20px', padding:'32px', boxShadow:'0 24px 80px rgba(0,0,0,0.4)' },
    btn:    (active) => ({ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', background: active?'rgba(108,99,255,0.12)':'transparent', border:`1px solid ${active?'#6c63ff':'#1e1e2e'}`, borderRadius:'12px', cursor:'pointer', textAlign:'left', width:'100%', transition:'all 0.15s', fontFamily:"'Syne', sans-serif", marginBottom:'8px' }),
    chip:   (active) => ({ padding:'10px 14px', background: active?'rgba(108,99,255,0.12)':'transparent', border:`1px solid ${active?'#6c63ff':'#1e1e2e'}`, borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight: active?600:400, color: active?'#fff':'#9999bb', transition:'all 0.15s', fontFamily:"'Syne', sans-serif" }),
    navBtn: (primary) => ({ flex:1, padding:'12px', background: primary?'linear-gradient(135deg,#6c63ff,#a855f7)':'transparent', border:`1px solid ${primary?'transparent':'#1e1e2e'}`, borderRadius:'10px', color: primary?'#fff':'#9999bb', fontSize:'14px', fontWeight:'600', cursor:'pointer', fontFamily:"'Syne', sans-serif" }),
  };

  return (
    <>
      <Head><title>Getting Started — snspokes</title></Head>
      {/* Minimal header with back link */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:'56px', background:'rgba(8,8,16,0.9)', backdropFilter:'blur(12px)', borderBottom:'1px solid #1e1e2e', display:'flex', alignItems:'center', padding:'0 24px', justifyContent:'space-between', zIndex:50 }}>
        <Link href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:'8px' }}>
          <img src="/logo.svg" alt="snspokes" width="28" height="28" style={{ borderRadius:'8px' }} />
          <span style={{ fontWeight:'800', color:'#e2e8f0', fontSize:'15px', letterSpacing:'-0.3px' }}>snspokes</span>
        </Link>
        <button onClick={async () => {
          try {
            await fetch('/api/user/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'developer', sn_version: 'Yokohama', use_case: 'general' }) });
            await update({ onboarded: true });
          } catch {}
          router.push('/dashboard');
        }} style={{ background:'none', border:'none', color:'#6b7280', fontSize:'12px', cursor:'pointer', fontFamily:"'Syne', sans-serif" }}>Skip for now →</button>
      </div>

      <div style={{ ...S.page, paddingTop:'80px' }}>
        <div style={{ width:'100%', maxWidth:'520px' }}>

          {/* Progress */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px' }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'8px', flex: i < STEPS.length-1 ? 1 : 'none' }}>
                <div style={{ width:'28px', height:'28px', borderRadius:'50%', background: i < step?'#6c63ff': i===step?'linear-gradient(135deg,#6c63ff,#a855f7)':'#1e1e2e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'800', color: i<=step?'#fff':'#6b7280', flexShrink:0, boxShadow: i===step?'0 0 12px rgba(108,99,255,0.4)':'none', transition:'all 0.3s' }}>
                  {i < step ? '✓' : i+1}
                </div>
                {i < STEPS.length-1 && <div style={{ flex:1, height:'2px', background: i<step?'#6c63ff':'#1e1e2e', borderRadius:'1px', transition:'background 0.3s' }} />}
              </div>
            ))}
          </div>

          <div style={S.card}>
            <h2 style={{ color:'#fff', fontSize:'22px', fontWeight:'800', marginBottom:'4px', letterSpacing:'-0.02em' }}>{current.title}</h2>
            <p style={{ color:'#6b7280', fontSize:'13px', marginBottom:'24px' }}>{current.subtitle}</p>

            {step === 0 && (
              <div>
                {ROLES.map(r => (
                  <button key={r.id} onClick={() => setAnswers(a => ({...a, role:r.id}))} style={S.btn(answers.role===r.id)}>
                    <span style={{ fontSize:'22px' }}>{r.icon}</span>
                    <div>
                      <div style={{ color:'#fff', fontSize:'14px', fontWeight:'600' }}>{r.label}</div>
                      <div style={{ color:'#6b7280', fontSize:'12px', marginTop:'1px' }}>{r.desc}</div>
                    </div>
                    {answers.role===r.id && <span style={{ marginLeft:'auto', color:'#6c63ff', fontSize:'16px' }}>✓</span>}
                  </button>
                ))}
              </div>
            )}

            {step === 1 && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {VERSIONS.map(v => (
                  <button key={v} onClick={() => setAnswers(a => ({...a, version:v}))} style={S.chip(answers.version===v)}>
                    {answers.version===v && <span style={{ color:'#6c63ff', marginRight:'4px' }}>✓</span>}
                    {v}
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {GOALS.map(g => (
                  <button key={g.id} onClick={() => toggleGoal(g.id)} style={{ ...S.chip(answers.goals.includes(g.id)), display:'flex', alignItems:'center', gap:'8px' }}>
                    <span>{g.icon}</span>{g.label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:'10px', marginTop:'24px' }}>
              {step > 0 && <button onClick={() => setStep(s => s-1)} style={S.navBtn(false)}>← Back</button>}
              {step < STEPS.length-1
                ? <button onClick={() => setStep(s => s+1)} disabled={!canNext()} style={{ ...S.navBtn(true), opacity: canNext()?1:0.4 }}>Continue →</button>
                : <button onClick={finish} disabled={!canNext()||saving} style={{ ...S.navBtn(true), opacity: (!canNext()||saving)?0.4:1 }}>
                    {saving ? 'Setting up...' : 'Go to Dashboard 🚀'}
                  </button>
              }
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
