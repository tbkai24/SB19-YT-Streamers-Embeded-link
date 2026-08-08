import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const BRAND_LOGO_URL = '/assets/ytslogo.jpg';

// ✅ Use environment variables ONLY - no hardcoded fallbacks
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@sb19streaminghub.com';

// ✅ Validate keys before setting
if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('❌ VAPID keys missing! Check environment variables.');
} else {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (e: any) {
    console.error('VAPID setup error:', e.message);
  }
}

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!url || !key) {
    throw new Error('Supabase URL or Service Role Key missing');
  }
  
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

    // ✅ Check if VAPID is configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'Push service not configured' }, { status: 500 });
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
        .select('*')
        .like('endpoint', 'https://%')
        .not('keys', 'is', null);

      if (subs && subs.length > 0) {
        // Strictly deduplicate subscriptions by p256dh device key so each physical device gets EXACTLY 1 push
        const uniqueSubsMap = new Map();
        for (const sub of subs) {
          const deviceKey = sub.keys?.p256dh || sub.endpoint;
          if (!uniqueSubsMap.has(deviceKey)) {
            uniqueSubsMap.set(deviceKey, sub);
          }
        }
        const uniqueSubs = Array.from(uniqueSubsMap.values());

        const pushPayload = JSON.stringify({
          id: notificationRecord?.id || Date.now(),
          title: title.trim(),
          message: message.trim(),
          url: targetUrl,
          type: type || 'announcement',
          icon: BRAND_LOGO_URL,
        });

        const pushPromises = uniqueSubs.map(async (sub: any) => {
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
            console.error('Push failed:', err.statusCode, err.message);
            if (err.statusCode === 404 || err.statusCode === 410) {
              expiredEndpoints.push(sub.endpoint);
            }
          }
        });

        await Promise.allSettled(pushPromises);
      }
    } catch (err) {
      console.error('Subscription fetch error:', err);
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
      sentToSubscribers: deliveredCount,
      expiredRemoved: expiredEndpoints.length,
      brandLogo: BRAND_LOGO_URL,
    });
  } catch (error: any) {
    console.error('Send push error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send notification' }, { status: 500 });
  }
}
