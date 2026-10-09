import { queueService, QueueJob } from '../config/queue.js';
import { aiService } from '../modules/ai/ai.service.js';
import { env } from '../config/env.js';

export function registerSummaryWorker(): void {
  queueService.subscribe(env.AMQP_QUEUE_AI_SUMMARY || 'yapr.ai.summary', async (job: QueueJob) => {
    const { yapId, body } = job.payload;
    console.log(`🤖 [AI Worker] Generating async summary for Yap ${yapId}...`);

    try {
      const result = await aiService.summarize(yapId, body);
      console.log(`✨ [AI Worker] Summary created via ${result.provider}: "${result.summary.slice(0, 50)}..."`);
    } catch (err) {
      console.error(`❌ [AI Worker] Failed to summarize Yap ${yapId}:`, err);
    }
  });
}
