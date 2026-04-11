import { withAdminAuth } from '../../../lib/adminAuth';
import { query } from '../../../lib/db';
import { setSecurityHeaders } from '../../../lib/security';

const DEFAULT_FLAGS = [
  { key:'terminal_mode',    label:'Terminal Mode UI',        description:'Enable terminal aesthetic on homepage and search', enabled:true,  rollout_pct:100 },
  { key:'memory_system',    label:'Memory System',           description:'Auto-save user searches and results',              enabled:true,  rollout_pct:100 },
  { key:'ai_answers',       label:'AI Answers in Search',    description:'Show AI-generated answers on search results',      enabled:true,  rollout_pct:100 },
  { key:'stream_responses', label:'Streaming AI Responses',  description:'Stream AI answers word by word',                   enabled:true,  rollout_pct:100 },
  { key:'chatbot',          label:'Chatbot Widget',          description:'Show floating chatbot button on all pages',        enabled:false, rollout_pct:100 },
  { key:'glitch_effects',   label:'Glitch Effects',          description:'Subtle glitch animations on key interactions',     enabled:true,  rollout_pct:100 },
  { key:'command_palette',  label:'Command Palette (⌘K)',    description:'Enable Ctrl+K command palette globally',           enabled:true,  rollout_pct:100 },
];

async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let created = 0, skipped = 0;
  for (const flag of DEFAULT_FLAGS) {
    try {
      await query(
        `INSERT INTO sn_feature_flags (key, label, description, enabled, rollout_pct, environment)
         VALUES ($1,$2,$3,$4,$5,'all')
         ON CONFLICT (key) DO NOTHING`,
        [flag.key, flag.label, flag.description, flag.enabled, flag.rollout_pct]
      );
      created++;
    } catch { skipped++; }
  }
  return res.status(200).json({ success: true, created, skipped, total: DEFAULT_FLAGS.length });
}

export default withAdminAuth(handler);
