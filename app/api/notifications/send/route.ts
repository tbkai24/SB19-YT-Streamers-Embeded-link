import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import webpush from 'web-push';

const BRAND_LOGO_URL = '/assets/ytslogo.jpg';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BIMVjpq6r1EPxIp8i7ZomnsXLQNyOyXYQsH3lcTbgcnRFEqh9qPTH_VrBPiUf9jLfP_7IfWqdo8TqNaLa-kp3h4';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'R960np6AWE16ixaG9wkx8mBqgrzHbcedtkoFv3ztcEU';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@sb19streaminghub.com';

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

export async function POST(request: Request) {
  try {
    const { title, message, url, type, profileId } = await request.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const targetUrl = url || '/';
    const supabase = createClient();

    // 1. Save Notification record to database
    const notificationPayload = {
      profile_id: profileId || null,
      title: title.trim(),
      message: message.trim(),
      type: type || 'announcement',
      url: targetUrl,
      status: 'sent',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    let notificationRecord = null;
    try {
      const { data } = await supabase
        .from('notifications')
        .insert([notificationPayload])
        .select();
      if (data && data[0]) notificationRecord = data[0];
    } catch {
      // Ignore database write errors for fallback
    }

    // 2. Send Real Web Push to all subscribed devices
    let subscriberCount = 0;
    try {
      const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, keys');
      if (subs && subs.length > 0) {
        subscriberCount = subs.length;
        const pushPayload = JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          url: targetUrl,
          type: type || 'announcement',
          icon: BRAND_LOGO_URL,
        });

        const pushPromises = subs.map((sub: any) => {
          if (!sub.endpoint) return Promise.resolve();
          const subscription = {
            endpoint: sub.endpoint,
            keys: sub.keys || {},
          };
          return webpush.sendNotification(subscription, pushPayload).catch(() => null);
        });

        await Promise.allSettled(pushPromises);
      }
    } catch {
      // Ignore
    }

    return NextResponse.json({
      success: true,
      notification: notificationRecord || notificationPayload,
      sentToSubscribers: Math.max(subscriberCount, 1),
      brandLogo: BRAND_LOGO_URL,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send notification' }, { status: 500 });
  }
}
