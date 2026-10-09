import { queueService } from '../config/queue.js';
import { registerEmailWorker } from './email.worker.js';
import { registerNotificationWorker } from './notification.worker.js';
import { registerSummaryWorker } from './summary.worker.js';

export async function initWorkers(): Promise<void> {
  console.log('👷 Initializing Yapr Async Workers...');
  await queueService.connect();

  registerEmailWorker();
  registerNotificationWorker();
  registerSummaryWorker();

  console.log('✅ All workers listening for queue jobs');
}

// If executed directly: npm run worker
if (process.argv[1]?.endsWith('workers/index.ts') || process.argv[1]?.endsWith('workers/index.js')) {
  initWorkers().catch((err) => {
    console.error('Fatal worker initialization error:', err);
    process.exit(1);
  });
}
