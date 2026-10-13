import webpush, { PushSubscription } from 'web-push';
import { env } from '../../config/env.js';
import { cacheClient } from '../../config/redis.js';
import { supabaseAdmin, isSupabaseConfigured } from '../../config/supabase.js';

const DEFAULT_VAPID_PUBLIC_KEY = 'BCAyN1UmZ-Mm19DvcqlW6snQSc5oXKGztiuFzjUpzI1Lmd3irbpvGvv-J6eN7kVl-g337na73u4Op4k7Dplh65c';
const DEFAULT_VAPID_PRIVATE_KEY = 'Wi_eNIt3tmhfhi5IopoXz6nltdDcDCRNEiFqlpVH1r4';
const DEFAULT_VAPID_SUBJECT = 'mailto:admin@yapr.app';

const activePublicKey = env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
const activePrivateKey = env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
const activeSubject = env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;

// Configure VAPID details globally
try {
  webpush.setVapidDetails(
    activeSubject,
    activePublicKey,
    activePrivateKey
  );
} catch (e: any) {
  console.warn('[WebPush] Error setting VAPID details:', e?.message || e);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  yapId?: string;
  icon?: string;
  badge?: string;
}

export class WebPushService {
  getPublicKey(): string {
    return activePublicKey;
  }

  /**
   * Save a Web Push subscription for a user.
   * Stores multiple devices (e.g. mobile phone + desktop laptop) per user.
   */
  async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    if (!subscription || !subscription.endpoint) return;

    const redisKey = `yapr:push_subs:${userId}`;
    const subStr = JSON.stringify(subscription);

    try {
      const existingRaw = await cacheClient.get(redisKey);
      let list: PushSubscription[] = [];
      if (existingRaw) {
        try {
          list = JSON.parse(existingRaw);
          if (!Array.isArray(list)) list = [];
        } catch {
          list = [];
        }
      }

      // Deduplicate by endpoint
      const filtered = list.filter((s) => s.endpoint !== subscription.endpoint);
      filtered.push(subscription);

      // Keep maximum 5 most recent active devices
      const trimmed = filtered.slice(-5);

      // Store in Redis (TTL: 90 days = 7776000 seconds)
      await cacheClient.set(redisKey, JSON.stringify(trimmed), 7776000);
    } catch (err) {
      console.warn(`[WebPush] Failed to persist subscription to Redis for user ${userId}:`, err);
    }

    // Optional Supabase persistence if table push_subscriptions exists
    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin.from('push_subscriptions').upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys?.p256dh || '',
          auth: subscription.keys?.auth || '',
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Table might not exist in Supabase yet, Redis is primary store
      }
    }
  }

  /**
   * Remove a Web Push subscription for a user (on logout or permission revoke)
   */
  async removeSubscription(userId: string, endpoint?: string): Promise<void> {
    const redisKey = `yapr:push_subs:${userId}`;
    if (!endpoint) {
      await cacheClient.del(redisKey).catch(() => {});
      return;
    }

    try {
      const existingRaw = await cacheClient.get(redisKey);
      if (existingRaw) {
        const list: PushSubscription[] = JSON.parse(existingRaw);
        const filtered = list.filter((s) => s.endpoint !== endpoint);
        if (filtered.length > 0) {
          await cacheClient.set(redisKey, JSON.stringify(filtered), 7776000);
        } else {
          await cacheClient.del(redisKey);
        }
      }
    } catch {}

    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint);
      } catch {}
    }
  }

  /**
   * Dispatch a Web Push notification to all active devices of a user.
   * If a user cleared browser cache or uninstalled app (404/410 Gone), dead subscriptions are purged automatically.
   */
  async sendPushNotification(userId: string, payload: PushNotificationPayload): Promise<void> {
    const redisKey = `yapr:push_subs:${userId}`;
    let subscriptions: PushSubscription[] = [];

    try {
      const raw = await cacheClient.get(redisKey);
      if (raw) {
        subscriptions = JSON.parse(raw);
        if (!Array.isArray(subscriptions)) subscriptions = [];
      }
    } catch {}

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const jsonPayload = JSON.stringify({
      title: payload.title || 'Yapr',
      body: payload.body || 'You have a new update on Yapr',
      url: payload.url || '/',
      yapId: payload.yapId,
      icon: payload.icon || '/logo.png',
      badge: payload.badge || '/logo.png',
    });

    const deadEndpoints: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, jsonPayload);
        } catch (err: any) {
          // HTTP 404 or 410 indicates subscription has expired or was revoked by the user
          if (err.statusCode === 404 || err.statusCode === 410) {
            deadEndpoints.push(sub.endpoint);
          } else {
            console.warn(`[WebPush] Push delivery warning for ${sub.endpoint.slice(0, 30)}...:`, err.message);
          }
        }
      })
    );

    // Clean up expired dead endpoints
    if (deadEndpoints.length > 0) {
      const surviving = subscriptions.filter((s) => !deadEndpoints.includes(s.endpoint));
      if (surviving.length > 0) {
        await cacheClient.set(redisKey, JSON.stringify(surviving), 7776000).catch(() => {});
      } else {
        await cacheClient.del(redisKey).catch(() => {});
      }
    }
  }
}

export const webPushService = new WebPushService();
