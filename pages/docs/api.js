import Head from 'next/head';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

const ENDPOINTS = [
  {
    group: 'Spokes',
    items: [
      {
        method: 'GET', path: '/api/search', auth: false,
        desc: 'Search spokes by keyword, category, or version',
        params: [
          { name: 'q', type: 'string', required: false, desc: 'Search query' },
          { name: 'category', type: 'string', required: false, desc: 'Filter by category' },
          { name: 'version', type: 'string', required: false, desc: 'Min SN version (e.g. Tokyo)' },
          { name: 'page', type: 'integer', required: false, desc: 'Page number (default: 1)' },
          { name: 'sort', type: 'string', required: false, desc: 'relevance | popular | newest' },
        ],
        example: `curl "https://snspokes.com/api/search?q=slack&category=Communication" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
        response: `{
  "success": true,
  "results": [
    {
      "slug": "slack-spoke",
      "name": "Slack Spoke",
      "category": "Communication",
      "description": "...",
      "plugin_id": "com.snc.slack",
      "avg_rating": 4.8
    }
  ],
  "total": 12,
  "page": 1,
  "pages": 1
}`,
      },
      {
        method: 'GET', path: '/api/spoke?slug={slug}', auth: false,
        desc: 'Get full details for a single spoke',
        params: [{ name: 'slug', type: 'string', required: true, desc: 'Spoke slug identifier' }],
        example: `curl "https://snspokes.com/api/spoke?slug=slack-spoke" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
        response: `{
  "success": true,
  "spoke": {
    "slug": "slack-spoke",
    "name": "Slack Spoke",
    "description": "Full description...",
    "category": "Communication",
    "plugin_id": "com.snc.slack",
    "min_version": "Tokyo",
    "avg_rating": 4.8,
    "view_count": 1234
  }
}`,
      },
    ],
  },
  {
    group: 'AI Tools',
    items: [
      {
        method: 'POST', path: '/api/tools/code-generator', auth: true,
        desc: 'Generate ServiceNow code using AI',
        params: [
          { name: 'prompt', type: 'string', required: true, desc: 'What the code should do' },
          { name: 'code_type', type: 'string', required: true, desc: 'business_rule | script_include | client_script | scheduled_job | rest_api | transform_map | flow_script' },
          { name: 'config', type: 'object', required: false, desc: 'Extra config (tableName, when, method, etc.)' },
        ],
        example: `curl -X POST "https://snspokes.com/api/tools/code-generator" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Auto-assign incidents to on-call group","code_type":"business_rule","config":{"tableName":"incident","when":"before"}}'`,
        response: `{
  "success": true,
  "code": "(function executeRule(current, previous) {\\n  // Your generated code\\n})(current, previous);",
  "code_type": "business_rule",
  "model": "meta-llama/llama-3.1-8b-instruct:free",
  "via": "n8n"
}`,
      },
      {
        method: 'POST', path: '/api/chatbot', auth: false,
        desc: 'Ask the ServiceNow AI assistant a question',
        params: [
          { name: 'question', type: 'string', required: true, desc: 'Your ServiceNow question' },
          { name: 'history', type: 'array', required: false, desc: 'Previous messages for context [{role, content}]' },
        ],
        example: `curl -X POST "https://snspokes.com/api/chatbot" \\
  -H "Content-Type: application/json" \\
  -d '{"question":"How do I query incidents by priority in GlideRecord?"}'`,
        response: `{
  "success": true,
  "answer": "To query incidents by priority...",
  "model": "meta-llama/llama-3.1-8b-instruct:free"
}`,
      },
    ],
  },
  {
    group: 'Authentication',
    items: [
      {
        method: 'GET', path: '/api/health', auth: false,
        desc: 'Check API health status',
        params: [],
        example: `curl "https://snspokes.com/api/health"`,
        response: `{ "status": "ok", "db": true, "redis": true }`,
      },
    ],
  },
];

const METHOD_COLORS = { GET: 'bg-green-500/20 text-green-400', POST: 'bg-blue-500/20 text-blue-400', DELETE: 'bg-red-500/20 text-red-400', PUT: 'bg-yellow-500/20 text-yellow-400' };

export default function ApiDocs() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(null);
  const isPro = ['pro', 'enterprise'].includes(session?.user?.plan);

  return (
    <>
      <Head>
        <title>API Documentation — snspokes</title>
        <meta name="description" content="snspokes REST API documentation for developers." />
      </Head>
      <Navbar />
      <div className="min-h-screen bg-gray-950 text-white pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4">

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-3">API Documentation</h1>
            <p className="text-gray-400">REST API for accessing ServiceNow spokes and AI tools programmatically.</p>
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <span className="bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-1 rounded-lg text-sm">Base URL: https://snspokes.com</span>
              <span className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-lg text-sm">JSON responses</span>
              <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 px-3 py-1 rounded-lg text-sm">Bearer token auth</span>
            </div>
          </div>

          {/* Auth section */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold mb-3">Authentication</h2>
            <p className="text-gray-400 text-sm mb-4">Include your API key in the <code className="text-purple-300 bg-gray-800 px-1.5 py-0.5 rounded">Authorization</code> header for authenticated endpoints.</p>
            <pre className="bg-gray-950 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto mb-4">{`Authorization: Bearer snsk_your_api_key_here`}</pre>
            {!isPro ? (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center justify-between">
                <p className="text-yellow-300 text-sm">🔒 API keys require a Pro subscription</p>
                <Link href="/pricing" className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-2 rounded-lg">Upgrade</Link>
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center justify-between">
                <p className="text-green-300 text-sm">✅ You have API access — get your key from the dashboard</p>
                <Link href="/dashboard?tab=apikeys" className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded-lg">Get Key</Link>
              </div>
            )}
          </div>

          {/* Rate limits */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold mb-3">Rate Limits</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-800 text-left">
                  <th className="py-2 text-gray-400 font-medium">Plan</th>
                  <th className="py-2 text-gray-400 font-medium">Searches/day</th>
                  <th className="py-2 text-gray-400 font-medium">AI generations/day</th>
                  <th className="py-2 text-gray-400 font-medium">API calls/day</th>
                </tr></thead>
                <tbody>
                  {[['Free', '50', '10', '—'], ['Pro', '2,000', '100', '10,000'], ['Enterprise', '∞', '∞', '∞']].map(([plan, ...vals]) => (
                    <tr key={plan} className="border-b border-gray-800/50">
                      <td className="py-2.5 font-medium text-white">{plan}</td>
                      {vals.map((v, i) => <td key={i} className="py-2.5 text-gray-300">{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Endpoints */}
          {ENDPOINTS.map(group => (
            <div key={group.group} className="mb-8">
              <h2 className="text-xl font-bold mb-4 text-purple-300">{group.group}</h2>
              <div className="space-y-3">
                {group.items.map((ep, i) => {
                  const key = `${group.group}-${i}`;
                  return (
                    <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                      <button className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-800/50 transition-all"
                        onClick={() => setOpen(open === key ? null : key)}>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${METHOD_COLORS[ep.method] || 'bg-gray-700 text-gray-300'}`}>{ep.method}</span>
                          <code className="text-sm text-white">{ep.path}</code>
                          {ep.auth && <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded">🔑 auth</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-sm hidden md:block">{ep.desc}</span>
                          <span className="text-gray-500">{open === key ? '▲' : '▼'}</span>
                        </div>
                      </button>
                      {open === key && (
                        <div className="border-t border-gray-800 p-5 space-y-5">
                          <p className="text-gray-300 text-sm">{ep.desc}</p>
                          {ep.params.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Parameters</h4>
                              <div className="space-y-2">
                                {ep.params.map(p => (
                                  <div key={p.name} className="flex items-start gap-3 text-sm">
                                    <code className="text-purple-300 w-32 shrink-0">{p.name}</code>
                                    <span className="text-gray-500 w-16 shrink-0">{p.type}</span>
                                    <span className={`w-16 shrink-0 text-xs ${p.required ? 'text-red-400' : 'text-gray-600'}`}>{p.required ? 'required' : 'optional'}</span>
                                    <span className="text-gray-400">{p.desc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Example Request</h4>
                            <pre className="bg-gray-950 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">{ep.example}</pre>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Example Response</h4>
                            <pre className="bg-gray-950 rounded-lg p-4 text-xs text-green-300 overflow-x-auto">{ep.response}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* SDKs / help */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-3">Need Help?</h2>
            <p className="text-gray-400 text-sm mb-4">Can't find what you need? We're here to help.</p>
            <div className="flex flex-wrap gap-3">
              <a href="mailto:support@snspokes.com" className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">📧 Email Support</a>
              <Link href="/tools/code-generator" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm">💻 Try Code Generator</Link>
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}
