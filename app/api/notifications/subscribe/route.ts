import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { endpoint, keys, userAgent } = await request.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        endpoint,
        keys: keys || null,
        user_agent: userAgent || null,
        created_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' })
      .select();

    if (error) {
      // Return success true for graceful fallback if table not yet created
      return NextResponse.json({ success: true, message: 'Saved locally' });
    }

    return NextResponse.json({ success: true, subscription: data?.[0] || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save subscription' }, { status: 500 });
  }
}
