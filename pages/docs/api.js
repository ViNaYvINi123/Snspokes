import { useState } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

const BASE = 'https://snspokes.com/api';

const ENDPOINTS = [
  {
    section: 'Search & AI',
    endpoints: [
      {
        method: 'POST', path: '/api/search', title: 'Search Spokes + AI Answer',
        desc: 'Search Integration Hub spokes by name/description. Returns matching spokes AND an AI-generated answer.',
        body: '{ "query": "Slack spoke setup" }',
        response: '{ "success": true, "results": [...], "ai_answer": { "answer": "...", "model": "..." }, "total": 5 }',
        rateLimit: '50/day (free) · 2000/day (pro)',
      },
      {
        method: 'POST', path: '/api/chatbot', title: 'AI Chatbot',
        desc: 'Ask any question about ServiceNow. Supports conversation history for context-aware replies.',
        body: '{ "question": "How to write a Business Rule?", "history": [] }',
        response: '{ "success": true, "answer": "...", "model": "claude-sonnet-4.6", "latency_ms": 1200 }',
        rateLimit: '30/min',
      },
      {
        method: 'POST', path: '/api/stream', title: 'AI Stream (SSE)',
        desc: 'Stream AI responses in real-time via Server-Sent Events. Great for live typing effect.',
        body: '{ "query": "What is GlideRecord?" }',
        response: 'data: { "type": "chunk", "content": "GlideRecord is..." }\ndata: { "type": "done", "model": "..." }',
        rateLimit: '15/min',
      },
    ]
  },
  {
    section: 'Spokes',
    endpoints: [
      {
        method: 'GET', path: '/api/spokes', title: 'List All Spokes',
        desc: 'Get all Integration Hub spokes. Filter by category or search term.',
        body: null,
        params: '?search=slack&category=Communication',
        response: '{ "success": true, "spokes": [{ "slug": "slack", "name": "Slack", "category": "Communication", ... }] }',
        rateLimit: 'Unlimited',
      },
      {
        method: 'POST', path: '/api/spoke', title: 'Get Spoke Details (AI-enriched)',
        desc: 'Get detailed info about a spoke including AI-generated documentation, actions, and code examples.',
        body: '{ "slug": "slack", "name": "Slack", "category": "Communication" }',
        response: '{ "success": true, "content": "..." }',
        rateLimit: '10/min',
      },
    ]
  },
  {
    section: 'Developer Tools',
    endpoints: [
      {
        method: 'POST', path: '/api/tools/code-generator', title: 'Code Generator',
        desc: 'Generate production-ready ServiceNow code. Supports 7 types: business_rule, script_include, client_script, scheduled_job, rest_api, transform_map, flow_script.',
        body: '{ "prompt": "Send Slack notification when P1 incident created", "code_type": "business_rule" }',
        response: '{ "success": true, "code": "...", "code_type": "business_rule", "model": "..." }',
        rateLimit: '50/day (free)',
      },
      {
        method: 'POST', path: '/api/tools/script-linter', title: 'Script Linter',
        desc: 'Lint ServiceNow scripts with 15+ rules. Optionally request AI-powered deep review.',
        body: '{ "script": "var gr = new GlideRecord(\'incident\');...", "script_type": "server", "ai_review": true }',
        response: '{ "success": true, "score": 85, "grade": "B+", "issues": [...], "ai_review": "..." }',
        rateLimit: '30/min',
      },
      {
        method: 'POST', path: '/api/tools/error-search', title: 'Error Analyzer',
        desc: 'Analyze ServiceNow errors. Searches pre-indexed solutions first, falls back to AI analysis.',
        body: '{ "action": "ai_analyze", "error_message": "ACL restricts access to this record" }',
        response: '{ "success": true, "title": "...", "root_cause": "...", "fix_steps": [...] }',
        rateLimit: '20/min',
      },
      {
        method: 'POST', path: '/api/tools/query-builder', title: 'Query Builder',
        desc: 'Build GlideRecord scripts from visual conditions. Includes AI optimization.',
        body: '{ "action": "build", "tableName": "incident", "conditions": [{ "field": "active", "operator": "=", "value": "true" }], "limit": 10 }',
        response: '{ "success": true, "script": "var gr = new GlideRecord(\'incident\');...", "encoded_query": "active=true" }',
        rateLimit: '30/min',
      },
      {
        method: 'GET', path: '/api/tools/version-matrix', title: 'Version Matrix',
        desc: 'Check feature availability across ServiceNow versions (Rome → Yokohama).',
        body: null,
        params: '?q=flow+designer&type=feature',
        response: '{ "success": true, "features": [{ "feature_name": "Flow Designer", "versions": { "Tokyo": true, ... } }] }',
        rateLimit: 'Unlimited',
      },
    ]
  },
  {
    section: 'Sharing',
    endpoints: [
      {
        method: 'POST', path: '/api/share', title: 'Share Script',
        desc: 'Create a shareable link for any code snippet.',
        body: '{ "title": "My Business Rule", "code": "var gr = ...", "language": "javascript" }',
        response: '{ "success": true, "share_id": "a1b2c3d4e5f6", "url": "/share/a1b2c3d4e5f6" }',
        rateLimit: '10/min',
      },
    ]
  },
  {
    section: 'System',
    endpoints: [
      {
        method: 'GET', path: '/api/health', title: 'Health Check',
        desc: 'Check if all services are running (database, Redis, AI).',
        body: null,
        response: '{ "status": "ok", "checks": { "database": { "ok": true }, "redis": { "ok": true } } }',
        rateLimit: 'Unlimited',
      },
    ]
  },
];

const INTEGRATIONS = [
  {
    title: 'JavaScript / Node.js',
    code: `const response = await fetch('${BASE}/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer snsk_your_api_key_here'
  },
  body: JSON.stringify({ query: 'Slack spoke' })
});
const data = await response.json();
console.log(data.ai_answer?.answer);`,
  },
  {
    title: 'Python',
    code: `import requests

response = requests.post('${BASE}/search', 
  json={'query': 'Slack spoke'},
  headers={'Authorization': 'Bearer snsk_your_api_key_here'}
)
data = response.json()
print(data['ai_answer']['answer'])`,
  },
  {
    title: 'cURL',
    code: `curl -X POST ${BASE}/search \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer snsk_your_api_key_here" \\
  -d '{"query": "Slack spoke"}'`,
  },
  {
    title: 'React Component',
    code: `import { useState } from 'react';

function SNSearch() {
  const [answer, setAnswer] = useState('');
  
  const search = async (query) => {
    const res = await fetch('${BASE}/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    setAnswer(data.ai_answer?.answer || 'No answer');
  };

  return (
    <div>
      <input onChange={e => search(e.target.value)} placeholder="Search..." />
      <p>{answer}</p>
    </div>
  );
}`,
  },
  {
    title: 'ServiceNow (GlideHTTPRequest)',
    code: `// Call snspokes API from ServiceNow
var rm = new sn_ws.RESTMessageV2();
rm.setEndpoint('${BASE}/tools/code-generator');
rm.setHttpMethod('POST');
rm.setRequestHeader('Content-Type', 'application/json');
rm.setRequestBody(JSON.stringify({
  prompt: 'Auto-assign incident based on category',
  code_type: 'business_rule'
}));
var response = rm.execute();
var body = JSON.parse(response.getBody());
gs.info('Generated code: ' + body.code);`,
  },
];

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1e1e2e', margin: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: '#111827', borderBottom: '1px solid #1e1e2e' }}>
        <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', fontWeight: '600' }}>{lang || 'code'}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ padding: '2px 10px', background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(108,99,255,0.1)', border: 'none', borderRadius: '4px', color: copied ? '#4ade80' : '#8b85ff', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '12px', background: '#0a0a14', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: '#a8b2d8', lineHeight: '1.6', overflow: 'auto', maxHeight: '300px' }}>{code}</pre>
    </div>
  );
}

function MethodBadge({ method }) {
  const colors = { GET: '#4ade80', POST: '#8b85ff', PUT: '#facc15', DELETE: '#f87171' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", background: (colors[method] || '#888') + '18', color: colors[method] || '#888', border: '1px solid ' + (colors[method] || '#888') + '30' }}>{method}</span>
  );
}

export default function APIDocs() {
  const [activeSection, setActiveSection] = useState('Search & AI');
  const [activeTab, setActiveTab] = useState('endpoints');

  return (
    <>
      <Head>
        <title>API Documentation — snspokes</title>
        <meta name="description" content="Free API for ServiceNow developers. Search spokes, generate code, lint scripts, analyze errors. Integrate snspokes into your apps." />
      </Head>
      <Navbar />
      <main style={{ paddingTop: '80px', minHeight: '100vh' }}>
        {/* Hero */}
        <section style={{ padding: '40px 24px 30px', borderBottom: '1px solid #1a1a2e', background: 'radial-gradient(ellipse at 20% 50%, rgba(108,99,255,0.06) 0%, transparent 60%)' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}><span className="gradient-text">API Documentation</span></h1>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>Integrate snspokes into your apps — search spokes, generate code, analyze errors. Free for all developers.</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ padding: '4px 14px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '20px', fontSize: '12px', color: '#4ade80' }}>Base URL: {BASE}</span>
              <span style={{ padding: '4px 14px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: '20px', fontSize: '12px', color: '#8b85ff' }}>Free Tier Available</span>
              <span style={{ padding: '4px 14px', background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.15)', borderRadius: '20px', fontSize: '12px', color: '#facc15' }}>No API Key Required for Public Endpoints</span>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section style={{ padding: '0 24px', borderBottom: '1px solid #1a1a2e' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '4px', padding: '12px 0' }}>
            {['endpoints', 'integration', 'authentication', 'rate-limits'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: '8px 18px', background: activeTab === tab ? 'rgba(108,99,255,0.12)' : 'transparent', border: '1px solid ' + (activeTab === tab ? '#6c63ff30' : 'transparent'), borderRadius: '8px', color: activeTab === tab ? '#8b85ff' : '#666', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: activeTab === tab ? '600' : '400', textTransform: 'capitalize' }}>
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>
        </section>

        <section style={{ padding: '24px' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

            {/* ENDPOINTS TAB */}
            {activeTab === 'endpoints' && (
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '24px' }}>
                {/* Sidebar */}
                <div>
                  {ENDPOINTS.map(s => (
                    <button key={s.section} onClick={() => setActiveSection(s.section)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', background: activeSection === s.section ? 'rgba(108,99,255,0.08)' : 'transparent', border: 'none', borderLeft: '2px solid ' + (activeSection === s.section ? '#6c63ff' : 'transparent'), color: activeSection === s.section ? '#e2e8f0' : '#666', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '2px' }}>
                      {s.section}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div style={{ display: 'grid', gap: '20px' }}>
                  {ENDPOINTS.find(s => s.section === activeSection)?.endpoints.map(ep => (
                    <div key={ep.path} style={{ background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: '14px', overflow: 'hidden' }}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid #141420' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <MethodBadge method={ep.method} />
                          <code style={{ fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", color: '#e2e8f0' }}>{ep.path}{ep.params || ''}</code>
                          {ep.rateLimit && <span style={{ fontSize: '10px', color: '#555', marginLeft: 'auto' }}>Rate: {ep.rateLimit}</span>}
                        </div>
                        <h3 style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>{ep.title}</h3>
                        <p style={{ color: '#777', fontSize: '13px', lineHeight: '1.5' }}>{ep.desc}</p>
                      </div>
                      <div style={{ padding: '16px 20px' }}>
                        {ep.body && (
                          <>
                            <p style={{ color: '#555', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>Request Body</p>
                            <CodeBlock code={ep.body} lang="json" />
                          </>
                        )}
                        <p style={{ color: '#555', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px', marginTop: '12px' }}>Response</p>
                        <CodeBlock code={ep.response} lang="json" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* INTEGRATION TAB */}
            {activeTab === 'integration' && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Integrate snspokes into your app</h2>
                <p style={{ color: '#777', fontSize: '14px', marginBottom: '24px' }}>Copy any example below. Works with any language or framework. No signup required for public endpoints.</p>
                <div style={{ display: 'grid', gap: '20px' }}>
                  {INTEGRATIONS.map(int => (
                    <div key={int.title} style={{ background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: '14px', padding: '20px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', marginBottom: '10px' }}>{int.title}</h3>
                      <CodeBlock code={int.code} lang={int.title.toLowerCase().split(' ')[0]} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AUTH TAB */}
            {activeTab === 'authentication' && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Authentication</h2>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div style={{ background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: '14px', padding: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#4ade80', marginBottom: '8px' }}>Public Endpoints (No Auth Required)</h3>
                    <p style={{ color: '#777', fontSize: '13px', lineHeight: '1.6' }}>Most endpoints work without authentication. Just send requests directly. Subject to IP-based rate limits.</p>
                    <CodeBlock code={`curl -X POST ${BASE}/search \\
  -H "Content-Type: application/json" \\
  -d '{"query": "Slack spoke"}'`} lang="bash" />
                  </div>

                  <div style={{ background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: '14px', padding: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#8b85ff', marginBottom: '8px' }}>API Key Authentication (Higher Limits)</h3>
                    <p style={{ color: '#777', fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' }}>Create an account → go to Dashboard → API Keys → Generate Key. Send it in the Authorization header.</p>
                    <CodeBlock code={`curl -X POST ${BASE}/tools/code-generator \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer snsk_your_api_key_here" \\
  -d '{"prompt": "Auto-assign incidents", "code_type": "business_rule"}'`} lang="bash" />
                    <p style={{ color: '#555', fontSize: '12px', marginTop: '12px' }}>API keys start with <code style={{ background: '#1a1a2e', padding: '2px 6px', borderRadius: '4px', color: '#8b85ff', fontSize: '12px' }}>snsk_</code> and are 52 characters long.</p>
                  </div>
                </div>
              </div>
            )}

            {/* RATE LIMITS TAB */}
            {activeTab === 'rate-limits' && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Rate Limits</h2>
                <div style={{ background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: '14px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1e1e2e' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#666', fontWeight: '600' }}>Endpoint</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#666', fontWeight: '600' }}>Free</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#666', fontWeight: '600' }}>Pro</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#666', fontWeight: '600' }}>Enterprise</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['/api/search', '50/day', '2,000/day', 'Unlimited'],
                        ['/api/chatbot', '30/min', '100/min', 'Unlimited'],
                        ['/api/stream', '15/min', '60/min', 'Unlimited'],
                        ['/api/tools/*', '50/day', '500/day', 'Unlimited'],
                        ['/api/spokes', 'Unlimited', 'Unlimited', 'Unlimited'],
                        ['/api/health', 'Unlimited', 'Unlimited', 'Unlimited'],
                      ].map(([ep, free, pro, ent]) => (
                        <tr key={ep} style={{ borderBottom: '1px solid #141420' }}>
                          <td style={{ padding: '10px 16px', color: '#a8b2d8', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{ep}</td>
                          <td style={{ padding: '10px 16px', color: '#e2e8f0' }}>{free}</td>
                          <td style={{ padding: '10px 16px', color: '#8b85ff' }}>{pro}</td>
                          <td style={{ padding: '10px 16px', color: '#4ade80' }}>{ent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ color: '#555', fontSize: '12px', marginTop: '12px' }}>Rate limit headers are included in every response: <code style={{ background: '#1a1a2e', padding: '2px 6px', borderRadius: '4px', color: '#a8b2d8', fontSize: '12px' }}>X-RateLimit-Remaining</code></p>

                <div style={{ marginTop: '24px', background: '#0d0d18', border: '1px solid rgba(250,204,21,0.2)', borderRadius: '14px', padding: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#facc15', marginBottom: '8px' }}>Will your app crash from third-party traffic?</h3>
                  <p style={{ color: '#777', fontSize: '13px', lineHeight: '1.7' }}>No. Every endpoint has rate limiting. Excess requests get a <code style={{ background: '#1a1a2e', padding: '2px 6px', borderRadius: '4px', color: '#f87171', fontSize: '12px' }}>429 Too Many Requests</code> response. AI responses are cached — identical queries cost zero API calls. Your server handles ~1000 concurrent users with current setup.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
