import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export default function ChatbotSessions() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({});
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [view, setView] = useState('live');
  const [loading, setLoading] = useState(true);
  const h = { 'x-admin-token': typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '' };

  const fetchSessions = () => {
    fetch(`/api/admin/chatbot-sessions?view=${view}`, { headers: h })
      .then(r => r.json()).then(d => { if (d.success) setSessions(d.sessions || []); }).catch(() => {}).finally(() => setLoading(false));
  };

  const fetchStats = () => {
    fetch('/api/admin/chatbot-sessions?view=stats', { headers: h })
      .then(r => r.json()).then(d => { if (d.success) setStats(d.stats || {}); }).catch(() => {});
  };

  const fetchMessages = (sid) => {
    setSelected(sid);
    fetch(`/api/admin/chatbot-sessions?view=messages&session_id=${sid}`, { headers: h })
      .then(r => r.json()).then(d => { if (d.success) setMessages(d.messages || []); }).catch(() => {});
  };

  useEffect(() => { fetchSessions(); fetchStats(); }, [view]);

  // Auto-refresh every 5s for live view
  useEffect(() => {
    if (view !== 'live') return;
    const t = setInterval(() => { fetchSessions(); fetchStats(); }, 5000);
    return () => clearInterval(t);
  }, [view]);

  const deleteSession = (sid) => {
    if (!confirm('Delete this session and all messages?')) return;
    fetch(`/api/admin/chatbot-sessions?session_id=${sid}`, { method: 'DELETE', headers: h })
      .then(r => r.json()).then(d => { if (d.success) { fetchSessions(); setSelected(null); } }).catch(() => {});
  };

  const s = {
    card: { padding: '16px 20px', background: '#111827', borderRadius: '12px', border: '1px solid #1e1e2e' },
    stat: { fontSize: '28px', fontWeight: '800', color: '#fff' },
    statLabel: { fontSize: '12px', color: '#6b7280', marginTop: '4px' },
    tab: (active) => ({ padding: '8px 18px', background: active ? 'rgba(108,99,255,0.15)' : 'transparent', border: '1px solid ' + (active ? '#6c63ff40' : '#1e1e2e'), borderRadius: '8px', color: active ? '#8b85ff' : '#6b7280', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? '600' : '400' }),
    row: (active) => ({ padding: '14px 16px', background: active ? 'rgba(108,99,255,0.08)' : '#0f0f1a', borderRadius: '10px', border: '1px solid ' + (active ? '#6c63ff30' : '#1a1a2e'), cursor: 'pointer', marginBottom: '8px', transition: 'all 0.15s' }),
    badge: (status) => ({ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: '600', background: status === 'active' ? 'rgba(74,222,128,0.1)' : status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(108,99,255,0.1)', color: status === 'active' ? '#4ade80' : status === 'error' ? '#f87171' : '#8b85ff', border: '1px solid ' + (status === 'active' ? 'rgba(74,222,128,0.2)' : status === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(108,99,255,0.2)') }),
    msg: (role) => ({ padding: '12px 16px', borderRadius: '12px', marginBottom: '8px', maxWidth: '85%', alignSelf: role === 'user' ? 'flex-end' : 'flex-start', background: role === 'user' ? 'rgba(108,99,255,0.12)' : '#111827', border: '1px solid ' + (role === 'user' ? 'rgba(108,99,255,0.2)' : '#1e1e2e'), color: '#c8c8e0', fontSize: '13px', lineHeight: '1.6' }),
  };

  const timeAgo = (d) => {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return Math.floor(diff) + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  };

  return (
    <AdminLayout title="💬 Live Chatbot Sessions">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={s.card}>
          <div style={{ ...s.stat, color: '#4ade80' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', marginRight: '8px', animation: 'pulse 2s infinite' }} />
            {stats.active_now || 0}
          </div>
          <div style={s.statLabel}>Active Now</div>
        </div>
        <div style={s.card}>
          <div style={s.stat}>{stats.today_sessions || 0}</div>
          <div style={s.statLabel}>Today</div>
        </div>
        <div style={s.card}>
          <div style={s.stat}>{stats.total_sessions || 0}</div>
          <div style={s.statLabel}>Total Sessions</div>
        </div>
        <div style={s.card}>
          <div style={s.stat}>{stats.avg_messages || 0}</div>
          <div style={s.statLabel}>Avg Messages</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['live', '🟢 Live'], ['all', '📋 All Sessions']].map(([v, label]) => (
          <button key={v} onClick={() => setView(v)} style={s.tab(view === v)}>{label}</button>
        ))}
        {view === 'live' && <span style={{ fontSize: '12px', color: '#555', alignSelf: 'center', marginLeft: '8px' }}>Auto-refreshes every 5s</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '16px' }}>
        {/* Sessions list */}
        <div>
          {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>Loading...</div>}
          {!loading && sessions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#555' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
              <p>{view === 'live' ? 'No active sessions right now' : 'No sessions yet'}</p>
            </div>
          )}
          {sessions.map(sess => (
            <div key={sess.session_id} onClick={() => fetchMessages(sess.session_id)}
              style={s.row(selected === sess.session_id)}
              onMouseEnter={e => { if (selected !== sess.session_id) e.currentTarget.style.borderColor = '#6c63ff20'; }}
              onMouseLeave={e => { if (selected !== sess.session_id) e.currentTarget.style.borderColor = '#1a1a2e'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={s.badge(sess.status)}>{sess.status}</span>
                  <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '600' }}>
                    {sess.user_name || sess.user_email?.split('@')[0] || 'Anonymous'}
                  </span>
                  {sess.user_plan && sess.user_plan !== 'free' && (
                    <span style={{ fontSize: '10px', padding: '1px 8px', background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: '10px', color: '#facc15' }}>{sess.user_plan}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#555' }}>{sess.message_count} msgs</span>
                  <span style={{ fontSize: '11px', color: '#555' }}>{timeAgo(sess.last_active)}</span>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sess.last_question || 'No messages yet'}
              </p>
              <div style={{ fontSize: '11px', color: '#444', marginTop: '4px' }}>{sess.user_ip}</div>
            </div>
          ))}
        </div>

        {/* Message thread */}
        {selected && (
          <div style={{ ...s.card, maxHeight: '600px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #1e1e2e' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0' }}>Conversation</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => deleteSession(selected)} style={{ padding: '4px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#f87171', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                <button onClick={() => setSelected(null)} style={{ padding: '4px 12px', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: '6px', color: '#888', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {messages.map((msg, i) => (
                <div key={i} style={s.msg(msg.role)}>
                  <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>
                    {msg.role === 'user' ? '👤 User' : '🤖 AI'}
                    {msg.model && <span> · {msg.model}</span>}
                    {msg.latency_ms && <span> · {msg.latency_ms}ms</span>}
                    <span> · {new Date(msg.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                </div>
              ))}
              {messages.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>No messages</div>}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps = async () => ({ props: {} });
