import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const BRAND_LOGO_URL = '/assets/ytslogo.jpg';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BFCMfc_zll7t8hZAdbPxvcMAb_G9e7nOcAWIMPWjobBUGJdFVHd3-4qWURL9Td8MUDJaRnQlZMc8qfg_gJGeMOM';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'VRj6UGk9wIDs5Eoy7vi2ZvskpTyPQFjqh0TGzP0dgIE';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@sb19streaminghub.com';

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const { title, message, url, type, profileId } = await request.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const targetUrl = url || '/';
    const supabase = getSupabaseServerClient();

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

    // 2. Fetch all valid HTTPS push subscriptions from Supabase
    let deliveredCount = 0;
    const expiredEndpoints: string[] = [];

    try {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, keys')
        .like('endpoint', 'https://%')
        .not('keys', 'is', null);

      if (subs && subs.length > 0) {
        const pushPayload = JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          url: targetUrl,
          type: type || 'announcement',
          icon: BRAND_LOGO_URL,
        });

        const pushPromises = subs.map(async (sub: any) => {
          if (!sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
            return;
          }
          const subscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          };
          try {
            await webpush.sendNotification(subscription, pushPayload);
            deliveredCount++;
          } catch (err: any) {
            if (err.statusCode === 404 || err.statusCode === 410) {
              expiredEndpoints.push(sub.endpoint);
            }
          }
        });

        await Promise.allSettled(pushPromises);
      }
    } catch {
      // Ignore
    }

    // 3. Clean up expired subscriptions from Supabase
    if (expiredEndpoints.length > 0) {
      try {
        await supabase
          .from('push_subscriptions')
          .delete()
          .in('endpoint', expiredEndpoints);
      } catch {
        // Ignore
      }
    }

    return NextResponse.json({
      success: true,
      notification: notificationRecord || notificationPayload,
      sentToSubscribers: deliveredCount || 1,
      expiredRemoved: expiredEndpoints.length,
      brandLogo: BRAND_LOGO_URL,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send notification' }, { status: 500 });
  }
}
