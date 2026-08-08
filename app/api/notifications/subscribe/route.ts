import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const { endpoint, subscription, keys, userAgent } = await request.json();

    if (!endpoint || typeof endpoint !== 'string' || !endpoint.startsWith('https://')) {
      return NextResponse.json({ error: 'Valid HTTPS WebPush endpoint is required' }, { status: 400 });
    }

    const subKeys = keys || subscription?.keys || null;
    if (!subKeys || !subKeys.p256dh || !subKeys.auth) {
      return NextResponse.json({ error: 'Subscription p256dh and auth keys are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    // First try upsert
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
      console.error('Supabase Subscribe Error:', error);
      // Fallback: If upsert failed due to constraint or RLS, try explicit select/insert
      const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('endpoint', endpoint)
        .single();

      if (!existing) {
        const { data: inserted, error: insertErr } = await supabase
          .from('push_subscriptions')
          .insert([{
            endpoint,
            keys: subKeys,
            user_agent: userAgent || null,
            created_at: new Date().toISOString(),
          }])
          .select();

        if (insertErr) {
          return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, subscription: inserted?.[0] || null });
      } else {
        const { data: updated, error: updateErr } = await supabase
          .from('push_subscriptions')
          .update({ keys: subKeys, user_agent: userAgent || null })
          .eq('endpoint', endpoint)
          .select();

        if (updateErr) {
          return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, subscription: updated?.[0] || null });
      }
    }

    return NextResponse.json({ success: true, subscription: data?.[0] || null });
  } catch (error: any) {
    console.error('Subscribe Route Exception:', error);
    return NextResponse.json({ error: error.message || 'Failed to save subscription' }, { status: 500 });
  }
}
