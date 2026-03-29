// Queue system - gracefully disabled when Redis unavailable
let Queue = null;
let searchQueue = null;
let aiQueue = null;

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  connectTimeout: 3000,
  retryStrategy: () => null,
};

async function getQueue(name) {
  try {
    if (!Queue) {
      const { Queue: BullQueue } = await import('bullmq');
      Queue = BullQueue;
    }
    return new Queue(name, { connection, defaultJobOptions: { removeOnComplete: 50, removeOnFail: 25, attempts: 2 } });
  } catch { return null; }
}

export async function addSearchJob(data) {
  try {
    const q = await getQueue('search-pipeline');
    if (!q) return { queued: false, reason: 'Queue unavailable' };
    const job = await q.add('search', data);
    return { queued: true, jobId: job.id };
  } catch { return { queued: false }; }
}

export async function getQueueStats() {
  try {
    const sq = await getQueue('search-pipeline');
    const aq = await getQueue('ai-pipeline');
    if (!sq || !aq) return null;
    const [sW, sA, sC, sF, aW, aA] = await Promise.all([
      sq.getWaitingCount(), sq.getActiveCount(), sq.getCompletedCount(), sq.getFailedCount(),
      aq.getWaitingCount(), aq.getActiveCount(),
    ]);
    return { search: { waiting: sW, active: sA, completed: sC, failed: sF }, ai: { waiting: aW, active: aA } };
  } catch { return null; }
}
