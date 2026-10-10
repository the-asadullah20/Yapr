import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';
import { emitToUser } from '../../realtime/socket.js';

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  actor_ids: string[];
  yap_id?: string;
  read_at?: string | null;
  created_at: string;
  actors?: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  }>;
  formatted_text?: string;
}

const mockNotifications: NotificationItem[] = [
  {
    id: 'n1111111-1111-1111-1111-111111111111',
    user_id: 'a1111111-1111-1111-1111-111111111111',
    type: 'like',
    actor_ids: ['b2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333'],
    yap_id: 'f4444444-4444-4444-4444-444444444444',
    read_at: null,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    actors: [
      { id: 'b2222222-2222-2222-2222-222222222222', username: 'panfengshui', display_name: 'Pan Feng Shui', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
      { id: 'c3333333-3333-3333-3333-333333333333', username: 'clarakim', display_name: 'Clara Kim', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    ],
    formatted_text: 'Pan Feng Shui and Clara Kim liked your Yap',
  },
  {
    id: 'n2222222-2222-2222-2222-222222222222',
    user_id: 'a1111111-1111-1111-1111-111111111111',
    type: 'follow',
    actor_ids: ['c3333333-3333-3333-3333-333333333333'],
    read_at: null,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    actors: [
      { id: 'c3333333-3333-3333-3333-333333333333', username: 'clarakim', display_name: 'Clara Kim', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    ],
    formatted_text: 'Clara Kim started following you',
  },
];

export class NotificationsService {
  private formatNotificationText(type: string, actors: any[]): string {
    if (!actors || actors.length === 0) {
      return type === 'like' ? 'Someone liked your Yap' : `New ${type} notification`;
    }
    const primaryName = actors[0].display_name || `@${actors[0].username}` || 'Someone';
    if (actors.length === 1) {
      switch (type) {
        case 'like':
          return `${primaryName} liked your Yap`;
        case 'reply':
          return `${primaryName} commented on your Yap`;
        case 'reyap':
          return `${primaryName} shared your Yap`;
        case 'follow':
          return `${primaryName} started following you`;
        case 'follow_request':
          return `${primaryName} requested to follow you`;
        case 'follow_accepted':
          return `${primaryName} accepted your follow request`;
        case 'new_yap':
          return `${primaryName} posted a new Yap`;
        default:
          return `${primaryName} interacted with you`;
      }
    }
    const othersCount = actors.length - 1;
    const othersLabel = othersCount === 1 ? '1 other' : `${othersCount} others`;
    switch (type) {
      case 'like':
        return `${primaryName} and ${othersLabel} liked your Yap`;
      case 'reply':
        return `${primaryName} and ${othersLabel} commented on your Yap`;
      case 'reyap':
        return `${primaryName} and ${othersLabel} shared your Yap`;
      case 'follow':
        return `${primaryName} and ${othersLabel} started following you`;
      case 'follow_request':
        return `${primaryName} and ${othersLabel} requested to follow you`;
      case 'follow_accepted':
        return `${primaryName} and ${othersLabel} accepted your follow request`;
      default:
        return `${primaryName} and ${othersLabel} interacted with you`;
    }
  }

  async getNotifications(userId: string): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(40);

      if (!error && data) {
        const unreadCount = data.filter((n) => !n.read_at).length;

        // Gather all actor UUIDs
        const actorIdSet = new Set<string>();
        data.forEach((row: any) => {
          if (Array.isArray(row.actor_ids)) {
            row.actor_ids.forEach((id: string) => actorIdSet.add(id));
          }
        });

        // Batch fetch profile data for all actors
        const actorIds = Array.from(actorIdSet);
        const profileMap = new Map<string, any>();
        if (actorIds.length > 0) {
          const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, username, display_name, avatar_url, is_verified')
            .in('id', actorIds);

          (profiles || []).forEach((p: any) => {
            profileMap.set(p.id, {
              ...p,
              avatar_url: p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username || p.id}`,
            });
          });
        }

        const enriched: NotificationItem[] = data.map((row: any) => {
          const rawActorIds: string[] = Array.isArray(row.actor_ids) ? row.actor_ids : [];
          const actors = rawActorIds.map(
            (id) =>
              profileMap.get(id) || {
                id,
                username: 'yapr',
                display_name: 'A user',
                avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
              }
          );
          return {
            id: row.id,
            user_id: row.user_id,
            type: row.type,
            actor_ids: rawActorIds,
            yap_id: row.yap_id,
            read_at: row.read_at,
            created_at: row.created_at,
            actors,
            formatted_text: this.formatNotificationText(row.type, actors),
          };
        });

        return { notifications: enriched, unreadCount };
      }
    }

    return { notifications: mockNotifications.filter((n) => n.user_id === userId), unreadCount: 0 };
  }

  async markAllAsRead(userId: string): Promise<void> {
    if (isSupabaseConfigured) {
      await supabaseAdmin
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);
    }
    mockNotifications.forEach((n) => {
      if (n.user_id === userId) n.read_at = new Date().toISOString();
    });
  }

  async createNotification(params: {
    userId: string;
    type: string;
    actorId: string;
    yapId?: string;
  }): Promise<void> {
    const { userId, type, actorId, yapId } = params;
    if (userId === actorId) return; // don't notify self

    let actorProfile: any = null;
    if (isSupabaseConfigured) {
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_verified')
        .eq('id', actorId)
        .single();
      actorProfile = p;
    }

    const fallbackActor = actorProfile || {
      id: actorId,
      username: 'yapr',
      display_name: 'Someone',
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${actorId}`,
    };

    const notifItem: NotificationItem = {
      id: crypto.randomUUID(),
      user_id: userId,
      type,
      actor_ids: [actorId],
      yap_id: yapId,
      read_at: null,
      created_at: new Date().toISOString(),
      actors: [fallbackActor],
      formatted_text: this.formatNotificationText(type, [fallbackActor]),
    };

    if (isSupabaseConfigured) {
      await supabaseAdmin.from('notifications').insert({
        id: notifItem.id,
        user_id: userId,
        type,
        actor_ids: notifItem.actor_ids,
        yap_id: yapId || null,
      });
    } else {
      mockNotifications.unshift(notifItem);
    }

    // Push live over WebSocket!
    emitToUser(userId, 'notification:new', notifItem);
  }
}

export const notificationsService = new NotificationsService();
