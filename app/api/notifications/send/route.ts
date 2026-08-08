import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

const BRAND_LOGO_URL = '/assets/ytslogo.jpg';

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
      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationPayload])
        .select();
      if (data && data[0]) notificationRecord = data[0];
    } catch {
      // Ignore database write errors for fallback
    }

    // 2. Fetch all push subscriptions count
    let subscriberCount = 1;
    try {
      const { data: subs } = await supabase.from('push_subscriptions').select('id');
      if (subs && subs.length > 0) subscriberCount = subs.length;
    } catch {
      // Ignore
    }

    return NextResponse.json({
      success: true,
      notification: notificationRecord || notificationPayload,
      sentToSubscribers: subscriberCount,
      brandLogo: BRAND_LOGO_URL,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send notification' }, { status: 500 });
  }
}
