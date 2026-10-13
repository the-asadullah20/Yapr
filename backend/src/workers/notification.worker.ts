import { queueService, QueueJob } from '../config/queue.js';
import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { notificationsService } from '../modules/notifications/notifications.service.js';
import { emitToUser, broadcastToFeed } from '../realtime/socket.js';
import { env } from '../config/env.js';
import { webPushService } from '../modules/notifications/webpush.service.js';

export function registerNotificationWorker(): void {
  // Worker 1: Yap Created -> Fan-out to followers
  queueService.subscribe(env.AMQP_QUEUE_YAP_CREATED || 'yapr.yap.created', async (job: QueueJob) => {
    const { yapId, authorId, parentId, body } = job.payload;

    // Comments / replies must NOT send 'new_yap' notifications to all followers!
    // They are targeted replies to the parent author & mentioned users only.
    if (parentId) {
      console.log(`💬 [Notification Worker] Skipping new_yap fan-out for comment/reply ${yapId}`);
      return;
    }

    console.log(`📢 [Notification Worker] Processing yap.created fan-out for Yap ${yapId}`);

    // Broadcast feed update to all connected viewers
    broadcastToFeed('feed:new_yap', { yapId, authorId });

    if (isSupabaseConfigured) {
      // Lookup follower count
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('follower_count, display_name, avatar_url')
        .eq('id', authorId)
        .single();

      const followerCount = profile?.follower_count || 0;
      const FAN_OUT_THRESHOLD = 10000;

      if (followerCount < FAN_OUT_THRESHOLD) {
        // Fan-out on write: batch fetch followers
        const { data: followers } = await supabaseAdmin
          .from('follows')
          .select('follower_id')
          .eq('followee_id', authorId);

        if (followers && followers.length > 0) {
          const notificationsToInsert = followers.map((f) => ({
            user_id: f.follower_id,
            type: 'new_yap',
            actor_ids: [authorId],
            yap_id: yapId,
            created_at: new Date().toISOString(),
          }));

          // Batch insert in chunks of 500
          for (let i = 0; i < notificationsToInsert.length; i += 500) {
            const chunk = notificationsToInsert.slice(i, i + 500);
            await supabaseAdmin.from('notifications').insert(chunk);
          }

          // Push live socket alert to online followers and Web Push to background devices
          followers.forEach((f) => {
            const followerMessage = `${profile?.display_name || 'Someone you follow'} posted a new Yap`;

            emitToUser(f.follower_id, 'notification:new', {
              type: 'new_yap',
              yapId,
              authorId,
              message: followerMessage,
            });

            webPushService
              .sendPushNotification(f.follower_id, {
                title: `${profile?.display_name || 'Yapr'}`,
                body: followerMessage,
                yapId,
                url: `/?yapId=${yapId}`,
                icon: profile?.avatar_url || '/logo.png',
              })
              .catch(() => {});
          });
        }
      } else {
        // For celebrities / high-follower accounts (>10k): Fan-out on read / pull on read
        console.log(`⚡ [Notification Worker] High-follower account (${followerCount}), using pull-on-read strategy`);
      }
    }
  });

  // Worker 2: Direct Social Notifications (Likes, Reyaps, Follows)
  queueService.subscribe(env.AMQP_QUEUE_NOTIFICATIONS || 'yapr.notifications', async (job: QueueJob) => {
    const { recipientId, actorId, yapId, type } = job.payload;
    console.log(`🔔 [Notification Worker] Creating notification of type '${type}' for user ${recipientId}`);
    await notificationsService.createNotification({
      userId: recipientId,
      type,
      actorId,
      yapId,
    });
  });
}
