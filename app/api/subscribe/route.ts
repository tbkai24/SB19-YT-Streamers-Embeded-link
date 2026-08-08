import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const body = await request.json();
    const endpoint = body.endpoint;
    const keys = body.keys || body.subscription?.keys;
    const userAgent = body.userAgent || body.user_agent || 'Unknown';

    // ✅ Validate subscription data
    if (!endpoint || !keys || typeof endpoint !== 'string' || !endpoint.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Invalid subscription data - must be HTTPS endpoint' },
        { status: 400 }
      );
    }

    if (!keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: 'Missing p256dh or auth keys' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // ✅ Upsert by endpoint to prevent duplicates
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        endpoint,
        keys,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'endpoint'
      })
      .select();

    if (error) {
      console.error('Supabase Subscribe Error:', error);
      return NextResponse.json(
        { error: error.message || 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, subscription: data?.[0] || null });

  } catch (err: any) {
    console.error('Subscribe Exception:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
