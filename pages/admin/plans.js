import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { withAdminPage } from '../../lib/adminAuth';

function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchPlans(); }, []);

  async function fetchPlans() {
    const r = await fetch('/api/admin/plans', { headers: { 'x-admin-token': getAdminToken() } });
    const d = await r.json();
    if (d.success) setPlans(d.plans || []);
    setLoading(false);
  }

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  async function updatePlan(id, field, value) {
    const r = await fetch('/api/admin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() },
      body: JSON.stringify({ id, field, value, action: 'update' }),
    });
    const d = await r.json();
    if (d.success) { showToast('Plan updated!'); fetchPlans(); }
    else showToast(d.error || 'Failed', 'error');
  }

  const PLAN_DEFAULTS = [
    { id: 'free',       name: 'Free',       price: 0,    searches: 50,   ai_calls: 10,   api_calls: 0 },
    { id: 'pro',        name: 'Pro',        price: 999,  searches: 2000, ai_calls: 100,  api_calls: 10000 },
    { id: 'enterprise', name: 'Enterprise', price: 4999, searches: 99999,ai_calls: 999,  api_calls: 99999 },
  ];

  return (
    <AdminLayout title="Plans Management">
      {toast && <div style={{ position:'fixed', top:'16px', right:'16px', zIndex:50, padding:'12px 20px', borderRadius:'12px', fontSize:'13px', fontWeight:'600', boxShadow:'0 10px 25px rgba(0,0,0,0.3)', background: toast.type === 'success' ? '#16a34a' : '#dc2626', color:'#fff' }}>{toast.msg}</div>}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Plans & Pricing</h1>
        <div className="grid md:grid-cols-3 gap-6">
          {PLAN_DEFAULTS.map(plan => (
            <div key={plan.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 capitalize">{plan.name}</h2>
              <div className="space-y-3">
                {[
                  { label: 'Price (₹/mo)', key: 'price', value: plan.price },
                  { label: 'Searches/day', key: 'searches', value: plan.searches },
                  { label: 'AI calls/day', key: 'ai_calls', value: plan.ai_calls },
                  { label: 'API calls/day', key: 'api_calls', value: plan.api_calls },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
                    <input type="number" defaultValue={f.value}
                      onBlur={e => updatePlan(plan.id, f.key, e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-yellow-300 text-sm">⚠️ Changing limits here updates the in-app display. To change Razorpay pricing, update PLAN_PRICES in <code>pages/api/payment.js</code> and rebuild.</p>
        </div>
      </div>
    </AdminLayout>
  );
}

export default withAdminPage(PlansPage);

export const getServerSideProps = async () => ({ props: {} });
