import { query } from '../../../lib/db';
import { withTrace } from '../../../lib/requestTrace';
import { apiError } from '../../../lib/validate';
import { checkRateLimit } from '../../../lib/redis';
import { getClientIp, setSecurityHeaders } from '../../../lib/security';

const SN_VERSIONS = ['New York','Orlando','Paris','Quebec','Rome','San Diego','Tokyo','Utah','Vancouver','Washington','Xanadu','Yokohama'];

async function handler(req, res) {
  setSecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { q = '', type = '', version = '' } = req.query;
    try {
      const conditions = ['1=1'];
      const params = [];
      if (q.trim()) {
        params.push(`%${q.trim().toLowerCase()}%`);
        conditions.push(`(LOWER(feature_name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`);
      }
      if (type) { params.push(type); conditions.push(`feature_type = $${params.length}`); }

      const result = await query(
        `SELECT * FROM sn_version_matrix WHERE ${conditions.join(' AND ')} ORDER BY category, feature_name LIMIT 50`,
        params
      );

      return res.status(200).json({
        success: true,
        features: result.rows,
        versions: SN_VERSIONS,
        total: result.rows.length,
      });
    } catch (err) {
      // Fallback: return hardcoded version data when DB not ready
      const fallback = [
        { feature_name:'GlideRecord',feature_type:'api',description:'Core database API',category:'Platform',versions:{Rome:true,Tokyo:true,Utah:true,Vancouver:true,Washington:true,Xanadu:true,Yokohama:true}},
        { feature_name:'Flow Designer',feature_type:'feature',description:'Visual workflow builder',category:'Automation',versions:{Tokyo:true,Utah:true,Vancouver:true,Washington:true,Xanadu:true,Yokohama:true}},
        { feature_name:'IntegrationHub',feature_type:'feature',description:'Integration Hub for spokes',category:'Integration',versions:{Rome:true,Tokyo:true,Utah:true,Vancouver:true,Washington:true,Xanadu:true,Yokohama:true}},
        { feature_name:'Virtual Agent',feature_type:'feature',description:'AI chatbot for ITSM',category:'AI',versions:{Utah:true,Vancouver:true,Washington:true,Xanadu:true,Yokohama:true}},
        { feature_name:'Predictive Intelligence',feature_type:'feature',description:'ML-based ticket classification',category:'AI',versions:{Tokyo:true,Utah:true,Vancouver:true,Washington:true,Xanadu:true,Yokohama:true}},
        { feature_name:'App Engine Studio',feature_type:'feature',description:'Low-code app builder',category:'Platform',versions:{Vancouver:true,Washington:true,Xanadu:true,Yokohama:true}},
        { feature_name:'Next Experience',feature_type:'feature',description:'Modern UI framework (Polaris)',category:'UI',versions:{Utah:true,Vancouver:true,Washington:true,Xanadu:true,Yokohama:true}},
        { feature_name:'Workspace',feature_type:'feature',description:'Configurable agent workspace',category:'UI',versions:{Washington:true,Xanadu:true,Yokohama:true}},
      ];
      const filtered = fallback.filter(f => {
        if (q.trim() && !f.feature_name.toLowerCase().includes(q.trim().toLowerCase()) && !f.description.toLowerCase().includes(q.trim().toLowerCase())) return false;
        if (type && f.feature_type !== type) return false;
        return true;
      });
      return res.status(200).json({ success: true, features: filtered, versions: SN_VERSIONS, total: filtered.length, fallback: true });
    }
  }
  return apiError(res, 'Method not allowed', 405);
}

export default withTrace(handler);
