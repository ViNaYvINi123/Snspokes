import { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import axios from 'axios';

const VERSIONS = ['Tokyo','Utah','Vancouver','Washington','Xanadu','Yokohama'];
const ALL_VERSIONS = ['New York','Orlando','Paris','Quebec','Rome','San Diego','Tokyo','Utah','Vancouver','Washington','Xanadu','Yokohama'];
const STATUS_STYLE = {
  ga:            { bg: '#052e16', color: '#16a34a', border: '#bbf7d0', label: 'GA' },
  beta:          { bg: '#0a1628', color: '#2563eb', border: '#bfdbfe', label: 'Beta' },
  deprecated:    { bg: '#2d0a0a', color: '#dc2626', border: '#fecaca', label: 'Deprecated' },
  not_available: { bg: '#1a1a2e', color: '#6b6b8a', border: '#e5e7eb', label: 'N/A' },
  removed:       { bg: '#2d0a0a', color: '#ef4444', border: '#fecaca', label: 'Removed' },
};

function StatusBadge({ status, notes }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.not_available;
  return (
    <div title={notes || ''} style={{ padding: '3px 8px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '6px', fontSize: '11px', fontWeight: '700', color: s.color, cursor: notes ? 'help' : 'default', textAlign: 'center', whiteSpace: 'nowrap' }}>
      {s.label}
    </div>
  );
}

export default function VersionMatrix() {
  const [features, setFeatures] = useState([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);
  const displayVersions = showAllVersions ? ALL_VERSIONS : VERSIONS;

  const search = async (q = query, t = type) => {
    setLoading(true);
    try {
      const res = await axios.get('/api/tools/version-matrix', { params: { q, type: t } });
      setFeatures(res.data.features || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { search('', ''); }, []);

  return (
    <>
      <Head>
        <title>ServiceNow Version Matrix — snspokes</title>
        <meta name="description" content="Track ServiceNow feature availability across versions Tokyo, Utah, Vancouver, Washington, Xanadu, Yokohama." />
      </Head>
      <Navbar />
      <div style={{ minHeight: '100vh', background: '#0a0a0f', paddingTop: '24px', paddingBottom: '48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg,#0ea5e9,#6c63ff)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📊</div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#e2e8f0', letterSpacing: '-0.5px' }}>ServiceNow Version Matrix</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#6b6b8a' }}>Track API availability, feature status, and breaking changes across all ServiceNow releases.</p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '200px', display: 'flex', gap: '8px', padding: '8px 14px', background: '#111827', border: '1px solid #1e1e2e', borderRadius: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={query} onChange={e => { setQuery(e.target.value); setTimeout(() => search(e.target.value, type), 400); }} placeholder="Search features, APIs, methods..." style={{ border: 'none', outline: 'none', fontSize: '13px', fontFamily: 'inherit', flex: 1 }} />
            </div>
            {['', 'api', 'feature', 'method', 'plugin', 'table'].map(t => (
              <button key={t} onClick={() => { setType(t); search(query, t); }}
                style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '500', background: type === t ? '#6c63ff22' : '#0f0f1a', borderColor: type === t ? '#6c63ff' : '#1e1e2e', color: type === t ? '#8b85ff' : '#9999bb', transition: 'all 0.12s' }}>
                {t || 'All Types'}
              </button>
            ))}
            <button onClick={() => setShowAllVersions(v => !v)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #1e1e2e', background: '#111827', fontSize: '12px', color: '#6b6b8a', cursor: 'pointer', fontFamily: 'inherit' }}>
              {showAllVersions ? 'Recent Versions' : 'All Versions'}
            </button>
          </div>

          {/* Matrix Table */}
          <div style={{ background: '#111827', border: '1px solid #1e1e2e', borderRadius: '12px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: '#0a0a0f', borderBottom: '1px solid #1e1e2e' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#9999bb', fontSize: '12px', position: 'sticky', left: 0, background: '#0a0a0f', minWidth: '220px', zIndex: 1 }}>Feature / API</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: '700', color: '#9999bb', fontSize: '12px', minWidth: '80px' }}>Type</th>
                  {displayVersions.map(v => (
                    <th key={v} style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '700', color: '#9999bb', fontSize: '12px', minWidth: '90px', borderLeft: '1px solid #f3f4f6' }}>{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={displayVersions.length + 2} style={{ padding: '40px', textAlign: 'center', color: '#6b6b8a' }}>Loading version data...</td></tr>
                ) : features.length === 0 ? (
                  <tr><td colSpan={displayVersions.length + 2} style={{ padding: '40px', textAlign: 'center', color: '#6b6b8a' }}>No features found</td></tr>
                ) : features.map(feat => {
                  const versions = feat.versions || {};
                  return (
                    <tr key={feat.id} style={{ borderBottom: '1px solid #f9fafb' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#1a1a2e'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', position: 'sticky', left: 0, background: '#111827', zIndex: 1, borderRight: '1px solid #1e1e2e' }}>
                        <div style={{ fontWeight: '600', color: '#e2e8f0', marginBottom: '2px' }}>{feat.feature_name}</div>
                        {feat.description && <div style={{ fontSize: '11px', color: '#6b6b8a', lineHeight: '1.4' }}>{feat.description.substring(0, 60)}</div>}
                        {feat.tags?.slice(0,2).map(t => <span key={t} style={{ fontSize: '10px', padding: '1px 5px', background: '#111122', borderRadius: '3px', color: '#6b6b8a', marginRight: '3px' }}>{t}</span>)}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', background: '#ede9fe', color: '#7c3aed', borderRadius: '4px', fontWeight: '600' }}>{feat.feature_type}</span>
                      </td>
                      {displayVersions.map(v => {
                        const vData = versions[v];
                        return (
                          <td key={v} style={{ padding: '10px', textAlign: 'center', borderLeft: '1px solid #f3f4f6' }}>
                            {vData ? <StatusBadge status={vData.status} notes={vData.notes} /> : <span style={{ color: '#e5e7eb', fontSize: '12px' }}>—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap' }}>
            {Object.entries(STATUS_STYLE).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ padding: '2px 8px', background: v.bg, border: `1px solid ${v.border}`, borderRadius: '4px', fontSize: '10px', fontWeight: '700', color: v.color }}>{v.label}</div>
                <span style={{ fontSize: '11px', color: '#6b6b8a', textTransform: 'capitalize' }}>{k.replace('_', ' ')}</span>
              </div>
            ))}
            <span style={{ fontSize: '11px', color: '#6b6b8a', marginLeft: 'auto' }}>Hover on badge for details</span>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
