import amqplib, { Channel, Connection } from 'amqplib';
import { env } from './env.js';

export interface QueueJob<T = any> {
  id: string; // Idempotency key
  name: string;
  payload: T;
  timestamp: number;
  retries?: number;
}

type JobHandler = (job: QueueJob) => Promise<void>;

class QueueService {
  private connection: any = null;
  private channel: any = null;
  private isConnected = false;
  private handlers = new Map<string, JobHandler[]>();
  private inMemoryQueue: QueueJob[] = [];
  private processedIdempotencyKeys = new Set<string>();

  async connect(): Promise<boolean> {
    try {
      if (!env.LAVINMQ_URL) return false;
      
      const connectPromise = amqplib.connect(env.LAVINMQ_URL);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AMQP Connection Timeout (broker offline)')), 1500)
      );

      this.connection = (await Promise.race([connectPromise, timeoutPromise])) as any;
      this.channel = await this.connection.createChannel();
      this.isConnected = true;
      console.log('✅ Connected to LavinMQ / AMQP');

      // Setup Dead-Letter Exchange (DLX)
      await this.channel.assertExchange('yapr.dlx', 'direct', { durable: true });
      await this.channel.assertQueue('yapr.dead_letter', { durable: true });
      await this.channel.bindQueue('yapr.dead_letter', 'yapr.dlx', 'dead_letter_key');

      return true;
    } catch (err) {
      console.warn('⚠️ LavinMQ connection failed, operating with in-memory background worker runner:', (err as any).message);
      this.isConnected = false;
      return false;
    }
  }

  async publish<T>(queueName: string, job: Omit<QueueJob<T>, 'timestamp'>): Promise<boolean> {
    const fullJob: QueueJob<T> = {
      ...job,
      timestamp: Date.now(),
      retries: job.retries || 0,
    };

    if (this.isConnected && this.channel) {
      try {
        await this.channel.assertQueue(queueName, {
          durable: true,
          deadLetterExchange: 'yapr.dlx',
          deadLetterRoutingKey: 'dead_letter_key',
        });
        const buffer = Buffer.from(JSON.stringify(fullJob));
        return this.channel.sendToQueue(queueName, buffer, { persistent: true });
      } catch (err) {
        console.error(`Failed to publish job to LavinMQ queue ${queueName}:`, err);
      }
    }

    // In-Memory Fallback Execution
    console.log(`[Queue:in-memory] Enqueued job '${job.name}' (id: ${job.id}) in ${queueName}`);
    this.inMemoryQueue.push(fullJob);
    // Process asynchronously next tick
    setImmediate(() => this.processInMemoryJob(queueName, fullJob));
    return true;
  }

  async subscribe(queueName: string, handler: JobHandler): Promise<void> {
    if (!this.handlers.has(queueName)) {
      this.handlers.set(queueName, []);
    }
    this.handlers.get(queueName)!.push(handler);

    if (this.isConnected && this.channel) {
      await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.prefetch(5);
      this.channel.consume(queueName, async (msg: any) => {
        if (!msg) return;
        try {
          const job: QueueJob = JSON.parse(msg.content.toString());
          // Idempotency check
          if (this.processedIdempotencyKeys.has(job.id)) {
            this.channel?.ack(msg);
            return;
          }
          await handler(job);
          this.processedIdempotencyKeys.add(job.id);
          this.channel?.ack(msg);
        } catch (err) {
          console.error(`Error processing job from queue ${queueName}:`, err);
          // nack without requeue if retries exceeded -> sent to dead letter queue
          this.channel?.nack(msg, false, false);
        }
      });
    }
  }

  private async processInMemoryJob(queueName: string, job: QueueJob) {
    if (this.processedIdempotencyKeys.has(job.id)) return;
    const handlers = this.handlers.get(queueName) || [];
    for (const handler of handlers) {
      try {
        await handler(job);
        this.processedIdempotencyKeys.add(job.id);
      } catch (err) {
        console.error(`In-memory job ${job.name} execution error:`, err);
      }
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

export const queueService = new QueueService();
