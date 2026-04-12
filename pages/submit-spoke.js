import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const CATEGORIES = ['ITSM', 'HR', 'CSM', 'Security', 'Finance', 'DevOps', 'Monitoring', 'Communication', 'Storage', 'Identity', 'Other'];

export default function SubmitSpoke() {
  const { data: session } = useSession();
  const [form, setForm] = useState({ name: '', plugin_id: '', description: '', category: '', credential_type: '', min_version: '', use_cases: '', store_url: '', submitter_notes: '' });
  const [status, setStatus] = useState(null); // null | 'submitting' | 'success' | 'error'
  const [errors, setErrors] = useState({});

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.plugin_id.trim()) e.plugin_id = 'Required';
    if (!form.category) e.category = 'Required';
    if (form.description.trim().length < 30) e.description = 'Min 30 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setStatus('submitting');
    try {
      const res = await fetch('/api/spokes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, submitted_by: session?.user?.email }),
      });
      const data = await res.json();
      setStatus(data.success ? 'success' : 'error');
    } catch { setStatus('error'); }
  }

  return (
    <>
      <Head>
        <title>Submit a Spoke — snspokes</title>
        <meta name="description" content="Submit a new ServiceNow spoke to the snspokes directory." />
      </Head>
      <Navbar />
      <div className="min-h-screen bg-gray-950 text-white pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2">Submit a Spoke</h1>
            <p className="text-gray-400">Help the community discover new ServiceNow integrations.</p>
            <p className="text-gray-500 text-sm mt-1">Approved submissions get featured on the homepage.</p>
          </div>

          {status === 'success' ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-12 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-white mb-2">Submission received!</h2>
              <p className="text-gray-400 mb-6">We'll review your spoke within 2-3 business days. You'll get an email when it's approved.</p>
              <div className="flex gap-3 justify-center">
                <Link href="/spokes" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm">Browse Spokes</Link>
                <button onClick={() => { setStatus(null); setForm({ name:'',plugin_id:'',description:'',category:'',credential_type:'',min_version:'',use_cases:'',store_url:'',submitter_notes:'' }); }}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm">Submit Another</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Spoke Name *" error={errors.name}>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Slack Spoke"
                    className="input" />
                </Field>
                <Field label="Plugin ID *" error={errors.plugin_id}>
                  <input value={form.plugin_id} onChange={e => set('plugin_id', e.target.value)} placeholder="e.g. com.snc.slack"
                    className="input" />
                </Field>
              </div>

              <Field label="Category *" error={errors.category}>
                <select value={form.category} onChange={e => set('category', e.target.value)} className="input">
                  <option value="">Select category...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Description *" error={errors.description}>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
                  placeholder="What does this spoke do? What integrations does it enable?"
                  className="input resize-none" />
              </Field>

              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Credential Type">
                  <input value={form.credential_type} onChange={e => set('credential_type', e.target.value)} placeholder="e.g. OAuth2, API Key, Basic"
                    className="input" />
                </Field>
                <Field label="Min SN Version">
                  <select value={form.min_version} onChange={e => set('min_version', e.target.value)} className="input">
                    <option value="">Not sure</option>
                    {['Rome','San Diego','Tokyo','Utah','Vancouver','Washington DC','Xanadu','Yokohama'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Use Cases">
                <textarea value={form.use_cases} onChange={e => set('use_cases', e.target.value)} rows={3}
                  placeholder="How are ServiceNow teams using this spoke? (optional)"
                  className="input resize-none" />
              </Field>

              <Field label="ServiceNow Store URL">
                <input value={form.store_url} onChange={e => set('store_url', e.target.value)} placeholder="https://store.servicenow.com/..."
                  className="input" />
              </Field>

              <Field label="Notes for reviewers">
                <textarea value={form.submitter_notes} onChange={e => set('submitter_notes', e.target.value)} rows={2}
                  placeholder="Anything else we should know?" className="input resize-none" />
              </Field>

              {!session && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-300">
                  💡 <Link href="/login" className="underline">Sign in</Link> to track your submission status and get notified on approval.
                </div>
              )}

              {status === 'error' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">Submission failed. Please try again.</div>
              )}

              <button type="submit" disabled={status === 'submitting'}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-all">
                {status === 'submitting' ? 'Submitting...' : 'Submit Spoke for Review →'}
              </button>
            </form>
          )}
        </div>
      </div>
      <style jsx>{`.input { width: 100%; background: #1f2937; border: 1px solid #374151; border-radius: 0.75rem; padding: 0.75rem 1rem; color: white; font-size: 0.875rem; outline: none; } .input:focus { border-color: #a855f7; } .input option { background: #1f2937; }`}</style>
      <Footer />
    </>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

export const dynamic = 'force-dynamic';
