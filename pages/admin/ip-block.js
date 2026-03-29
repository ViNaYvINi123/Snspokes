import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function AdminIpBlock() {
  const [blocked, setBlocked] = useState([]);
  const [suspicious, setSuspicious] = useState([]);
  const [bruteForce, setBruteForce] = useState([]);
  const [tab, setTab] = useState('blocked');
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('24');
  const headers = { 'Content-Type':'application/json', 'x-admin-token': localStorage.getItem('admin_token') || '' };

  useEffect(() => {
    fetch('/api/admin/ip-block?view=blocked', { headers }).then(r => r.json()).then(d => { if (d.success) setBlocked(d.blocked); });
    fetch('/api/admin/ip-block?view=suspicious', { headers }).then(r => r.json()).then(d => { if (d.success) { setSuspicious(d.suspicious); setBruteForce(d.brute_force); } });
  }, []);

  const blockIp = async () => {
    if (!ip.trim()) return;
    await fetch('/api/admin/ip-block', { method:'POST', headers, body: JSON.stringify({ ip: ip.trim(), reason, duration_hours: parseInt(duration) }) });
    setBlocked(prev => [{ ip_address: ip, reason, created_at: new Date(), active: true }, ...prev]);
    setIp(''); setReason('');
  };

  const unblock = async (ipAddr) => {
    await fetch('/api/admin/ip-block', { method:'DELETE', headers, body: JSON.stringify({ ip: ipAddr }) });
    setBlocked(prev => prev.filter(b => b.ip_address !== ipAddr));
  };

  const quickBlock = async (ipAddr) => {
    await fetch('/api/admin/ip-block', { method:'POST', headers, body: JSON.stringify({ ip: ipAddr, reason: 'Suspicious activity', duration_hours: 24 }) });
    setBlocked(prev => [{ ip_address: ipAddr, reason: 'Suspicious activity', created_at: new Date(), active: true }, ...prev]);
  };

  const inp = { background:'#111827', border:'1px solid #1e1e2e', borderRadius:'8px', padding:'8px 12px', color:'#e2e8f0', fontSize:'13px', fontFamily:'inherit', outline:'none' };

  return (
    <>
      <Head><title>IP Blocking — snspokes Admin</title></Head>
      <AdminLayout title="IP Blocking & Abuse Detection">
        <div style={{ padding:'24px' }}>
          <h1 style={{ fontSize:'20px', fontWeight:'800', color:'#fff', margin:'0 0 20px' }}>🛡️ IP Blocking & Abuse Detection</h1>

          {/* Manual block */}
          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', padding:'20px', marginBottom:'20px' }}>
            <h3 style={{ color:'#fff', fontSize:'14px', fontWeight:'700', margin:'0 0 12px' }}>Block an IP</h3>
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
              <input value={ip} onChange={e => setIp(e.target.value)} placeholder="IP address e.g. 192.168.1.1" style={{ ...inp, flex:1, minWidth:'200px' }} />
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason" style={{ ...inp, flex:1 }} />
              <select value={duration} onChange={e => setDuration(e.target.value)} style={inp}>
                <option value="1">1 hour</option>
                <option value="24">24 hours</option>
                <option value="168">1 week</option>
                <option value="720">30 days</option>
                <option value="0">Permanent</option>
              </select>
              <button onClick={blockIp} style={{ padding:'8px 20px', background:'#EF444422', border:'1px solid #EF444444', borderRadius:'8px', color:'#f87171', fontSize:'13px', cursor:'pointer', fontFamily:'inherit', fontWeight:'600' }}>🚫 Block</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:'6px', marginBottom:'16px' }}>
            {['blocked', 'suspicious', 'brute_force'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding:'6px 14px', background:tab===t?'#EF4444':'#1e1e2e', border:'none', borderRadius:'8px', color:tab===t?'#fff':'#9999bb', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>
                {t.replace('_',' ')} {t==='blocked'?`(${blocked.length})`:t==='brute_force'?`(${bruteForce.length})`:`(${suspicious.length})`}
              </button>
            ))}
          </div>

          <div style={{ background:'#0f0f1a', border:'1px solid #1e1e2e', borderRadius:'12px', overflow:'hidden' }}>
            {tab === 'blocked' && (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ borderBottom:'1px solid #1e1e2e', background:'#111827' }}>
                  {['IP Address','Reason','Blocked At','Expires','Action'].map(h => <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#6b7280', fontWeight:'600', fontSize:'11px', textTransform:'uppercase' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {blocked.map((b, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #1e1e2e22' }}>
                      <td style={{ padding:'10px 16px' }}><code style={{ color:'#f87171' }}>{b.ip_address}</code></td>
                      <td style={{ padding:'10px 16px', color:'#9999bb' }}>{b.reason}</td>
                      <td style={{ padding:'10px 16px', color:'#6b7280' }}>{new Date(b.created_at).toLocaleString()}</td>
                      <td style={{ padding:'10px 16px', color:'#6b7280' }}>{b.expires_at ? new Date(b.expires_at).toLocaleString() : 'Permanent'}</td>
                      <td style={{ padding:'10px 16px' }}><button onClick={() => unblock(b.ip_address)} style={{ padding:'3px 10px', background:'#4ade8022', border:'1px solid #4ade8044', borderRadius:'6px', color:'#4ade80', fontSize:'11px', cursor:'pointer' }}>Unblock</button></td>
                    </tr>
                  ))}
                  {blocked.length === 0 && <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#6b7280' }}>No blocked IPs</td></tr>}
                </tbody>
              </table>
            )}

            {tab === 'suspicious' && (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ borderBottom:'1px solid #1e1e2e', background:'#111827' }}>
                  {['IP','Total Requests','Last Hour','Unique Users','Action'].map(h => <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#6b7280', fontWeight:'600', fontSize:'11px', textTransform:'uppercase' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {suspicious.map((s, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #1e1e2e22' }}>
                      <td style={{ padding:'10px 16px' }}><code style={{ color:'#FFB347' }}>{s.user_ip}</code></td>
                      <td style={{ padding:'10px 16px', color:'#e2e8f0', fontWeight:'700' }}>{s.total_requests}</td>
                      <td style={{ padding:'10px 16px', color: parseInt(s.last_hour) > 50 ? '#f87171' : '#e2e8f0' }}>{s.last_hour}</td>
                      <td style={{ padding:'10px 16px', color:'#9999bb' }}>{s.unique_users}</td>
                      <td style={{ padding:'10px 16px' }}><button onClick={() => quickBlock(s.user_ip)} style={{ padding:'3px 10px', background:'#FF6B6B22', border:'1px solid #FF6B6B44', borderRadius:'6px', color:'#FF6B6B', fontSize:'11px', cursor:'pointer' }}>Block 24h</button></td>
                    </tr>
                  ))}
                  {suspicious.length === 0 && <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#4ade80' }}>✅ No suspicious activity</td></tr>}
                </tbody>
              </table>
            )}

            {tab === 'brute_force' && (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ borderBottom:'1px solid #1e1e2e', background:'#111827' }}>
                  {['IP','Total Attempts','Failed','Action'].map(h => <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:'#6b7280', fontWeight:'600', fontSize:'11px', textTransform:'uppercase' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {bruteForce.map((b, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #1e1e2e22' }}>
                      <td style={{ padding:'10px 16px' }}><code style={{ color:'#f87171' }}>{b.ip_address}</code></td>
                      <td style={{ padding:'10px 16px', color:'#e2e8f0' }}>{b.attempts}</td>
                      <td style={{ padding:'10px 16px', color:'#f87171', fontWeight:'700' }}>{b.failed}</td>
                      <td style={{ padding:'10px 16px' }}><button onClick={() => quickBlock(b.ip_address)} style={{ padding:'3px 10px', background:'#FF6B6B22', border:'1px solid #FF6B6B44', borderRadius:'6px', color:'#FF6B6B', fontSize:'11px', cursor:'pointer' }}>Block Now</button></td>
                    </tr>
                  ))}
                  {bruteForce.length === 0 && <tr><td colSpan={4} style={{ padding:'40px', textAlign:'center', color:'#4ade80' }}>✅ No brute force attempts</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
export default withAdminPage(AdminIpBlock);
