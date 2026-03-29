import { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function AnalyzerPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('query');

  const PRESETS = {
    query: [
      'Show top 10 most searched terms this week',
      'Show users who signed up today',
      'Show spokes with zero views',
      'Show failed payment attempts',
      'Show users on pro plan',
    ],
    error: [
      'Show all unresolved errors',
      'Show errors from last 24 hours',
      'Show most common error types',
    ],
  };

  async function analyze() {
    if (!query.trim()) return;
    setLoading(true);
    const r = await fetch('/api/admin/analyzer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': localStorage.getItem('admin_token') || '' },
      body: JSON.stringify({ query, type }),
    });
    const d = await r.json();
    setResult(d);
    setLoading(false);
  }

  return (
    <AdminLayout title="Analyzer">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-2">AI Analyzer</h1>
        <p className="text-gray-400 text-sm mb-6">Ask questions about your data in plain English.</p>

        <div className="flex gap-3 mb-4">
          {['query', 'error'].map(t => (
            <button key={t} onClick={() => setType(t)}
              style={{ padding:'8px 16px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', transition:'all 0.15s', border:'none', cursor:'pointer', fontFamily:'inherit', background: type === t ? '#6c63ff' : '#111827', color: type === t ? '#fff' : '#6b7280' }}>
              {t === 'query' ? '📊 Query Analyzer' : '⚠️ Error Analyzer'}
            </button>
          ))}
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS[type].map(p => (
            <button key={p} onClick={() => setQuery(p)}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg">
              {p}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && analyze()}
            placeholder="Ask anything about your data..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500" />
          <button onClick={analyze} disabled={loading || !query.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl text-sm font-medium disabled:opacity-50">
            {loading ? 'Analyzing...' : 'Analyze →'}
          </button>
        </div>

        {result && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            {result.success ? (
              <>
                {result.answer && <p className="text-gray-300 text-sm mb-4 leading-relaxed">{result.answer}</p>}
                {result.rows && result.rows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-700">
                          {Object.keys(result.rows[0]).map(k => <th key={k} className="text-left py-2 text-gray-400 font-medium pr-4">{k}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, i) => (
                          <tr key={i} className="border-b border-gray-800/50">
                            {Object.values(row).map((v, j) => <td key={j} className="py-2 text-gray-300 pr-4">{String(v)}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : <p className="text-red-400 text-sm">{result.error}</p>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
export const getServerSideProps = async () => ({ props: {} });

export default withAdminPage(AnalyzerPage);
