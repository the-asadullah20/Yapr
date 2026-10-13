import crypto from 'crypto';
import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';
import { queueService } from '../../config/queue.js';
import { cacheClient } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { summarizeYap } from '../../config/ai.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { mockProfiles } from '../profiles/profiles.service.js';
import { DEFAULT_AVATAR } from '../../utils/avatar.js';

// In-memory yaps store for dev
export const mockYaps: any[] = [];


export class YapsService {
  /**
   * Extract hashtags from text (e.g. #Tech, #Karachi)
   */
  private extractHashtags(text: string): string[] {
    if (!text) return [];
    const matches = text.match(/#([a-zA-Z0-9_]+)/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.slice(1))));
  }

  /**
   * Extract user mentions from text (e.g. @bhola_zee)
   */
  private extractMentions(text: string): string[] {
    if (!text) return [];
    const matches = text.match(/@([a-zA-Z0-9_]{3,30})/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
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
    const { authorId, body = '', parentId, media = [], taggedLabel, countryCode = 'PK' } = params;

    const cleanBody = (body || '').trim();
    const hasMedia = media && media.length > 0;

    if (!cleanBody && !hasMedia) {
      throw new Error('Yap content cannot be empty unless media is attached');
    }
    if (cleanBody.length > 500) {
      throw new Error('Yap exceeds 500 character limit');
    }

    const hashtags = this.extractHashtags(cleanBody);
    const mentions = this.extractMentions(cleanBody);

    // 1. Private post comment rule:
    // If replying to a post, verify if parent post author is private.
    // If private, only approved followers can comment on it!
    // Public posts: anyone can comment on them!
    let parentAuthorId: string | null = null;
    if (parentId && isSupabaseConfigured) {
      const { data: parentPost } = await supabaseAdmin
        .from('yaps')
        .select('author_id, author:profiles!author_id(id, is_private)')
        .eq('id', parentId)
        .is('deleted_at', null)
        .maybeSingle();

      if (!parentPost) {
        throw new Error('The post you are replying to does not exist or has been deleted');
      }

      parentAuthorId = parentPost.author_id;
      const parentAuthor = (parentPost as any).author;
      const isParentPrivate = !!parentAuthor?.is_private;

      if (isParentPrivate && parentAuthorId !== authorId) {
        const { data: followRecord } = await supabaseAdmin
          .from('follows')
          .select('follower_id')
          .eq('follower_id', authorId)
          .eq('followee_id', parentAuthorId)
          .maybeSingle();

        if (!followRecord) {
          throw new Error('This account is private. Only approved followers can comment on their yaps.');
        }
      }
    }

    // 2. Mention validation & Public vs Private tagging rules:
    // Public accounts: anyone can mention them!
    // Private accounts: only approved followers can mention them!
    if (mentions.length > 0) {
      if (isSupabaseConfigured) {
        // Fast batch lookup of mentioned usernames
        const { data: matchedProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, username, is_private')
          .in('username', mentions);

        const profileMap = new Map<string, any>();
        (matchedProfiles || []).forEach((p) => profileMap.set(p.username.toLowerCase(), p));

        for (const username of mentions) {
          const targetUser = profileMap.get(username.toLowerCase());
          if (!targetUser) {
            throw new Error(`Comment cannot be posted: User @${username} does not exist`);
          }

          if (targetUser.id !== authorId) {
            // Private account rule: only approved followers can tag private accounts
            if (targetUser.is_private) {
              const { data: isFollower } = await supabaseAdmin
                .from('follows')
                .select('follower_id')
                .eq('follower_id', authorId)
                .eq('followee_id', targetUser.id)
                .maybeSingle();

              if (!isFollower) {
                throw new Error(`Cannot tag @${username}: Account is private and only approved followers can mention them`);
              }
            }
            // Public accounts: allowed for anyone!
          }
        }
      } else {
        const reserved = ['asadahmad', 'panfengshui', 'clarakim', 'hamza_tech', 'zainab_writes', 'ali', 'admin', 'yapr'];
        for (const username of mentions) {
          if (!reserved.includes(username.toLowerCase())) {
            throw new Error(`Comment cannot be posted: User @${username} does not exist`);
          }
        }
      }
    }

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
          body: cleanBody,
          media,
          tagged_label: taggedLabel || null,
          created_at: now,
        })
        .select('*, author:profiles!author_id(*)')
        .single();

      if (error) throw error;
      newYap = data;

      // Invalidate relevant Redis caches immediately
      if (parentId) {
        cacheClient.del(`yapr:replies:${parentId}`).catch(() => {});
      }
      cacheClient.del(`yapr:feed:recent`).catch(() => {});

      // Parallel background tasks without blocking user response
      const bgOps: Promise<any>[] = [];

      // Hashtag handling
      if (hashtags.length > 0) {
        bgOps.push(
          (async () => {
            await Promise.all(
              hashtags.map((tag) =>
                supabaseAdmin.from('hashtags').upsert({ tag, total_count: 1 }, { onConflict: 'tag' })
              )
            );
            await supabaseAdmin.from('yap_hashtags').insert(
              hashtags.map((tag) => ({ tag, yap_id: yapId, country_code: countryCode }))
            );
          })().catch(() => {})
        );
        for (const tag of hashtags) {
          bgOps.push(
            cacheClient.zincrby(`trending:global:1h`, 1, tag).catch(() => 0),
            cacheClient.zincrby(`trending:global:24h`, 1, tag).catch(() => 0),
            cacheClient.zincrby(`trending:${countryCode}:24h`, 1, tag).catch(() => 0)
          );
        }
      }

      // Parent reply count update & notification
      if (parentId && parentAuthorId) {
        bgOps.push(
          (async () => {
            const { count } = await supabaseAdmin
              .from('yaps')
              .select('id', { count: 'exact', head: true })
              .eq('parent_id', parentId)
              .is('deleted_at', null);
            await supabaseAdmin.from('yaps').update({ reply_count: count ?? 1 }).eq('id', parentId);
          })()
        );

        if (parentAuthorId !== authorId) {
          bgOps.push(
            notificationsService.createNotification({
              userId: parentAuthorId,
              type: 'reply',
              actorId: authorId,
              yapId,
            }).catch(() => {})
          );
        }
      }

      // Mention notifications
      if (mentions.length > 0) {
        bgOps.push(
          (async () => {
            const { data: mentionedUsers } = await supabaseAdmin
              .from('profiles')
              .select('id, username')
              .in('username', mentions);
            if (mentionedUsers) {
              for (const u of mentionedUsers) {
                if (u.id !== authorId && (!parentAuthorId || u.id !== parentAuthorId)) {
                  await notificationsService.createNotification({
                    userId: u.id,
                    type: 'mention',
                    actorId: authorId,
                    yapId,
                  }).catch(() => {});
                }
              }
            }
          })().catch(() => {})
        );
      }

      // Queue publishing
      bgOps.push(
        queueService.publish(env.AMQP_QUEUE_YAP_CREATED || 'yapr.yap.created', {
          id: `yap_created_${yapId}`,
          name: 'yap_created',
          payload: { yapId, authorId, parentId: parentId || null, body, hashtags, countryCode },
        }).catch(() => {})
      );

      if (body.length > 200) {
        bgOps.push(
          queueService.publish(env.AMQP_QUEUE_AI_SUMMARY || 'yapr.ai.summary', {
            id: `ai_summary_${yapId}`,
            name: 'generate_summary',
            payload: { yapId, body },
          }).catch(() => {})
        );
      }

      // Fire all background tasks concurrently
      Promise.all(bgOps).catch((err) => console.error('Background yap tasks error:', err));
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
        body: cleanBody,
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
          username: mockProfiles.get(authorId)?.username || ('user_' + authorId.slice(0, 6)),
          display_name: mockProfiles.get(authorId)?.display_name || 'Yapr Creator',
          avatar_url: mockProfiles.get(authorId)?.avatar_url || DEFAULT_AVATAR,
          country_code: mockProfiles.get(authorId)?.country_code || countryCode,
          is_verified: !!mockProfiles.get(authorId)?.is_verified,
        },
      };
      mockYaps.unshift(newYap);
    }

    return newYap;
  }

  async getYapById(yapId: string, viewerId?: string): Promise<any> {
    const cacheKey = `yapr:yap:${yapId}`;
    try {
      const cached = await cacheClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('yaps')
        .select('*, author:profiles!author_id(*)')
        .eq('id', yapId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      try {
        await cacheClient.set(cacheKey, JSON.stringify(data), 60);
      } catch {}
      return data;
    }

    const found = mockYaps.find((y) => y.id === yapId);
    if (!found) throw new Error('Yap not found');
    return found;
  }

  async getThreadReplies(parentYapId: string): Promise<any[]> {
    const cacheKey = `yapr:replies:${parentYapId}`;
    try {
      const cached = await cacheClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('yaps')
        .select('*, author:profiles!author_id(*)')
        .eq('parent_id', parentYapId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const result = data || [];
      try {
        await cacheClient.set(cacheKey, JSON.stringify(result), 60);
      } catch {}
      return result;
    }

    return mockYaps.filter((y) => y.parent_id === parentYapId);
  }

  async softDeleteYap(yapId: string, authorId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        const { data: targetYap } = await supabaseAdmin
          .from('yaps')
          .select('author_id, parent_id')
          .eq('id', yapId)
          .maybeSingle();

        if (!targetYap) {
          return false;
        }

        if (targetYap.author_id !== authorId) {
          throw new Error('Forbidden: You can only delete your own posts');
        }

        const parentId = targetYap.parent_id;

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

        if (parentId) {
          const { count } = await supabaseAdmin
            .from('yaps')
            .select('id', { count: 'exact', head: true })
            .eq('parent_id', parentId)
            .is('deleted_at', null);

          await supabaseAdmin
            .from('yaps')
            .update({ reply_count: count ?? 0 })
            .eq('id', parentId);
        }

        // Invalidate Redis caches
        cacheClient.del(`yapr:yap:${yapId}`).catch(() => {});
        if (parentId) {
          cacheClient.del(`yapr:replies:${parentId}`).catch(() => {});
        }
        cacheClient.del(`yapr:feed:recent`).catch(() => {});

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
      cacheClient.del(`yapr:yap:${yapId}`).catch(() => {});
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
