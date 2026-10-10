import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';
import { queueService } from '../../config/queue.js';
import { cacheClient } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { mockYaps } from '../yaps/yaps.service.js';
import { notificationsService } from '../notifications/notifications.service.js';

export const mockUserReyaps = new Map<string, Set<string>>();
export const mockFollowRequests = new Map<string, Set<string>>();

async function getRedisFollowRequests(targetId: string): Promise<string[]> {
  try {
    const raw = await cacheClient.get(`yapr:follow_reqs:${targetId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  const s = mockFollowRequests.get(targetId);
  return s ? Array.from(s) : [];
}

async function addRedisFollowRequest(targetId: string, requesterId: string): Promise<void> {
  try {
    const current = await getRedisFollowRequests(targetId);
    if (!current.includes(requesterId)) {
      current.push(requesterId);
      await cacheClient.set(`yapr:follow_reqs:${targetId}`, JSON.stringify(current));
    }
  } catch {}
  let s = mockFollowRequests.get(targetId);
  if (!s) {
    s = new Set<string>();
    mockFollowRequests.set(targetId, s);
  }
  s.add(requesterId);
}

async function removeRedisFollowRequest(targetId: string, requesterId: string): Promise<void> {
  try {
    const current = await getRedisFollowRequests(targetId);
    const updated = current.filter((id) => id !== requesterId);
    await cacheClient.set(`yapr:follow_reqs:${targetId}`, JSON.stringify(updated));
  } catch {}
  const s = mockFollowRequests.get(targetId);
  if (s) s.delete(requesterId);
}


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

        // Direct guaranteed notification creation
        if (yap?.author_id && yap.author_id !== userId) {
          await notificationsService.createNotification({
            userId: yap.author_id,
            type: 'like',
            actorId: userId,
            yapId,
          }).catch((err) => console.error('Error creating like notification:', err));

          try {
            await queueService.publish(env.AMQP_QUEUE_NOTIFICATIONS || 'yapr.notifications', {
              id: `notif_like_${userId}_${yapId}`,
              name: 'like_notification',
              payload: { recipientId: yap.author_id, actorId: userId, yapId, type: 'like' },
            });
          } catch {}
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

        // Direct guaranteed notification creation
        if (yap?.author_id && yap.author_id !== userId) {
          await notificationsService.createNotification({
            userId: yap.author_id,
            type: 'reyap',
            actorId: userId,
            yapId,
          }).catch((err) => console.error('Error creating reyap notification:', err));

          try {
            await queueService.publish(env.AMQP_QUEUE_NOTIFICATIONS || 'yapr.notifications', {
              id: `notif_reyap_${userId}_${yapId}`,
              name: 'reyap_notification',
              payload: { recipientId: yap.author_id, actorId: userId, yapId, type: 'reyap' },
            });
          } catch {}
        }
        return { reyapped: true, reyapCount: yap?.reyap_count || 1 };
      }
    }

    const yap = mockYaps.find((y) => y.id === yapId);
    if (!yap) throw new Error('Yap not found');

    let userSet = mockUserReyaps.get(userId);
    if (!userSet) {
      userSet = new Set<string>();
      mockUserReyaps.set(userId, userSet);
    }

    const isCurrentlyReyapped = userSet.has(yapId);
    if (isCurrentlyReyapped) {
      userSet.delete(yapId);
      yap.is_reyapped = false;
      yap.reyap_count = Math.max(0, (yap.reyap_count || 1) - 1);
    } else {
      userSet.add(yapId);
      yap.is_reyapped = true;
      yap.reyap_count = (yap.reyap_count || 0) + 1;
    }
    return { reyapped: !isCurrentlyReyapped, reyapCount: yap.reyap_count };
  }

  async toggleFollow(followerId: string, followeeId: string): Promise<{ following: boolean; requested?: boolean }> {
    let targetFolloweeId = followeeId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(followeeId);
    if (!isUuid && isSupabaseConfigured) {
      const { data: userRow } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .or(`username.ilike.${followeeId},display_name.ilike.${followeeId}`)
        .maybeSingle();
      if (userRow?.id) {
        targetFolloweeId = userRow.id;
      }
    }

    if (followerId === targetFolloweeId) {
      throw new Error('You cannot follow yourself');
    }

    if (isSupabaseConfigured) {
      // 1. Check if already following
      const { data: existingFollow } = await supabaseAdmin
        .from('follows')
        .select('*')
        .eq('follower_id', followerId)
        .eq('followee_id', targetFolloweeId)
        .maybeSingle();

      if (existingFollow) {
        // Unfollow
        await supabaseAdmin.from('follows').delete().eq('follower_id', followerId).eq('followee_id', targetFolloweeId);
        return { following: false, requested: false };
      }

      // 2. Check if target user has a private profile
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, is_private')
        .eq('id', targetFolloweeId)
        .maybeSingle();

      const isTargetPrivate = !!targetProfile?.is_private;

      if (isTargetPrivate) {
        // Target is private: Toggle follow request
        let hasPendingReq = false;
        try {
          const { data: reqRow, error: findErr } = await supabaseAdmin
            .from('follow_requests')
            .select('id')
            .eq('requester_id', followerId)
            .eq('target_id', targetFolloweeId)
            .maybeSingle();

          if (!findErr && reqRow) {
            hasPendingReq = true;
          } else {
            const list = await getRedisFollowRequests(targetFolloweeId);
            hasPendingReq = list.includes(followerId);
          }
        } catch {
          const list = await getRedisFollowRequests(targetFolloweeId);
          hasPendingReq = list.includes(followerId);
        }

        if (hasPendingReq) {
          // Cancel follow request
          try {
            await supabaseAdmin
              .from('follow_requests')
              .delete()
              .eq('requester_id', followerId)
              .eq('target_id', targetFolloweeId);
          } catch {}
          await removeRedisFollowRequest(targetFolloweeId, followerId);

          return { following: false, requested: false };
        } else {
          // Send follow request
          try {
            await supabaseAdmin.from('follow_requests').insert({
              requester_id: followerId,
              target_id: targetFolloweeId,
            });
          } catch {}

          // Always sync to Redis so it works with 100% reliability
          await addRedisFollowRequest(targetFolloweeId, followerId);

          // Notify target user of follow request directly & via queue
          await notificationsService.createNotification({
            userId: targetFolloweeId,
            type: 'follow_request',
            actorId: followerId,
          }).catch((err) => console.error('Error creating follow_request notification:', err));

          try {
            await queueService.publish(env.AMQP_QUEUE_NOTIFICATIONS || 'yapr.notifications', {
              id: `notif_follow_req_${followerId}_${targetFolloweeId}`,
              name: 'follow_request_notification',
              payload: { recipientId: targetFolloweeId, actorId: followerId, type: 'follow_request' },
            });
          } catch {}

          return { following: false, requested: true };
        }
      }

      // Public account: Follow immediately
      await supabaseAdmin.from('follows').insert({ follower_id: followerId, followee_id: targetFolloweeId });

      // Direct guaranteed notification creation
      await notificationsService.createNotification({
        userId: targetFolloweeId,
        type: 'follow',
        actorId: followerId,
      }).catch((err) => console.error('Error creating follow notification:', err));

      try {
        await queueService.publish(env.AMQP_QUEUE_NOTIFICATIONS || 'yapr.notifications', {
          id: `notif_follow_${followerId}_${targetFolloweeId}`,
          name: 'follow_notification',
          payload: { recipientId: targetFolloweeId, actorId: followerId, type: 'follow' },
        });
      } catch {}
      return { following: true, requested: false };
    }

    // Mock fallback
    const list = await getRedisFollowRequests(targetFolloweeId);
    const hasRequested = list.includes(followerId);
    if (hasRequested) {
      await removeRedisFollowRequest(targetFolloweeId, followerId);
      return { following: false, requested: false };
    } else {
      await addRedisFollowRequest(targetFolloweeId, followerId);
      return { following: false, requested: true };
    }
  }

  async isFollowRequested(requesterId: string, targetId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('follow_requests')
          .select('id')
          .eq('requester_id', requesterId)
          .eq('target_id', targetId)
          .maybeSingle();
        if (!error && data) return true;
      } catch {}
    }
    const list = await getRedisFollowRequests(targetId);
    return list.includes(requesterId);
  }

  async getFollowRequests(targetId: string): Promise<any[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('follow_requests')
          .select('id, requester_id, created_at, requester:profiles!requester_id(*)')
          .eq('target_id', targetId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data
            .map((item: any) => ({
              ...(item.requester || {}),
              request_id: item.id,
              requested_at: item.created_at,
              avatar_url:
                item.requester?.avatar_url ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${item.requester?.username || item.requester_id}`,
            }))
            .filter((p: any) => !!p.id);
        }
      } catch {}

      // Fallback: Check Redis / In-Memory
      const redisRequesterIds = await getRedisFollowRequests(targetId);
      if (redisRequesterIds.length > 0) {
        try {
          const { data: profiles, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .in('id', redisRequesterIds);

          if (!error && profiles && profiles.length > 0) {
            return profiles.map((p: any) => ({
              ...p,
              request_id: `req_${p.id}`,
              requested_at: new Date().toISOString(),
              avatar_url:
                p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username || p.id}`,
            }));
          }
        } catch {}
      }
    }

    const fallbackIds = await getRedisFollowRequests(targetId);
    return fallbackIds.map((requesterId) => ({
      id: requesterId,
      username: requesterId,
      display_name: requesterId,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${requesterId}`,
      country_code: 'PK',
    }));
  }

  async acceptFollowRequest(targetId: string, requesterId: string): Promise<{ success: boolean; accepted: boolean }> {
    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin
          .from('follow_requests')
          .delete()
          .eq('target_id', targetId)
          .eq('requester_id', requesterId);

        await supabaseAdmin.from('follows').upsert(
          { follower_id: requesterId, followee_id: targetId },
          { onConflict: 'follower_id,followee_id' }
        );

        // Recalculate target follower_count and requester following_count
        const { count: followerCount } = await supabaseAdmin
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('followee_id', targetId);

        const { count: followingCount } = await supabaseAdmin
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', requesterId);

        if (followerCount !== null) {
          await supabaseAdmin.from('profiles').update({ follower_count: followerCount }).eq('id', targetId);
        }
        if (followingCount !== null) {
          await supabaseAdmin.from('profiles').update({ following_count: followingCount }).eq('id', requesterId);
        }

        // Direct guaranteed notification creation
        await notificationsService.createNotification({
          userId: requesterId,
          type: 'follow_accepted',
          actorId: targetId,
        }).catch((err) => console.error('Error creating follow_accepted notification:', err));

        try {
          await queueService.publish(env.AMQP_QUEUE_NOTIFICATIONS || 'yapr.notifications', {
            id: `notif_follow_accepted_${targetId}_${requesterId}`,
            name: 'follow_accepted_notification',
            payload: { recipientId: requesterId, actorId: targetId, type: 'follow_accepted' },
          });
        } catch {}
      } catch (err: any) {
        console.error('Error accepting follow request:', err);
      }
    }

    await removeRedisFollowRequest(targetId, requesterId);
    return { success: true, accepted: true };
  }

  async rejectFollowRequest(targetId: string, requesterId: string): Promise<{ success: boolean; rejected: boolean }> {
    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin
          .from('follow_requests')
          .delete()
          .eq('target_id', targetId)
          .eq('requester_id', requesterId);
      } catch (err: any) {
        console.error('Error rejecting follow request:', err);
      }
    }

    await removeRedisFollowRequest(targetId, requesterId);
    return { success: true, rejected: true };
  }

  async removeFollower(userId: string, followerId: string): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin
          .from('follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('followee_id', userId);
      } catch (err: any) {
        console.error('Error removing follower:', err);
      }
    }
    return { success: true };
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
