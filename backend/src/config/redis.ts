import { Redis as UpstashRedis } from '@upstash/redis';
import Redis from 'ioredis';
import { env } from './env.js';

export interface ICacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, exSeconds?: number): Promise<'OK' | null>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrevrangeWithScores(key: string, start: number, stop: number): Promise<Array<{ member: string; score: number }>>;
  zincrby(key: string, increment: number, member: string): Promise<number>;
}

// In-Memory fallback implementation
class MemoryCacheClient implements ICacheClient {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private zsets = new Map<string, Map<string, number>>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, exSeconds?: number): Promise<'OK'> {
    this.store.set(key, {
      value,
      expiresAt: exSeconds ? Date.now() + exSeconds * 1000 : undefined,
    });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const deleted = this.store.delete(key) || this.zsets.delete(key);
    return deleted ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const currentStr = await this.get(key);
    const newVal = (parseInt(currentStr || '0', 10) + 1);
    await this.set(key, newVal.toString());
    return newVal;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }
    return 0;
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.zsets.has(key)) {
      this.zsets.set(key, new Map());
    }
    this.zsets.get(key)!.set(member, score);
    return 1;
  }

  async zincrby(key: string, increment: number, member: string): Promise<number> {
    if (!this.zsets.has(key)) {
      this.zsets.set(key, new Map());
    }
    const set = this.zsets.get(key)!;
    const current = set.get(member) || 0;
    const next = current + increment;
    set.set(member, next);
    return next;
  }

  async zrevrangeWithScores(key: string, start: number, stop: number): Promise<Array<{ member: string; score: number }>> {
    const set = this.zsets.get(key);
    if (!set) return [];
    const entries = Array.from(set.entries())
      .map(([member, score]) => ({ member, score }))
      .sort((a, b) => b.score - a.score);
    return entries.slice(start, stop === -1 ? undefined : stop + 1);
  }
}

// Wrapper for Upstash REST
class UpstashWrapper implements ICacheClient {
  private client: UpstashRedis;
  constructor(client: UpstashRedis) {
    this.client = client;
  }
  async get(key: string) {
    const val = await this.client.get<string>(key);
    return typeof val === 'string' ? val : (val ? JSON.stringify(val) : null);
  }
  async set(key: string, value: string, exSeconds?: number) {
    if (exSeconds) {
      await this.client.set(key, value, { ex: exSeconds });
    } else {
      await this.client.set(key, value);
    }
    return 'OK' as const;
  }
  async del(key: string) {
    return await this.client.del(key);
  }
  async incr(key: string) {
    return await this.client.incr(key);
  }
  async expire(key: string, seconds: number) {
    return await this.client.expire(key, seconds);
  }
  async zadd(key: string, score: number, member: string): Promise<number> {
    const res = await this.client.zadd(key, { score, member });
    return (res ?? 0) as number;
  }
  async zincrby(key: string, increment: number, member: string) {
    return await this.client.zincrby(key, increment, member);
  }
  async zrevrangeWithScores(key: string, start: number, stop: number) {
    const res = await this.client.zrange(key, start, stop, { rev: true, withScores: true });
    const formatted: Array<{ member: string; score: number }> = [];
    for (let i = 0; i < res.length; i += 2) {
      formatted.push({ member: String(res[i]), score: Number(res[i + 1]) });
    }
    return formatted;
  }
}

// Factory to initialize cache client
let cacheClient: ICacheClient;

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const upstash = new UpstashRedis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    cacheClient = new UpstashWrapper(upstash);
    console.log('✅ Connected to Upstash Redis (REST)');
  } catch (err) {
    console.warn('⚠️ Upstash init failed, falling back to Memory cache:', err);
    cacheClient = new MemoryCacheClient();
  }
} else if (env.REDIS_URL && !env.REDIS_URL.includes('localhost')) {
  try {
    const redis = new Redis(env.REDIS_URL, { lazyConnect: true });
    // basic wrapper
    cacheClient = {
      get: (k) => redis.get(k),
      set: async (k, v, ex) => {
        if (ex) await redis.set(k, v, 'EX', ex);
        else await redis.set(k, v);
        return 'OK';
      },
      del: (k) => redis.del(k),
      incr: (k) => redis.incr(k),
      expire: (k, s) => redis.expire(k, s),
      zadd: (k, s, m) => redis.zadd(k, s, m),
      zincrby: async (k, inc, m) => {
        const res = await redis.zincrby(k, inc, m);
        return parseFloat(res);
      },
      zrevrangeWithScores: async (k, start, stop) => {
        const raw = await redis.zrevrange(k, start, stop, 'WITHSCORES');
        const list: Array<{ member: string; score: number }> = [];
        for (let i = 0; i < raw.length; i += 2) {
          list.push({ member: raw[i], score: parseFloat(raw[i + 1]) });
        }
        return list;
      },
    };
    console.log('✅ Connected to standard Redis');
  } catch {
    cacheClient = new MemoryCacheClient();
  }
} else {
  console.log('ℹ️ Redis not configured or using local in-memory cache.');
  cacheClient = new MemoryCacheClient();
}

export { cacheClient };
