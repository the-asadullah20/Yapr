import crypto from 'crypto';
import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';
import { queueService } from '../../config/queue.js';
import { cacheClient } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { summarizeYap } from '../../config/ai.js';

// In-memory mock yaps for fallback/dev
export const mockYaps: any[] = [
  {
    id: 'f1111111-1111-1111-1111-111111111111',
    author_id: 'b2222222-2222-2222-2222-222222222222',
    author: {
      id: 'b2222222-2222-2222-2222-222222222222',
      username: 'panfengshui',
      display_name: 'Pan Feng Shui',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      country_code: 'SG',
      is_verified: true,
    },
    body: 'One of the perks of working in an international company is sharing knowledge with your colleagues across continents! Great brainstorm session today on next-gen distributed systems. #Tech #Design',
    media: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    ],
    like_count: 120,
    reply_count: 25,
    reyap_count: 18,
    summary: 'Pan highlights cross-continental knowledge sharing and brainstorming next-gen distributed systems with colleagues.',
    tagged_label: null,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    is_liked: false,
    is_reyapped: false,
    is_bookmarked: false,
  },
  {
    id: 'f2222222-2222-2222-2222-222222222222',
    author_id: 'c3333333-3333-3333-3333-333333333333',
    author: {
      id: 'c3333333-3333-3333-3333-333333333333',
      username: 'clarakim',
      display_name: 'Clara Kim',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      country_code: 'US',
      is_verified: false,
    },
    body: 'A Great Way To Generate All The Motivation You Need To Get Fit: Start small, track consistency over intensity, and let dopamine reward your habit loops! 💪🏃‍♀️ #Fitness #Mindset',
    media: [
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800',
    ],
    like_count: 85,
    reply_count: 14,
    reyap_count: 9,
    summary: 'Clara emphasizes building sustainable fitness through small consistent steps rather than erratic high-intensity bursts.',
    tagged_label: null,
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    is_liked: false,
    is_reyapped: false,
    is_bookmarked: false,
  },
  {
    id: 'f3333333-3333-3333-3333-333333333333',
    author_id: 'a1111111-1111-1111-1111-111111111111',
    author: {
      id: 'a1111111-1111-1111-1111-111111111111',
      username: 'asadahmad',
      display_name: 'Asad Ahmad',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      country_code: 'PK',
      is_verified: true,
    },
    body: 'Welcome to Yapr! 🚀 The social platform where every post is a Yap. Built with Express, React, Tailwind, Supabase Postgres, Redis, and Groq/Gemini AI summarization. Experience user-controlled feed ranking sliders! #Yapr #PulseAi #Tech',
    media: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
    ],
    like_count: 340,
    reply_count: 52,
    reyap_count: 41,
    summary: 'Asad announces Yapr launch featuring user-controlled feed ranking algorithms and dual AI summarization.',
    tagged_label: null,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    is_liked: true,
    is_reyapped: false,
    is_bookmarked: true,
  },
];

export class YapsService {
  /**
   * Extract hashtags from text (e.g. #Tech, #Karachi)
   */
  private extractHashtags(text: string): string[] {
    const matches = text.match(/#([a-zA-Z0-9_]+)/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.slice(1))));
  }

  /**
   * Create a new Yap or reply
   */
  async createYap(params: {
    authorId: string;
    body: string;
    parentId?: string;
    media?: string[];
    taggedLabel?: string;
    countryCode?: string;
  }): Promise<any> {
    const { authorId, body, parentId, media = [], taggedLabel, countryCode = 'PK' } = params;

    if (!body || body.trim().length === 0) {
      throw new Error('Yap content cannot be empty');
    }
    if (body.length > 500) {
      throw new Error('Yap exceeds 500 character limit');
    }

    const hashtags = this.extractHashtags(body);
    const yapId = crypto.randomUUID();
    const now = new Date().toISOString();

    let newYap: any;

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('yaps')
        .insert({
          id: yapId,
          author_id: authorId,
          parent_id: parentId || null,
          body,
          media,
          tagged_label: taggedLabel || null,
          created_at: now,
        })
        .select('*, author:profiles(*)')
        .single();

      if (error) throw error;
      newYap = data;

      // Insert hashtags
      for (const tag of hashtags) {
        await supabaseAdmin.from('hashtags').upsert(
          { tag, total_count: 1 },
          { onConflict: 'tag' }
        );
        await supabaseAdmin.from('yap_hashtags').insert({
          tag,
          yap_id: yapId,
          country_code: countryCode,
        });
      }
    } else {
      // In-memory mock yap creation
      newYap = {
        id: yapId,
        author_id: authorId,
        parent_id: parentId || null,
        body,
        media,
        like_count: 0,
        reply_count: 0,
        reyap_count: 0,
        summary: null,
        tagged_label: taggedLabel || null,
        created_at: now,
        is_liked: false,
        is_reyapped: false,
        is_bookmarked: false,
        author: {
          id: authorId,
          username: 'user_' + authorId.slice(0, 6),
          display_name: 'Yapr Creator',
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${authorId}`,
          country_code: countryCode,
          is_verified: false,
        },
      };
      mockYaps.unshift(newYap);
    }

    // Update Redis trending sorted sets (1h and 24h buckets)
    const timestampScore = Date.now();
    for (const tag of hashtags) {
      await cacheClient.zincrby(`trending:global:1h`, 1, tag);
      await cacheClient.zincrby(`trending:global:24h`, 1, tag);
      await cacheClient.zincrby(`trending:${countryCode}:24h`, 1, tag);
    }

    // Publish to LavinMQ queue for async notification fan-out and AI summarizer
    await queueService.publish(env.AMQP_QUEUE_YAP_CREATED || 'yapr.yap.created', {
      id: `yap_created_${yapId}`,
      name: 'yap_created',
      payload: {
        yapId,
        authorId,
        parentId: parentId || null,
        body,
        hashtags,
        countryCode,
      },
    });

    // If yap is longer than 200 characters, trigger background summary job
    if (body.length > 200) {
      await queueService.publish(env.AMQP_QUEUE_AI_SUMMARY || 'yapr.ai.summary', {
        id: `ai_summary_${yapId}`,
        name: 'generate_summary',
        payload: { yapId, body },
      });
    }

    return newYap;
  }

  async getYapById(yapId: string, viewerId?: string): Promise<any> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('yaps')
        .select('*, author:profiles(*)')
        .eq('id', yapId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data;
    }

    const found = mockYaps.find((y) => y.id === yapId);
    if (!found) throw new Error('Yap not found');
    return found;
  }

  async getThreadReplies(parentYapId: string): Promise<any[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('yaps')
        .select('*, author:profiles(*)')
        .eq('parent_id', parentYapId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    }

    return mockYaps.filter((y) => y.parent_id === parentYapId);
  }

  async softDeleteYap(yapId: string, authorId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { error } = await supabaseAdmin
        .from('yaps')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', yapId)
        .eq('author_id', authorId);

      if (error) throw error;
      return true;
    }

    const idx = mockYaps.findIndex((y) => y.id === yapId && y.author_id === authorId);
    if (idx !== -1) {
      mockYaps.splice(idx, 1);
      return true;
    }
    return false;
  }

  async editYap(yapId: string, authorId: string, newBody: string): Promise<any> {
    if (!newBody || newBody.length > 500) {
      throw new Error('Invalid yap body length');
    }

    if (isSupabaseConfigured) {
      // 1. Fetch current body for audit history
      const { data: current } = await supabaseAdmin
        .from('yaps')
        .select('body, created_at')
        .eq('id', yapId)
        .eq('author_id', authorId)
        .single();

      if (!current) throw new Error('Yap not found or unauthorized');

      // Check 1-hour window
      const ageHours = (Date.now() - new Date(current.created_at).getTime()) / (1000 * 3600);
      if (ageHours > 1) {
        throw new Error('Yaps can only be edited within 1 hour of posting');
      }

      // Record edit history
      await supabaseAdmin.from('yap_edits').insert({
        yap_id: yapId,
        previous_body: current.body,
      });

      // Update yap
      const { data: updated, error } = await supabaseAdmin
        .from('yaps')
        .update({ body: newBody, edited_at: new Date().toISOString() })
        .eq('id', yapId)
        .select('*, author:profiles(*)')
        .single();

      if (error) throw error;
      return updated;
    }

    const yap = mockYaps.find((y) => y.id === yapId && y.author_id === authorId);
    if (!yap) throw new Error('Yap not found');
    yap.body = newBody;
    yap.edited_at = new Date().toISOString();
    return yap;
  }
}

export const yapsService = new YapsService();
