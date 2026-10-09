import crypto from 'crypto';
import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';
import { queueService } from '../../config/queue.js';
import { cacheClient } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { summarizeYap } from '../../config/ai.js';

// In-memory yaps store for dev
export const mockYaps: any[] = [];


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
        .select('*, author:profiles!author_id(*)')
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

      // If replying to a parent Yap, increment parent's reply_count and notify parent author
      if (parentId) {
        const { data: parent } = await supabaseAdmin
          .from('yaps')
          .select('reply_count, author_id')
          .eq('id', parentId)
          .single();
        if (parent) {
          await supabaseAdmin
            .from('yaps')
            .update({ reply_count: (parent.reply_count || 0) + 1 })
            .eq('id', parentId);

          if (parent.author_id && parent.author_id !== authorId) {
            await queueService.publish(env.AMQP_QUEUE_NOTIFICATIONS || 'yapr.notifications', {
              id: `notif_reply_${authorId}_${yapId}`,
              name: 'reply_notification',
              payload: { recipientId: parent.author_id, actorId: authorId, yapId, type: 'reply' },
            });
          }
        }
      }
    } else {
      // In-memory mock yap creation
      if (parentId) {
        const parent = mockYaps.find((y) => y.id === parentId);
        if (parent) parent.reply_count = (parent.reply_count || 0) + 1;
      }
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
        .select('*, author:profiles!author_id(*)')
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
        .select('*, author:profiles!author_id(*)')
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
      try {
        // 1. Delete notifications referencing this yap
        await supabaseAdmin.from('notifications').delete().eq('yap_id', yapId);
        // 2. Delete likes referencing this yap
        await supabaseAdmin.from('likes').delete().eq('yap_id', yapId);
        // 3. Delete bookmarks referencing this yap
        await supabaseAdmin.from('bookmarks').delete().eq('yap_id', yapId);
        // 4. Delete replies
        await supabaseAdmin.from('yaps').delete().eq('parent_id', yapId);
        // 5. Delete or mark deleted the yap itself
        await supabaseAdmin
          .from('yaps')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', yapId)
          .eq('author_id', authorId);

        // Also attempt hard delete if schema allows cascade
        await supabaseAdmin
          .from('yaps')
          .delete()
          .eq('id', yapId)
          .eq('author_id', authorId);

        return true;
      } catch (err) {
        console.error('Error during yap deletion cascade:', err);
        return true;
      }
    }

    const idx = mockYaps.findIndex((y) => y.id === yapId && y.author_id === authorId);
    if (idx !== -1) {
      mockYaps.splice(idx, 1);
    }
    // Also remove child replies in mock store
    for (let i = mockYaps.length - 1; i >= 0; i--) {
      if (mockYaps[i].parent_id === yapId) {
        mockYaps.splice(i, 1);
      }
    }
    return true;
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
        .select('*, author:profiles!author_id(*)')
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
