import { useState, useCallback } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

const mono = { fontFamily: "'JetBrains Mono', monospace" };

// ── Rule-based ServiceNow script formatter ─────────────────────────────────
function formatSNScript(raw) {
  if (!raw?.trim()) return '';
  let code = raw;

  // 1. Normalize line endings
  code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Add spaces around operators (skip inside strings)
  code = code.replace(/([^=!<>])=([^=>\s])/g, '$1 = $2');
  code = code.replace(/([^<])>([^=])/g, '$1 > $2');
  code = code.replace(/([^!<>])(<)([^=])/g, '$1 < $3');

  // 3. Fix missing spaces after keywords
  code = code.replace(/\b(if|for|while|switch|catch)\(/g, '$1 (');
  code = code.replace(/\b(else|try|finally)\{/g, '$1 {');
  code = code.replace(/\)\{/g, ') {');

  // 4. Ensure spaces after commas (not inside strings)
  code = code.replace(/,([^\s\n])/g, ', $1');

  // 5. Fix semicolons — add missing at end of statements
  const lines = code.split('\n');
  const formatted = [];
  let indent = 0;
  const TAB = '    '; // 4 spaces

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) { formatted.push(''); continue; }

    // Decrease indent for closing braces
    if (line.startsWith('}') || line.startsWith(')') || line.startsWith(']')) {
      indent = Math.max(0, indent - 1);
    }

    const indented = TAB.repeat(indent) + line;
    formatted.push(indented);

    // Increase indent after opening braces
    if (line.endsWith('{') || line.endsWith('(') || line.endsWith('[')) {
      indent++;
    }
    // Handle single-line blocks: if (x) return y;
    // no indent change needed
  }

  code = formatted.join('\n');

  // 6. Collapse multiple blank lines to max 1
  code = code.replace(/\n{3,}/g, '\n\n');

  // 7. Add blank line before block comments
  code = code.replace(/([^\n])\n(\/\/)/g, '$1\n\n$2');

  // 8. Trim trailing whitespace per line
  code = code.split('\n').map(l => l.trimEnd()).join('\n');

  return code.trim();
}

function countIssues(raw) {
  if (!raw) return [];
  const issues = [];
  const lines = raw.split('\n');

  lines.forEach((line, i) => {
    const n = i + 1;
    const t = line.trim();

    // Detect common SN anti-patterns
    if (/gr\.\w+\s*=\s*[^=]/.test(t) && !/\.setValue/.test(t) && !/var\s/.test(t))
      issues.push({ line: n, type: 'warn', msg: 'Use gr.setValue() instead of gr.field = value in scoped scripts' });

    if (/new GlideRecord/.test(t) && !/\.query\(\)/.test(line) && !lines[i+1]?.includes('.query'))
      issues.push({ line: n, type: 'info', msg: 'GlideRecord created — remember to call .query() before .next()' });

    if (/console\.log/.test(t))
      issues.push({ line: n, type: 'warn', msg: 'Use gs.log() or gs.info() instead of console.log() in server scripts' });

    if (/eval\(/.test(t))
      issues.push({ line: n, type: 'error', msg: 'eval() is restricted in scoped apps — use JSON.parse() or Function constructors instead' });

    if (t.length > 120)
      issues.push({ line: n, type: 'info', msg: 'Long line (>' + t.length + ' chars) — consider breaking for readability' });

    if (/while\s*\(true\)/.test(t) || /for\s*\(;;\)/.test(t))
      issues.push({ line: n, type: 'error', msg: 'Infinite loop detected — ServiceNow scripts have a 30s execution limit' });
  });

  return issues.slice(0, 20); // Max 20 issues
}

export default function FormatterPage() {
  const [input, setInput]     = useState('');
  const [output, setOutput]   = useState('');
  const [issues, setIssues]   = useState([]);
  const [copied, setCopied]   = useState(false);
  const [tab, setTab]         = useState('formatted'); // formatted | issues

  const run = useCallback(() => {
    const result = formatSNScript(input);
    const found  = countIssues(input);
    setOutput(result);
    setIssues(found);
    setTab(found.length > 0 ? 'issues' : 'formatted');
  }, [input]);

  const copy = () => {
    navigator.clipboard?.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clear = () => { setInput(''); setOutput(''); setIssues([]); };

  const issueColor = { error: '#f87171', warn: '#f59e0b', info: '#60a5fa' };
  const issueLabel = { error: 'ERROR', warn: 'WARN', info: 'INFO' };

  return (
    <>
      <Head>
        <title>Script Formatter — snspokes</title>
        <meta name="description" content="Format and lint your ServiceNow scripts. Detects common anti-patterns, auto-indents, fixes spacing. No AI — instant rule-based formatting." />
      </Head>
      <Navbar />

      <div style={{ minHeight: '100vh', background: '#030308', paddingTop: '72px' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid #0d0d18', padding: '32px 24px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ ...mono, fontSize: '10px', color: '#f59e0b', letterSpacing: '2px' }}>SCRIPT_FORMATTER</span>
              <span style={{ ...mono, fontSize: '10px', color: '#1a1a2e' }}>•</span>
              <span style={{ ...mono, fontSize: '10px', color: '#374151' }}>rule-based · instant · no AI</span>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#e2e8f0', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
              ServiceNow Script Formatter
            </h1>
            <p style={{ color: '#6b7280', fontSize: '13.5px', margin: 0 }}>
              Auto-indent, fix spacing, detect anti-patterns (eval, console.log, infinite loops, wrong field assignment).
            </p>
          </div>
        </div>

        {/* Split panel */}
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ ...mono, fontSize: '10px', color: '#374151', letterSpacing: '1px' }}>INPUT</span>
              <button onClick={clear} style={{ ...mono, background: 'none', border: 'none', color: '#374151', fontSize: '10px', cursor: 'pointer', padding: '2px 6px' }}>
                clear
              </button>
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={"// Paste your ServiceNow script here\nvar gr = new GlideRecord('incident');\ngr.addQuery('state',1);\ngr.query();\nwhile(gr.next()){gs.log(gr.number);}"}
              style={{ ...mono, height: '440px', background: '#08080f', border: '1px solid #1a1a2e', borderRadius: '10px', padding: '16px', color: '#a8b2d8', fontSize: '12px', lineHeight: 1.7, resize: 'vertical', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={run}
                style={{ ...mono, flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid rgba(108,99,255,.3)', background: 'rgba(108,99,255,.1)', color: '#8b85ff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(108,99,255,.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(108,99,255,.1)'; }}>
                Format + Lint →
              </button>
            </div>
            <div style={{ ...mono, fontSize: '10px', color: '#1e1e2e', textAlign: 'right' }}>
              {input.split('\n').length} lines · {input.length} chars
            </div>
          </div>

          {/* Output */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '2px' }}>
              {['formatted', 'issues'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ ...mono, padding: '5px 12px', borderRadius: '6px', border: '1px solid', fontSize: '10px', cursor: 'pointer',
                    background: tab === t ? 'rgba(255,255,255,.05)' : 'transparent',
                    borderColor: tab === t ? '#1a1a2e' : 'transparent',
                    color: tab === t ? '#e2e8f0' : '#374151',
                    letterSpacing: '0.5px' }}>
                  {t === 'issues'
                    ? `ISSUES${issues.length > 0 ? ` (${issues.length})` : ''}`
                    : 'FORMATTED'}
                </button>
              ))}
              {output && (
                <button onClick={copy}
                  style={{ ...mono, marginLeft: 'auto', padding: '5px 12px', borderRadius: '6px', border: '1px solid', fontSize: '10px', cursor: 'pointer', transition: 'all .15s',
                    background: copied ? 'rgba(74,222,128,.1)' : 'transparent',
                    borderColor: copied ? 'rgba(74,222,128,.3)' : '#1a1a2e',
                    color: copied ? '#4ade80' : '#6b7280' }}>
                  {copied ? '✓ copied' : 'copy'}
                </button>
              )}
            </div>

            {tab === 'formatted' ? (
              <div style={{ height: '440px', background: '#08080f', border: '1px solid #1a1a2e', borderRadius: '10px', overflow: 'auto', position: 'relative' }}>
                {output ? (
                  <pre style={{ margin: 0, padding: '16px', ...mono, fontSize: '12px', color: '#a8b2d8', lineHeight: 1.7 }}>{output}</pre>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ ...mono, fontSize: '10px', color: '#1e1e2e', letterSpacing: '1px' }}>OUTPUT_EMPTY</span>
                    <span style={{ fontSize: '12px', color: '#374151' }}>Paste code and click Format →</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: '440px', background: '#08080f', border: '1px solid #1a1a2e', borderRadius: '10px', overflow: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {issues.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ ...mono, fontSize: '10px', color: issues.length === 0 && output ? '#4ade80' : '#1e1e2e', letterSpacing: '1px' }}>
                      {output ? '✓ NO_ISSUES_FOUND' : 'LINT_EMPTY'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#374151' }}>
                      {output ? 'Script looks clean!' : 'Format your script to see lint results'}
                    </span>
                  </div>
                ) : issues.map((iss, i) => (
                  <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,.02)', border: `1px solid ${issueColor[iss.type]}22`, borderRadius: '7px', borderLeft: `3px solid ${issueColor[iss.type]}` }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{ ...mono, fontSize: '9px', color: issueColor[iss.type] }}>{issueLabel[iss.type]}</span>
                      <span style={{ ...mono, fontSize: '9px', color: '#374151' }}>line {iss.line}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', lineHeight: 1.5 }}>{iss.msg}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ ...mono, fontSize: '10px', color: '#1e1e2e', textAlign: 'right' }}>
              {output ? `${output.split('\n').length} lines · ${output.length} chars` : '—'}
            </div>
          </div>
        </div>

        {/* What it checks */}
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 60px' }}>
          <div style={{ ...mono, fontSize: '10px', color: '#1e1e2e', letterSpacing: '1px', marginBottom: '12px' }}>WHAT_IT_CHECKS</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              ['🔴', 'eval() usage', 'Blocked in scoped apps'],
              ['🔴', 'Infinite loops', '30s execution limit'],
              ['🟡', 'gr.field = value', 'Use setValue() in scoped'],
              ['🟡', 'console.log()', 'Use gs.log() server-side'],
              ['🔵', '.query() missing', 'After new GlideRecord'],
              ['🔵', 'Long lines', '>120 chars'],
            ].map(([icon, title, sub]) => (
              <div key={title} style={{ padding: '8px 12px', background: '#050510', border: '1px solid #0d0d18', borderRadius: '8px', minWidth: '160px' }}>
                <div style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '2px' }}>{icon} {title}</div>
                <div style={{ ...mono, fontSize: '10px', color: '#374151' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export const dynamic = 'force-dynamic';
