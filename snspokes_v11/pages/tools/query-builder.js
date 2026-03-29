import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import axios from 'axios';

const OPERATORS = [
  { value:'=', label:'equals' },
  { value:'!=', label:'not equals' },
  { value:'contains', label:'contains' },
  { value:'not_contains', label:'not contains' },
  { value:'starts_with', label:'starts with' },
  { value:'>', label:'greater than' },
  { value:'>=', label:'≥ greater or equal' },
  { value:'<', label:'less than' },
  { value:'<=', label:'≤ less or equal' },
  { value:'IN', label:'is one of (comma sep)' },
  { value:'NOT IN', label:'is not one of' },
  { value:'ISEMPTY', label:'is empty' },
  { value:'ISNOTEMPTY', label:'is not empty' },
];

const EMPTY_CONDITION = { field: '', operator: '=', value: '', logic: 'AND' };

export default function QueryBuilder() {
  const [tables, setTables] = useState([]);
  const [tableSearch, setTableSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState('incident');
  const [fields, setFields] = useState([]);
  const [stateValues, setStateValues] = useState({});
  const [conditions, setConditions] = useState([{ ...EMPTY_CONDITION }]);
  const [orderBy, setOrderBy] = useState('');
  const [orderDir, setOrderDir] = useState('DESC');
  const [limit, setLimit] = useState('10');
  const [useAggregate, setUseAggregate] = useState(false);
  const [output, setOutput] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('script'); // script | encoded | analysis
  const [popular, setPopular] = useState([]);

  useEffect(() => {
    axios.get('/api/tools/query-builder?action=tables').then(r => setTables(r.data.tables || []));
    axios.get('/api/tools/query-builder?action=popular').then(r => setPopular(r.data.queries || []));
  }, []);

  useEffect(() => {
    if (selectedTable) {
      axios.get(`/api/tools/query-builder?action=table_fields&table=${selectedTable}`)
        .then(r => { setFields(r.data.fields || []); setStateValues(r.data.state_values || {}); });
    }
  }, [selectedTable]);

  const build = useCallback(async () => {
    try {
      const res = await axios.post('/api/tools/query-builder', {
        action: 'build', tableName: selectedTable, conditions, orderBy, orderDir,
        limit: parseInt(limit) || 10, useAggregate,
      });
      setOutput(res.data);
      setAiResult(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Build failed');
    }
  }, [selectedTable, conditions, orderBy, orderDir, limit, useAggregate]);

  const aiOptimize = async () => {
    if (!output?.script) return;
    setAiLoading(true);
    try {
      const res = await axios.post('/api/tools/query-builder', {
        action: 'ai_optimize', tableName: selectedTable, script: output.script,
      });
      setAiResult(res.data);
      setTab('analysis');
    } catch (err) {
      alert('AI optimization failed');
    } finally { setAiLoading(false); }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addCondition = () => setConditions(c => [...c, { ...EMPTY_CONDITION }]);
  const removeCondition = (i) => setConditions(c => c.filter((_, idx) => idx !== i));
  const updateCondition = (i, key, val) => setConditions(c => c.map((cond, idx) => idx === i ? { ...cond, [key]: val } : cond));

  const filteredTables = tables.filter(t =>
    !tableSearch || t.table_name.toLowerCase().includes(tableSearch.toLowerCase()) || t.label?.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const inp = { padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#111827' };
  const lbl = { fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' };

  return (
    <>
      <Head>
        <title>GlideRecord Query Builder — snspokes</title>
        <meta name="description" content="Free ServiceNow GlideRecord query builder. Build optimized queries visually, get generated scripts instantly." />
      </Head>
      <Navbar />
      <div style={{ minHeight: '100vh', background: '#f8fafc', paddingTop: '24px', paddingBottom: '48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>

          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg,#6c63ff,#a855f7)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🔍</div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px' }}>GlideRecord Query Builder</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Build optimized ServiceNow queries visually. Get script + encoded query instantly. AI-powered analysis included.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' }}>

            {/* LEFT: Table selector */}
            <div>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Table</span>
                </div>
                <div style={{ padding: '10px' }}>
                  <input value={tableSearch} onChange={e => setTableSearch(e.target.value)} placeholder="Search tables..." style={{ ...inp, width: '100%', marginBottom: '8px' }} />
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {filteredTables.map(t => (
                      <div key={t.table_name} onClick={() => setSelectedTable(t.table_name)}
                        style={{ padding: '8px 10px', borderRadius: '7px', cursor: 'pointer', marginBottom: '2px', background: selectedTable === t.table_name ? '#ede9fe' : 'transparent', transition: 'background 0.1s' }}
                        onMouseEnter={e => { if (selectedTable !== t.table_name) e.currentTarget.style.background = '#f9fafb'; }}
                        onMouseLeave={e => { if (selectedTable !== t.table_name) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: selectedTable === t.table_name ? '600' : '400', color: selectedTable === t.table_name ? '#6c63ff' : '#111827' }}>{t.label || t.table_name}</div>
                        <code style={{ fontSize: '10px', color: '#9ca3af' }}>{t.table_name}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Popular queries */}
              {popular.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔥 Popular Queries</span>
                  </div>
                  <div style={{ padding: '8px' }}>
                    {popular.slice(0, 5).map(q => (
                      <div key={q.id} style={{ padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => { setSelectedTable(q.table_name); setOutput({ script: q.script, encoded_query: q.encoded_query }); }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>{q.name}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{q.table_name} · {q.use_count} uses</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Builder */}
            <div>
              {/* Conditions */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', marginBottom: '14px' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Conditions for <code style={{ background: '#ede9fe', color: '#7c3aed', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>{selectedTable}</code></span>
                  <button onClick={addCondition} style={{ padding: '5px 12px', background: '#6c63ff', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>+ Add</button>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  {conditions.map((cond, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: i > 0 ? '60px 1fr 140px 1fr 36px' : '1fr 140px 1fr 36px', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                      {i > 0 && (
                        <select value={cond.logic} onChange={e => updateCondition(i, 'logic', e.target.value)} style={{ ...inp, padding: '6px 8px' }}>
                          <option value="AND">AND</option>
                          <option value="OR">OR</option>
                        </select>
                      )}
                      {/* Field selector */}
                      <div>
                        {i === 0 && <label style={lbl}>Field</label>}
                        {fields.length > 0 ? (
                          <select style={inp} value={cond.field} onChange={e => updateCondition(i, 'field', e.target.value)}>
                            <option value="">Select field...</option>
                            {fields.map(f => <option key={f.name} value={f.name}>{f.label} ({f.name})</option>)}
                          </select>
                        ) : (
                          <input style={inp} value={cond.field} onChange={e => updateCondition(i, 'field', e.target.value)} placeholder="field_name" />
                        )}
                      </div>
                      {/* Operator */}
                      <div>
                        {i === 0 && <label style={lbl}>Operator</label>}
                        <select style={inp} value={cond.operator} onChange={e => updateCondition(i, 'operator', e.target.value)}>
                          {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                      </div>
                      {/* Value */}
                      <div>
                        {i === 0 && <label style={lbl}>Value</label>}
                        {cond.operator !== 'ISEMPTY' && cond.operator !== 'ISNOTEMPTY' ? (
                          stateValues[cond.field] ? (
                            <select style={inp} value={cond.value} onChange={e => updateCondition(i, 'value', e.target.value)}>
                              <option value="">Select...</option>
                              {Object.entries(stateValues[cond.field]).map(([v, l]) => <option key={v} value={v}>{l} ({v})</option>)}
                            </select>
                          ) : (
                            <input style={inp} value={cond.value} onChange={e => updateCondition(i, 'value', e.target.value)} placeholder="value" />
                          )
                        ) : <div style={{ ...inp, background: '#f9fafb', color: '#9ca3af' }}>—</div>}
                      </div>
                      <button onClick={() => removeCondition(i)} disabled={conditions.length === 1} style={{ padding: '7px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#ef4444', cursor: conditions.length === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: conditions.length === 1 ? 0.4 : 1, marginTop: i === 0 ? '16px' : 0 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 1fr', gap: '12px', alignItems: 'end' }}>
                  <div>
                    <label style={lbl}>Order By</label>
                    {fields.length > 0 ? (
                      <select style={inp} value={orderBy} onChange={e => setOrderBy(e.target.value)}>
                        <option value="">None</option>
                        {fields.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                      </select>
                    ) : <input style={inp} value={orderBy} onChange={e => setOrderBy(e.target.value)} placeholder="field_name" />}
                  </div>
                  <div>
                    <label style={lbl}>Direction</label>
                    <select style={inp} value={orderDir} onChange={e => setOrderDir(e.target.value)}>
                      <option value="DESC">Descending</option>
                      <option value="ASC">Ascending</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Limit</label>
                    <input style={inp} type="number" value={limit} onChange={e => setLimit(e.target.value)} min="1" max="10000" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '16px' }}>
                    <input type="checkbox" id="aggregate" checked={useAggregate} onChange={e => setUseAggregate(e.target.checked)} style={{ width: '15px', height: '15px', cursor: 'pointer' }} />
                    <label htmlFor="aggregate" style={{ fontSize: '13px', color: '#374151', cursor: 'pointer' }}>Use GlideAggregate (COUNT)</label>
                  </div>
                </div>
              </div>

              {/* Build button */}
              <button onClick={build} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#6c63ff,#a855f7)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '16px', letterSpacing: '-0.2px' }}>
                ⚡ Generate Query
              </button>

              {/* Output */}
              {output && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                  {/* Warnings */}
                  {output.warnings?.length > 0 && (
                    <div style={{ padding: '12px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                      {output.warnings.map((w, i) => <div key={i} style={{ fontSize: '12px', color: '#92400e', marginBottom: i < output.warnings.length - 1 ? '4px' : 0 }}>{w}</div>)}
                    </div>
                  )}

                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e5e7eb', padding: '0 16px' }}>
                    {['script', 'encoded', 'analysis'].map(t => (
                      <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#6c63ff' : 'transparent'}`, color: tab === t ? '#6c63ff' : '#6b7280', fontSize: '13px', fontWeight: tab === t ? '600' : '400', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '-1px', textTransform: 'capitalize' }}>
                        {t === 'script' ? '📄 Script' : t === 'encoded' ? '🔗 Encoded Query' : '🤖 AI Analysis'}
                      </button>
                    ))}
                  </div>

                  <div style={{ padding: '16px' }}>
                    {tab === 'script' && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '10px' }}>
                          <button onClick={() => copy(output.script)} style={{ padding: '5px 14px', background: copied ? '#f0fdf4' : '#f9fafb', border: `1px solid ${copied ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: '6px', fontSize: '12px', color: copied ? '#16a34a' : '#374151', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>
                            {copied ? '✅ Copied!' : '📋 Copy'}
                          </button>
                          <button onClick={aiOptimize} disabled={aiLoading} style={{ padding: '5px 14px', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '6px', fontSize: '12px', color: '#7c3aed', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>
                            {aiLoading ? '⏳ Analyzing...' : '🤖 AI Optimize'}
                          </button>
                        </div>
                        <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', overflowX: 'auto', lineHeight: '1.7', margin: 0 }}>{output.script}</pre>
                      </>
                    )}

                    {tab === 'encoded' && (
                      <>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>Use this in list filters, URL parameters, or addEncodedQuery():</p>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', justifyContent: 'flex-end' }}>
                          <button onClick={() => copy(output.encoded_query)} style={{ padding: '5px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>📋 Copy</button>
                        </div>
                        <div style={{ background: '#0f172a', color: '#86efac', padding: '16px', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', wordBreak: 'break-all', lineHeight: '1.7' }}>
                          {output.encoded_query || '(no conditions — all records)'}
                        </div>
                        <div style={{ marginTop: '14px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                          <p style={{ fontSize: '12px', fontWeight: '600', color: '#15803d', marginBottom: '5px' }}>Usage in script:</p>
                          <pre style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#166534', margin: 0 }}>{`gr.addEncodedQuery('${output.encoded_query}');`}</pre>
                        </div>
                      </>
                    )}

                    {tab === 'analysis' && (
                      <div>
                        {output.analysis && (
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                              <div style={{ fontSize: '24px', fontWeight: '700', color: output.analysis.score >= 80 ? '#16a34a' : output.analysis.score >= 50 ? '#d97706' : '#dc2626' }}>{output.analysis.score}</div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Query Score</div>
                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>Based on performance best practices</div>
                              </div>
                            </div>
                            {output.analysis.issues?.map((issue, i) => (
                              <div key={i} style={{ padding: '8px 12px', marginBottom: '6px', borderRadius: '7px', background: issue.severity === 'error' ? '#fef2f2' : issue.severity === 'warning' ? '#fffbeb' : '#f0f9ff', border: `1px solid ${issue.severity === 'error' ? '#fecaca' : issue.severity === 'warning' ? '#fde68a' : '#bae6fd'}`, fontSize: '12px', color: issue.severity === 'error' ? '#dc2626' : issue.severity === 'warning' ? '#92400e' : '#0369a1' }}>
                                {issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'} {issue.message}
                              </div>
                            ))}
                            {output.analysis.suggestions?.map((s, i) => (
                              <div key={i} style={{ padding: '8px 12px', marginBottom: '6px', borderRadius: '7px', background: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: '12px', color: '#7c3aed' }}>💡 {s}</div>
                            ))}
                          </div>
                        )}
                        {aiResult && (
                          <div>
                            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '10px' }}>🤖 AI Optimization</h4>
                            {aiResult.issues?.map((issue, i) => (
                              <div key={i} style={{ padding: '7px 12px', marginBottom: '5px', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a', fontSize: '12px', color: '#92400e' }}>
                                ⚠️ {issue.message}
                              </div>
                            ))}
                            {aiResult.explanation && <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', marginBottom: '12px' }}>{aiResult.explanation}</p>}
                            {aiResult.optimized_script && aiResult.optimized_script !== output.script && (
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Optimized Script:</div>
                                <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '14px', borderRadius: '8px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', overflowX: 'auto', margin: 0 }}>{aiResult.optimized_script}</pre>
                                <button onClick={() => setOutput(o => ({ ...o, script: aiResult.optimized_script }))} style={{ marginTop: '8px', padding: '6px 14px', background: '#6c63ff', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>Use This Version</button>
                              </div>
                            )}
                            {aiResult.tips?.map((tip, i) => (
                              <div key={i} style={{ padding: '7px 12px', marginTop: '6px', borderRadius: '6px', background: '#f5f3ff', border: '1px solid #ddd6fe', fontSize: '12px', color: '#7c3aed' }}>💡 {tip}</div>
                            ))}
                          </div>
                        )}
                        {!aiResult && !output.analysis?.issues?.length && (
                          <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                            <p style={{ marginBottom: '12px', fontSize: '13px' }}>Click "AI Optimize" on the Script tab for detailed analysis</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
