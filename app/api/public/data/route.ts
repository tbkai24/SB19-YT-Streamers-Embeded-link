import { NextResponse } from 'next/server';

export const revalidate = 60; // Revalidate every 60 seconds at edge

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cnvxdxltwpwmnrfqvpqq.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  try {
    const [profilesRes, articlesRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/profiles?select=*&status=eq.published&order=display_order.asc`, {
        headers,
        next: { revalidate: 60 },
      }),
      fetch(`${supabaseUrl}/rest/v1/articles?select=*&status=eq.published&order=display_order.asc`, {
        headers,
        next: { revalidate: 60 },
      }),
    ]);

    const profiles = profilesRes.ok ? await profilesRes.json() : [];
    const articles = articlesRes.ok ? await articlesRes.json() : [];

    return NextResponse.json(
      { profiles, articles, timestamp: new Date().toISOString() },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
