// Push Notification Service Worker Registration & Web Push utilities

// VAPID public key — safe to hardcode (it's public by design)
// Falls back to hardcoded value when env var isn't available in the build
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
  || 'BOGT9aKRMuwAK5WaxDuSnTUNFsytfPlDoWlkyGdLfc4fvlKeMRvrK44mgVlENoXFSOcNnfmtuiwJvBsbbYujMLw';
const SW_PATH = '/sw.js';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service workers not supported in this browser');
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    console.log('[SW] Registered:', reg.scope);
    return reg;
  } catch (err) {
    console.warn('[SW] Registration failed:', err);
    return null;
  }
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const permission = await Notification.requestPermission();
  return permission;
}

export async function subscribeToPush(apiJsonFn: Function): Promise<boolean> {
  try {
    const permission = await requestPushPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Permission denied');
      return false;
    }

    const reg = await registerServiceWorker();
    if (!reg) return false;

    if (!VAPID_PUBLIC_KEY) {
      console.warn('[Push] No VAPID key configured — skipping web push subscription');
      return false;
    }

    // Check if already subscribed with same endpoint
    const existing = await reg.pushManager.getSubscription();
    let subscription = existing;

    if (!existing) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
    }

    if (!subscription) return false;

    const subJson = subscription.toJSON();
    await apiJsonFn('/api/upi-payment', {
      method: 'POST',
      body: JSON.stringify({
        action: 'save-push-subscription',
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      }),
    }, true);

    console.log('[Push] Subscribed + saved successfully');
    return true;
  } catch (err) {
    console.warn('[Push] Subscribe error:', err);
    return false;
  }
}

/**
 * Call this once after the user logs in.
 * Registers the SW, asks for notification permission, subscribes, and saves to backend.
 * Safe to call multiple times — it's idempotent.
 */
export async function initPushNotifications(apiJsonFn: Function): Promise<void> {
  try {
    // Register SW first (even if no push, needed for offline cache)
    const reg = await registerServiceWorker();
    if (!reg) return;

    // Only attempt push if permission not already denied
    if (Notification.permission === 'denied') {
      console.warn('[Push] Notifications blocked by user');
      return;
    }

    await subscribeToPush(apiJsonFn);
  } catch (err) {
    console.warn('[Push] initPushNotifications error:', err);
  }
}

// ---------------------------------------------------------------------------
// In-app helpers (when website IS open)
// ---------------------------------------------------------------------------

/** Play a gentle notification chime (in-app) */
export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Audio context not available
  }
}

/** Show a browser notification when the page is already visible */
export function showBrowserNotification(title: string, body: string, url?: string) {
  if (Notification.permission !== 'granted') return;
  const n = new Notification(title, {
    body,
    icon: '/favicon-192.png',
    badge: '/favicon-32.png',
  });
  if (url) {
    n.onclick = () => {
      window.focus();
      window.location.href = url;
    };
  }
}
