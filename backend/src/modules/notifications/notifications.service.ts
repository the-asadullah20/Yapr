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
  async getNotifications(userId: string): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        const unreadCount = data.filter((n) => !n.read_at).length;
        return { notifications: data, unreadCount };
      }
    }

    return { notifications: [], unreadCount: 0 };
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

    const notifItem: NotificationItem = {
      id: crypto.randomUUID(),
      user_id: userId,
      type,
      actor_ids: [actorId],
      yap_id: yapId,
      read_at: null,
      created_at: new Date().toISOString(),
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
