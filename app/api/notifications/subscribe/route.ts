import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { endpoint, subscription, keys, userAgent } = await request.json();

    // 1. Strict validation: Must be an HTTPS Push Service endpoint (FCM, Apple APNs, Mozilla)
    if (!endpoint || typeof endpoint !== 'string' || !endpoint.startsWith('https://')) {
      return NextResponse.json({ error: 'Valid HTTPS WebPush endpoint is required' }, { status: 400 });
    }

    const subKeys = keys || subscription?.keys || null;
    if (!subKeys || !subKeys.p256dh || !subKeys.auth) {
      return NextResponse.json({ error: 'Subscription p256dh and auth keys are required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        endpoint,
        keys: subKeys,
        user_agent: userAgent || null,
        created_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, subscription: data?.[0] || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save subscription' }, { status: 500 });
  }
}
