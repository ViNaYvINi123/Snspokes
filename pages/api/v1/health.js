import { healthCheck } from '../../../lib/db';
import { isRedisAvailable } from '../../../lib/redis';
import { getAIStats } from '../../../lib/ai';

async function handler(req, res) {
  const db = await healthCheck().catch(() => ({ healthy: false }));
  const redis = isRedisAvailable();
  const ai = getAIStats();

  return res.status(200).json({
    data: {
      status: db.healthy ? 'ok' : 'degraded',
      services: { database: db.healthy, redis, ai_providers: ai.configured_providers },
      ai: { providers: ai.all_providers, total_calls: ai.total_calls, current_rotation: ai.current_provider_index },
      version: '1.0.0',
    },
  });
}
export default withAPIGateway(handler, { cacheTTL: 10 });
