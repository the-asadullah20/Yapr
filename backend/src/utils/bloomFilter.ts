import { cacheClient } from '../config/redis.js';

/**
 * Bloom Filter for fast username availability pre-checks.
 * Guarantees zero false negatives: if it says "free", the username is 100% free!
 * If it says "taken", we check Postgres unique index as source of truth.
 */
export class UsernameBloomFilter {
  private size = 100000;
  private hashCount = 4;
  private redisPrefix = 'yapr:bloom:usernames';

  // Murmur-style fast hash
  private getHashes(key: string): number[] {
    const clean = key.toLowerCase().trim();
    const hashes: number[] = [];
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;

    for (let i = 0; i < clean.length; i++) {
      const ch = clean.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    for (let i = 0; i < this.hashCount; i++) {
      const combined = Math.abs((h1 + i * h2) % this.size);
      hashes.push(combined);
    }
    return hashes;
  }

  async add(username: string): Promise<void> {
    const hashes = this.getHashes(username);
    for (const h of hashes) {
      await cacheClient.set(`${this.redisPrefix}:${h}`, '1');
    }
  }

  async mightExist(username: string): Promise<boolean> {
    const hashes = this.getHashes(username);
    for (const h of hashes) {
      const val = await cacheClient.get(`${this.redisPrefix}:${h}`);
      if (!val) {
        return false; // Definitely does NOT exist
      }
    }
    return true; // Might exist, consult DB
  }
}

export const usernameBloomFilter = new UsernameBloomFilter();
