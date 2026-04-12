import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function TeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useState(null);
  const [inviteLink, setInviteLink] = useState(null);

  useEffect(() => { if (status === 'unauthenticated') router.push('/login?callbackUrl=/team'); }, [status]);
  useEffect(() => { if (session?.user) fetchTeam(); }, [session]);

  async function fetchTeam() {
    setLoading(true);
    const res = await fetch('/api/team');
    const data = await res.json();
    if (res.ok) setTeamData(data);
    setLoading(false);
  }

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  async function invite(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'invite', email }) });
    const data = await res.json();
    if (data.success) { setInviteLink(data.invite_url); setEmail(''); showToast('Invite link generated!'); }
    else showToast(data.error || 'Failed', 'error');
    setInviting(false);
  }

  async function removeMember(memberId) {
    if (!confirm('Remove this member? They will lose Pro access.')) return;
    const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', member_id: memberId }) });
    const data = await res.json();
    if (data.success) { showToast('Member removed'); fetchTeam(); }
    else showToast(data.error || 'Failed', 'error');
  }

  const plan = session?.user?.plan || 'free';

  if (status === 'loading' || loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
    </div>
  );

  if (plan !== 'enterprise') return (
    <>
      <Head><title>Team — snspokes</title></Head>
      <Navbar />
      <div className="min-h-screen bg-gray-950 text-white pt-20 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">👥</div>
          <h1 className="text-2xl font-bold mb-3">Team features require Enterprise</h1>
          <p className="text-gray-400 mb-6">Manage up to 20 team members, centralized billing, and org-level admin panel.</p>
          <Link href="/pricing" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium">View Enterprise Plan →</Link>
        </div>
      </div>
      <Footer />
    </>
  );

  return (
    <>
      <Head><title>Team Management — snspokes</title></Head>
      <Navbar />
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>{toast.msg}</div>
      )}
      <div className="min-h-screen bg-gray-950 text-white pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">{teamData?.team?.name || 'My Team'}</h1>
              <p className="text-gray-400 mt-1">{teamData?.members?.length || 0} / 20 members</p>
            </div>
            <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
          </div>

          {/* Invite form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-white mb-4">Invite Team Member</h2>
            <form onSubmit={invite} className="flex gap-3">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@company.com" required
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
              <button type="submit" disabled={inviting}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap">
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
            {inviteLink && (
              <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-400 text-xs mb-2">✅ Share this invite link:</p>
                <div className="flex gap-2">
                  <input readOnly value={inviteLink} className="flex-1 bg-gray-800 text-gray-300 text-xs px-3 py-2 rounded-lg" />
                  <button onClick={() => { navigator.clipboard.writeText(inviteLink); showToast('Copied!'); }}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded-lg">Copy</button>
                </div>
              </div>
            )}
          </div>

          {/* Members list */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white">Team Members ({teamData?.members?.length || 0})</h2>
            </div>
            {(teamData?.members || []).length === 0 ? (
              <div className="text-center py-12 text-gray-500">No members yet. Send your first invite above.</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {(teamData?.members || []).map(m => (
                  <div key={m.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {(m.name || m.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{m.name || '—'}</div>
                        <div className="text-gray-400 text-sm">{m.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {m.role === 'owner' || m.user_id === session?.user?.id ? (
                        <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-1 rounded-lg">Owner</span>
                      ) : (
                        <>
                          <span className="text-xs text-gray-500">
                            {m.last_login ? `Last: ${new Date(m.last_login).toLocaleDateString()}` : 'Never logged in'}
                          </span>
                          <button onClick={() => removeMember(m.user_id)}
                            className="text-xs text-gray-500 hover:text-red-400 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all">
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending invites */}
          {(teamData?.invites || []).length > 0 && (
            <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h2 className="font-semibold text-white">Pending Invites ({teamData.invites.length})</h2>
              </div>
              {teamData.invites.map(inv => (
                <div key={inv.id} className="px-6 py-3 flex items-center justify-between border-b border-gray-800/50">
                  <span className="text-gray-300 text-sm">{inv.email}</span>
                  <span className="text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded-lg">Pending</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export const dynamic = 'force-dynamic';
