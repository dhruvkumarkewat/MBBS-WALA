/**
 * Shared Web Push helper — used by upi-payment.js and admin-notify.js
 * Requires: npm install web-push  +  VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in env
 */

let _webpush = null;

async function getWebPush() {
  if (_webpush) return _webpush;
  try {
    const mod = await import('web-push');
    _webpush = mod.default || mod;
    return _webpush;
  } catch {
    return null;
  }
}

/**
 * Send a single Web Push notification to one subscription row.
 * @param {object} subscription  Row from push_subscriptions table { endpoint, p256dh, auth }
 * @param {object} payload       { title, body, data: { url, ... } }
 */
export async function sendWebPush(subscription, payload) {
  const webpush = await getWebPush();
  if (!webpush) {
    console.warn('[push-helper] web-push module not available');
    return;
  }

  const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject    = process.env.VAPID_SUBJECT || 'mailto:admin@mbbswala.in';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[push-helper] VAPID keys not configured — skipping push');
    return;
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({
        title: payload.title || 'MBBSWala',
        body:  payload.body  || '',
        icon:  '/favicon-192.png',
        badge: '/favicon-32.png',
        data:  payload.data  || {},
        tag:   payload.tag   || 'mbbswala-notification',
      })
    );
  } catch (err) {
    // 410 Gone = subscription expired / user unsubscribed
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log('[push-helper] Subscription expired, should delete:', subscription.endpoint);
    } else {
      console.warn('[push-helper] sendNotification error:', err.message);
    }
  }
}

/**
 * Send web push to multiple user IDs by looking up their push_subscriptions.
 * @param {object} supabase   Supabase client
 * @param {string[]} userIds  Array of user IDs to notify
 * @param {object} payload    { title, body, data, tag }
 */
export async function sendWebPushToUsers(supabase, userIds, payload) {
  if (!userIds || userIds.length === 0) return;

  try {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (!subs || subs.length === 0) return;

    await Promise.allSettled(subs.map((sub) => sendWebPush(sub, payload)));
  } catch (err) {
    console.warn('[push-helper] sendWebPushToUsers error:', err.message);
  }
}
