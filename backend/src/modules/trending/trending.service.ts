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
   * Real-time calculation based on real users' yaps only - zero mock data
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

    // 2. Query real hashtags from Supabase Postgres
    if (isSupabaseConfigured) {
      let query = supabaseAdmin
        .from('yap_hashtags')
        .select('tag')
        .gte('created_at', new Date(Date.now() - (timeframe === '1h' ? 3600000 : 86400000)).toISOString())
        .limit(100);

      if (countryCode !== 'GLOBAL') {
        query = query.eq('country_code', countryCode.toUpperCase());
      }

      const { data } = await query;

      if (data && data.length > 0) {
        const counts: Record<string, number> = {};
        data.forEach((row: any) => {
          counts[row.tag] = (counts[row.tag] || 0) + 1;
        });

        const sorted = Object.entries(counts)
          .map(([tag, count]) => ({ tag, count, countryCode }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);

        // Populate Redis cache with real activity
        for (const item of sorted) {
          await cacheClient.zadd(redisKey, item.count, item.tag);
        }

        return sorted;
      }
    }

    // Pure real-time: return empty array when no real tags have been posted yet
    return [];
  }
}

export const trendingService = new TrendingService();
