import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';
import { queueService } from '../../config/queue.js';
import { env } from '../../config/env.js';
import { mockYaps } from '../yaps/yaps.service.js';

export class SocialService {
  async toggleLike(userId: string, yapId: string): Promise<{ liked: boolean; likeCount: number }> {
    if (isSupabaseConfigured) {
      const { data: existing } = await supabaseAdmin
        .from('likes')
        .select('yap_id')
        .eq('user_id', userId)
        .eq('yap_id', yapId)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin.from('likes').delete().eq('user_id', userId).eq('yap_id', yapId);
        const { data: yap } = await supabaseAdmin.from('yaps').select('like_count').eq('id', yapId).single();
        return { liked: false, likeCount: yap?.like_count || 0 };
      } else {
        await supabaseAdmin.from('likes').insert({ user_id: userId, yap_id: yapId });
        const { data: yap } = await supabaseAdmin.from('yaps').select('like_count, author_id').eq('id', yapId).single();

        // Enqueue notification job
        if (yap?.author_id && yap.author_id !== userId) {
          await queueService.publish(env.AMQP_QUEUE_NOTIFICATIONS || 'yapr.notifications', {
            id: `notif_like_${userId}_${yapId}`,
            name: 'like_notification',
            payload: { recipientId: yap.author_id, actorId: userId, yapId, type: 'like' },
          });
        }
        return { liked: true, likeCount: yap?.like_count || 1 };
      }
    }

    // Mock toggle
    const yap = mockYaps.find((y) => y.id === yapId);
    if (!yap) throw new Error('Yap not found');
    yap.is_liked = !yap.is_liked;
    yap.like_count = Math.max(0, yap.like_count + (yap.is_liked ? 1 : -1));
    return { liked: yap.is_liked, likeCount: yap.like_count };
  }

  async toggleReyap(userId: string, yapId: string, quoteBody?: string): Promise<{ reyapped: boolean; reyapCount: number }> {
    if (isSupabaseConfigured) {
      const { data: existing } = await supabaseAdmin
        .from('reyaps')
        .select('yap_id')
        .eq('user_id', userId)
        .eq('yap_id', yapId)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin.from('reyaps').delete().eq('user_id', userId).eq('yap_id', yapId);
        const { data: yap } = await supabaseAdmin.from('yaps').select('reyap_count').eq('id', yapId).single();
        return { reyapped: false, reyapCount: yap?.reyap_count || 0 };
      } else {
        await supabaseAdmin.from('reyaps').insert({ user_id: userId, yap_id: yapId, quote_body: quoteBody || null });
        const { data: yap } = await supabaseAdmin.from('yaps').select('reyap_count, author_id').eq('id', yapId).single();

        if (yap?.author_id && yap.author_id !== userId) {
          await queueService.publish(env.AMQP_QUEUE_NOTIFICATIONS || 'yapr.notifications', {
            id: `notif_reyap_${userId}_${yapId}`,
            name: 'reyap_notification',
            payload: { recipientId: yap.author_id, actorId: userId, yapId, type: 'reyap' },
          });
        }
        return { reyapped: true, reyapCount: yap?.reyap_count || 1 };
      }
    }

    const yap = mockYaps.find((y) => y.id === yapId);
    if (!yap) throw new Error('Yap not found');
    yap.is_reyapped = !yap.is_reyapped;
    yap.reyap_count = Math.max(0, yap.reyap_count + (yap.is_reyapped ? 1 : -1));
    return { reyapped: yap.is_reyapped, reyapCount: yap.reyap_count };
  }

  async toggleFollow(followerId: string, followeeId: string): Promise<{ following: boolean }> {
    if (followerId === followeeId) {
      throw new Error('You cannot follow yourself');
    }

    if (isSupabaseConfigured) {
      const { data: existing } = await supabaseAdmin
        .from('follows')
        .select('*')
        .eq('follower_id', followerId)
        .eq('followee_id', followeeId)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin.from('follows').delete().eq('follower_id', followerId).eq('followee_id', followeeId);
        return { following: false };
      } else {
        await supabaseAdmin.from('follows').insert({ follower_id: followerId, followee_id: followeeId });
        await queueService.publish(env.AMQP_QUEUE_NOTIFICATIONS || 'yapr.notifications', {
          id: `notif_follow_${followerId}_${followeeId}`,
          name: 'follow_notification',
          payload: { recipientId: followeeId, actorId: followerId, type: 'follow' },
        });
        return { following: true };
      }
    }

    return { following: true };
  }

  async toggleBookmark(userId: string, yapId: string): Promise<{ bookmarked: boolean }> {
    if (isSupabaseConfigured) {
      const { data: existing } = await supabaseAdmin
        .from('bookmarks')
        .select('yap_id')
        .eq('user_id', userId)
        .eq('yap_id', yapId)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin.from('bookmarks').delete().eq('user_id', userId).eq('yap_id', yapId);
        return { bookmarked: false };
      } else {
        await supabaseAdmin.from('bookmarks').insert({ user_id: userId, yap_id: yapId });
        return { bookmarked: true };
      }
    }

    const yap = mockYaps.find((y) => y.id === yapId);
    if (yap) yap.is_bookmarked = !yap.is_bookmarked;
    return { bookmarked: yap?.is_bookmarked ?? true };
  }

  async getBookmarkedYaps(userId: string): Promise<any[]> {
    if (isSupabaseConfigured) {
      const { data: bookmarkRows, error: bmError } = await supabaseAdmin
        .from('bookmarks')
        .select('yap_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (bmError || !bookmarkRows || bookmarkRows.length === 0) {
        return [];
      }

      const yapIds = bookmarkRows.map((r) => r.yap_id);
      const { data: yaps, error: yapsError } = await supabaseAdmin
        .from('yaps')
        .select('*, author:profiles!author_id(*)')
        .in('id', yapIds);

      if (yapsError || !yaps) {
        return [];
      }

      const { data: userLikes } = await supabaseAdmin
        .from('likes')
        .select('yap_id')
        .eq('user_id', userId)
        .in('yap_id', yapIds);

      const likedYapIds = new Set((userLikes || []).map((l: any) => l.yap_id));
      const yapMap = new Map(yaps.map((y) => [y.id, y]));

      return yapIds
        .map((id) => yapMap.get(id))
        .filter(Boolean)
        .map((y: any) => ({
          ...y,
          is_liked: likedYapIds.has(y.id),
          is_bookmarked: true,
        }));
    }

    return mockYaps.filter((y) => y.is_bookmarked);
  }

  async blockUser(blockerId: string, blockedId: string): Promise<boolean> {
    if (blockerId === blockedId) throw new Error('Cannot block yourself');
    if (isSupabaseConfigured) {
      await supabaseAdmin.from('blocks').upsert({ blocker_id: blockerId, blocked_id: blockedId });
      // Unfollow reciprocally
      await supabaseAdmin.from('follows').delete().match({ follower_id: blockerId, followee_id: blockedId });
      await supabaseAdmin.from('follows').delete().match({ follower_id: blockedId, followee_id: blockerId });
    }
    return true;
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      await supabaseAdmin
        .from('blocks')
        .delete()
        .match({ blocker_id: blockerId, blocked_id: blockedId });
    }
    return true;
  }

  async getBlockedUsers(blockerId: string): Promise<any[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('blocks')
        .select('blocked_id, created_at, profile:profiles!blocked_id(*)')
        .eq('blocker_id', blockerId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data
          .map((d: any) => ({
            ...d.profile,
            blocked_at: d.created_at,
            avatar_url:
              d.profile?.avatar_url ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${d.profile?.username || d.blocked_id}`,
          }))
          .filter((p: any) => !!p.id);
      }
    }
    return [];
  }

  async isUserBlocked(blockerId: string, targetId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { data } = await supabaseAdmin
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', blockerId)
        .eq('blocked_id', targetId)
        .maybeSingle();
      return !!data;
    }
    return false;
  }

  async reportContent(reporterId: string, payload: { yapId?: string; reportedUserId?: string; reason: string }): Promise<boolean> {
    if (isSupabaseConfigured) {
      await supabaseAdmin.from('reports').insert({
        reporter_id: reporterId,
        yap_id: payload.yapId || null,
        reported_user_id: payload.reportedUserId || null,
        reason: payload.reason,
      });
    }
    return true;
  }

  async getUserReports(reporterId: string): Promise<any[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('reports')
        .select('id, yap_id, reported_user_id, reason, status, created_at, reported_user:profiles!reported_user_id(username, display_name)')
        .eq('reporter_id', reporterId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data;
      }
    }
    return [];
  }

  async getYapLikers(yapId: string): Promise<any[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('likes')
        .select('user_id, created_at, profile:profiles!user_id(id, username, display_name, avatar_url, is_verified)')
        .eq('yap_id', yapId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((d: any) => ({
          ...d.profile,
          liked_at: d.created_at,
          avatar_url: d.profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${d.profile?.username || d.user_id}`,
        })).filter((p: any) => !!p.id);
      }
    }
    return [];
  }
}

export const socialService = new SocialService();
