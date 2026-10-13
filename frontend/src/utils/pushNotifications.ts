import { api } from '../api/apiClient';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('[Push] ServiceWorker registration failed:', err);
    return null;
  }
}

export async function subscribeToPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications are not supported by this browser.' };
  }

  try {
    // 1. Request OS/Browser permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied.' };
    }

    // 2. Register Service Worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, error: 'Failed to register service worker.' };
    }

    // Wait until service worker is active
    await navigator.serviceWorker.ready;

    // 3. Fetch VAPID public key from backend
    const vapidPublicKey = await api.getVapidPublicKey();
    if (!vapidPublicKey) {
      return { success: false, error: 'VAPID public key not found on server.' };
    }

    // 4. Subscribe with PushManager
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // 5. Send subscription to backend
    await api.subscribePush(subscription.toJSON());

    return { success: true };
  } catch (err: any) {
    console.error('[Push] Subscription failed:', err);
    return { success: false, error: err?.message || 'Failed to subscribe to push notifications.' };
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * If permission was already granted in a previous session,
 * re-sync the push subscription with the backend automatically.
 */
export async function syncPushIfGranted(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  try {
    await registerServiceWorker();
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.subscribePush(subscription.toJSON());
    } else {
      const vapidPublicKey = await api.getVapidPublicKey();
      if (vapidPublicKey) {
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        await api.subscribePush(sub.toJSON());
      }
    }
  } catch (err) {
    console.warn('[Push] Auto-sync failed:', err);
  }
}
