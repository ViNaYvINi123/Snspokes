import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, yearlyPrice: 0, color: 'gray',
    description: 'Perfect for exploring ServiceNow integrations',
    features: [
      '50 spoke searches/day',
      '10 AI code generations/day',
      'Script linter (static rules)',
      'Error encyclopedia',
      'Version matrix',
      'Community support',
    ],
    cta: 'Get Started Free', ctaLink: '/register',
  },
  {
    id: 'pro', name: 'Pro', price: 999, yearlyPrice: 799, color: 'purple', popular: true,
    description: 'For serious ServiceNow developers',
    features: [
      'Unlimited spoke searches',
      '100 AI code generations/day',
      'AI script review (deep)',
      'API key access',
      'Saved queries & history',
      'Bookmark spokes',
      'Email notifications',
      'Priority support',
      'Early access to new tools',
    ],
    cta: 'Start Pro', ctaLink: '/register?plan=pro',
  },
];

const FAQ = [
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel anytime from your dashboard. No questions asked. You keep access until the end of your billing period.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit/debit cards, UPI, and net banking via Razorpay.' },
  { q: 'Is there a free trial for Pro?', a: 'Yes! New users get a 7-day Pro trial automatically after signup. No credit card required.' },
  { q: 'What counts as an AI generation?', a: 'Each code generation, AI error analysis, or deep script review counts as one generation.' },
  { q: 'Can I upgrade/downgrade anytime?', a: 'Yes. Upgrades take effect immediately. Downgrades apply at next billing cycle.' },
  { q: 'Do you offer student or startup discounts?', a: 'Yes! Email us at support@snspokes.com with proof and we\'ll give you 50% off Pro.' },
];

export default function Pricing() {
  const { data: session } = useSession();
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <>
      <Head>
        <title>Pricing — snspokes | ServiceNow Integration Hub</title>
        <meta name="description" content="Simple, transparent pricing for ServiceNow developers. Start free, upgrade when you need more." />
      </Head>
      <Navbar />
      <div className="min-h-screen bg-gray-950 text-white pt-20 pb-24">
        <div className="max-w-6xl mx-auto px-4">

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, <span className="text-purple-400">transparent</span> pricing
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Start free. Upgrade when you need more AI power, API access, or more power.
            </p>
            {/* Yearly toggle */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <span className={`text-sm ${!yearly ? 'text-white' : 'text-gray-500'}`}>Monthly</span>
              <button onClick={() => setYearly(!yearly)}
                className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-purple-600' : 'bg-gray-700'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${yearly ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm ${yearly ? 'text-white' : 'text-gray-500'}`}>
                Yearly <span className="text-green-400 font-semibold ml-1">Save 20%</span>
              </span>
            </div>
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {/* responsive grid */ PLANS.map(plan => (
              <div key={plan.id} className={`relative bg-gray-900 rounded-2xl p-8 border transition-all
                ${plan.popular ? 'border-purple-500 shadow-lg shadow-purple-500/20 scale-105' : 'border-gray-800 hover:border-gray-700'}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-1">{plan.name}</h2>
                  <p className="text-gray-400 text-sm">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">
                      {plan.price === 0 ? 'Free' : `₹${yearly ? plan.yearlyPrice : plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-gray-400 text-sm mb-1">/month</span>}
                  </div>
                  {plan.price > 0 && yearly && (
                    <p className="text-green-400 text-xs mt-1">Billed ₹{plan.yearlyPrice * 12}/year</p>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-green-400 mt-0.5 shrink-0">✓</span>{f}
                    </li>
                  ))}
                </ul>
                {session?.user?.plan === plan.id
                  ? <div className="w-full text-center py-3 rounded-xl bg-gray-800 text-gray-400 text-sm font-medium">Current Plan</div>
                  : <Link href={plan.price === 0 ? plan.ctaLink : `${plan.ctaLink}${yearly ? '&billing=yearly' : ''}`}
                      className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all
                        ${plan.popular ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}>
                      {plan.cta}
                    </Link>
                }
              </div>
            ))}
          </div>

          {/* Feature comparison table */}
          <div className="mb-16 overflow-x-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Full Feature Comparison</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 text-gray-400 font-normal w-1/2">Feature</th>
                  {/* responsive grid */ PLANS.map(p => <th key={p.id} className={`py-3 font-semibold ${p.popular ? 'text-purple-400' : 'text-gray-300'}`}>{p.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Spoke searches/day', '50', 'Unlimited', 'Unlimited'],
                  ['AI code generations/day', '10', '100', 'Unlimited'],
                  ['Script linter', '✓', '✓', '✓'],
                  ['AI deep review', '✗', '✓', '✓'],
                  ['Error encyclopedia', '✓', '✓', '✓'],
                  ['Saved queries', '✗', '✓', '✓'],
                  ['API key access', '✗', '✓', '✓'],
                  ['Webhook notifications', '✗', '✗', '✓'],
                  ['SLA guarantee', '✗', '✗', '99.9%'],
                  ['Support', 'Community', 'Priority email', 'Dedicated Slack'],
                ].map(([feat, ...vals]) => (
                  <tr key={feat} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="py-3 text-gray-300">{feat}</td>
                    {vals.map((v, i) => (
                      <td key={i} className={`py-3 text-center ${v === '✗' ? 'text-gray-600' : v === '✓' ? 'text-green-400' : 'text-gray-300'}`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Referral banner */}
          <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-2xl p-8 text-center mb-16">
            <div className="text-3xl mb-3">🎁</div>
            <h3 className="text-xl font-bold mb-2">Refer a developer, get 1 month free</h3>
            <p className="text-gray-400 mb-4">Share your referral link. When they upgrade to Pro, you both get a free month.</p>
            {session ? (
              <Link href="/dashboard?tab=referral" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm font-medium">Get Your Referral Link</Link>
            ) : (
              <Link href="/register" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm font-medium">Sign Up to Get Link</Link>
            )}
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors">
                    <span className="font-medium text-white">{item.q}</span>
                    <span className={`text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-4 text-gray-400 text-sm leading-relaxed">{item.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}
