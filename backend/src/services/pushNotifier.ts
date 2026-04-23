import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'support@cryptax.live'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export const sendPushToUser = async (
  userId: string,
  payload: { title: string; body: string; icon?: string }
): Promise<void> => {
  if (!process.env.VAPID_PUBLIC_KEY) return; // push not configured — skip silently

  try {
    const subs = await PushSubscription.find({ userId });
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify({ ...payload, icon: payload.icon ?? '/logo.png' })
        );
      } catch (err: any) {
        // 410 Gone = subscription expired — clean it up
        if (err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    }
  } catch (err) {
    console.error('[Push] Error sending notification:', err);
  }
};
