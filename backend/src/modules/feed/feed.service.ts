import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';
import { mockYaps } from '../yaps/yaps.service.js';

export interface FeedSliderOptions {
  followingWeight?: number; // e.g. 1.0 - 5.0 (Default 1.5)
  viralWeight?: number; // e.g. 0.0 - 3.0 (Default 1.0)
  recencyHalfLifeHours?: number; // e.g. 2 - 48 (Default 12.0)
  diversityMix?: number; // e.g. 0.0 - 1.0 (Default 0.2)
  countryCode?: string;
  limit?: number;
  offset?: number;
}

export class FeedService {
  /**
   * Stage 1 Feed with Algorithm Sliders & "Why you're seeing this"
   */
  async getRankedFeed(viewerId?: string, options: FeedSliderOptions = {}): Promise<any> {
    const {
      followingWeight = 1.5,
      viralWeight = 1.0,
      recencyHalfLifeHours = 12.0,
      countryCode,
      limit = 20,
      offset = 0,
    } = options;

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin.rpc('get_stage1_feed', {
        p_viewer_id: viewerId || null,
        p_following_weight: followingWeight,
        p_viral_weight: viralWeight,
        p_recency_half_life_hours: recencyHalfLifeHours,
        p_limit: limit,
        p_offset: offset,
        p_country_filter: countryCode || null,
      });

      if (!error && data) {
        const mappedYaps = data.map((row: any) => ({
          id: row.yap_id || row.id,
          author_id: row.author_id,
          body: row.body,
          media: row.media || [],
          like_count: row.like_count ?? 0,
          reply_count: row.reply_count ?? 0,
          reyap_count: row.reyap_count ?? 0,
          summary: row.summary,
          tagged_label: row.tagged_label,
          created_at: row.created_at,
          is_liked: row.is_liked || false,
          is_reyapped: row.is_reyapped || false,
          is_bookmarked: row.is_bookmarked || false,
          final_score: row.final_score,
          why_label: row.why_label,
          author: row.author || {
            id: row.author_id,
            username: row.username || 'yapr',
            display_name: row.display_name || row.username || 'Yapr User',
            avatar_url: row.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${row.username || row.author_id || 'yapr'}`,
            country_code: row.author_country || 'PK',
            is_verified: row.is_verified || false,
          },
        }));

        return {
          yaps: mappedYaps,
          algorithmMetadata: {
            stage: 'Stage 1 Rule-Based',
            formula: 'score = (likes*1 + replies*3 + reyaps*2) * recency_decay + author_affinity + follow_bonus',
            appliedWeights: { followingWeight, viralWeight, recencyHalfLifeHours },
          },
        };
      }
    }

    // In-Memory Stage 1 Scoring for Dev / Fallback
    const scored = mockYaps
      .filter((y) => !countryCode || y.author?.country_code === countryCode)
      .map((yap) => {
        const ageHours = (Date.now() - new Date(yap.created_at).getTime()) / (1000 * 3600);
        const recencyDecay = Math.exp(-ageHours / Math.max(recencyHalfLifeHours, 1.0));
        const engagementScore = (yap.like_count * 1 + yap.reply_count * 3 + yap.reyap_count * 2) * viralWeight;
        const isFollowing = viewerId ? yap.author_id !== viewerId : false;
        const followBonus = isFollowing ? 5.0 * followingWeight : 0.0;
        const finalScore = parseFloat((engagementScore * recencyDecay + followBonus).toFixed(3));

        let whyLabel = 'Trending on Yapr';
        if (isFollowing) whyLabel = 'From people you follow';
        else if (ageHours < 2) whyLabel = 'Freshly yapped';
        else if (yap.like_count > 100) whyLabel = 'High engagement in your network';

        return {
          ...yap,
          final_score: finalScore,
          why_label: whyLabel,
        };
      })
      .sort((a, b) => b.final_score - a.final_score);

    return {
      yaps: scored.slice(offset, offset + limit),
      algorithmMetadata: {
        stage: 'Stage 1 Rule-Based',
        formula: 'score = (likes*1 + replies*3 + reyaps*2) * recency_decay + author_affinity + follow_bonus',
        appliedWeights: { followingWeight, viralWeight, recencyHalfLifeHours },
      },
    };
  }

  /**
   * Reverse chronological feed (Default Twitter style)
   */
  async getChronologicalFeed(viewerId?: string, limit = 20, offset = 0): Promise<any> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('yaps')
        .select('*, author:profiles!author_id(*)')
        .is('parent_id', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        return {
          yaps: data.map((y) => ({ ...y, why_label: 'Latest in real-time' })),
          algorithmMetadata: { stage: 'Chronological' },
        };
      }
    }

    const sorted = [...mockYaps]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((y) => ({ ...y, why_label: 'Latest in real-time' }));

    return {
      yaps: sorted.slice(offset, offset + limit),
      algorithmMetadata: { stage: 'Chronological' },
    };
  }
}

export const feedService = new FeedService();
