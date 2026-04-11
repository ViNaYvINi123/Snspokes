import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function SystemPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 15000); return () => clearInterval(t); }, []);

  async function fetchData() {
    const r = await fetch('/api/admin/system', { headers: { 'x-admin-token': getAdminToken() } });
    const d = await r.json();
    if (d.success) setData(d);
    setLoading(false);
  }

  return (
    <AdminLayout title="System Monitor">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">System Monitor</h1>
          <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:'600', background: data?.status === 'ok' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: data?.status === 'ok' ? '#4ade80' : '#f87171' }}>
            {data?.status === 'ok' ? '● Live' : '● Degraded'}
          </span>
        </div>
        {loading ? <div className="text-gray-400">Loading...</div> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Uptime', value: data?.uptime || '—', icon: '⏱️' },
              { label: 'DB Status', value: data?.checks?.database?.ok ? '✅ OK' : '❌ Down', icon: '🗄️' },
              { label: 'Redis', value: data?.checks?.redis?.ok ? '✅ OK' : '⚠️ Fallback', icon: '⚡' },
              { label: 'AI (Ollama)', value: data?.checks?.ollama_ai?.ok ? '✅ OK' : '⚠️ OpenRouter', icon: '🤖' },
            ].map(s => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-white font-semibold">{s.value}</div>
                <div className="text-gray-400 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Quick Server Commands</h2>
          <div className="space-y-2">
            {[
              { label: 'View app logs', cmd: 'docker logs snspokes_nextjs -f --tail=100' },
              { label: 'Restart app', cmd: 'cd ~/snspokes && docker compose restart nextjs' },
              { label: 'Check disk', cmd: 'df -h' },
              { label: 'Check memory', cmd: 'free -h' },
              { label: 'Run backup now', cmd: './scripts/backup.sh' },
              { label: 'Run tests', cmd: 'node __tests__/run-tests.js' },
            ].map(c => (
              <div key={c.label} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                <span className="text-gray-300 text-sm">{c.label}</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-purple-300">{c.cmd}</code>
                  <button onClick={() => navigator.clipboard.writeText(c.cmd)} className="text-gray-500 hover:text-purple-400 text-xs">📋</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default withAdminPage(SystemPage);

export const getServerSideProps = async () => ({ props: {} });
