import { cacheClient } from '../../config/redis.js';
import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';

export interface TrendingHashtag {
  tag: string;
  count: number;
  countryCode: string;
}

export class TrendingService {
  /**
   * Get top trending hashtags by country and timeframe (1h or 24h)
   */
  async getTrending(countryCode: string = 'PK', timeframe: '1h' | '24h' = '24h', limit = 10): Promise<TrendingHashtag[]> {
    const redisKey = countryCode === 'GLOBAL'
      ? `trending:global:${timeframe}`
      : `trending:${countryCode.toUpperCase()}:${timeframe}`;

    // 1. Try reading from Redis sorted sets
    const cached = await cacheClient.zrevrangeWithScores(redisKey, 0, limit - 1);
    if (cached && cached.length > 0) {
      return cached.map((item) => ({
        tag: item.member,
        count: Math.round(item.score),
        countryCode,
      }));
    }

    // 2. Fallback to Supabase Postgres query
    if (isSupabaseConfigured) {
      const intervalStr = timeframe === '1h' ? '1 hour' : '24 hours';
      const { data } = await supabaseAdmin
        .from('yap_hashtags')
        .select('tag')
        .gte('created_at', new Date(Date.now() - (timeframe === '1h' ? 3600000 : 86400000)).toISOString())
        .limit(100);

      if (data && data.length > 0) {
        const counts: Record<string, number> = {};
        data.forEach((row) => {
          counts[row.tag] = (counts[row.tag] || 0) + 1;
        });

        const sorted = Object.entries(counts)
          .map(([tag, count]) => ({ tag, count, countryCode }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);

        // Populate Redis
        for (const item of sorted) {
          await cacheClient.zadd(redisKey, item.count, item.tag);
        }

        return sorted;
      }
    }

    // 3. Fallback mock trending
    const mockTopics: Record<string, TrendingHashtag[]> = {
      PK: [
        { tag: 'Karachi', count: 1840, countryCode: 'PK' },
        { tag: 'Tech', count: 1420, countryCode: 'PK' },
        { tag: 'Cricket', count: 980, countryCode: 'PK' },
        { tag: 'Yapr', count: 850, countryCode: 'PK' },
        { tag: 'PulseAi', count: 620, countryCode: 'PK' },
      ],
      GLOBAL: [
        { tag: 'Tech', count: 9400, countryCode: 'GLOBAL' },
        { tag: 'AI', count: 8200, countryCode: 'GLOBAL' },
        { tag: 'Design', count: 4300, countryCode: 'GLOBAL' },
        { tag: 'PulseAi', count: 3100, countryCode: 'GLOBAL' },
      ],
    };

    return mockTopics[countryCode.toUpperCase()] || mockTopics.GLOBAL;
  }
}

export const trendingService = new TrendingService();
