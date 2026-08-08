import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = createClient();

    // 1. Delete rows where endpoint doesn't start with https://
    const { data: invalidEndpoints, error: err1 } = await supabase
      .from('push_subscriptions')
      .delete()
      .not('endpoint', 'like', 'https://%')
      .select();

    // 2. Delete rows where keys is NULL
    const { data: nullKeys, error: err2 } = await supabase
      .from('push_subscriptions')
      .delete()
      .is('keys', null)
      .select();

    const cleanedCount = (invalidEndpoints?.length || 0) + (nullKeys?.length || 0);

    return NextResponse.json({
      success: true,
      cleanedCount,
      removedInvalidEndpoints: invalidEndpoints?.length || 0,
      removedNullKeys: nullKeys?.length || 0,
      errors: [err1?.message, err2?.message].filter(Boolean),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Cleanup failed' }, { status: 500 });
  }
}
