import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cnvxdxltwpwmnrfqvpqq.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNudnhkeGx0d3B3bW5yZnF2cHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjY1MzMsImV4cCI6MjA4NzE0MjUzM30.hSCWNAZNzWQTVDPPeUy7QWhqyXeqIhYQZllxJTjzAMw';
  const profileId = '904033e1-c676-475d-a8bb-43f6b5bd667c';

  try {
    const [profileRes, articlesRes, dailyRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profileId}`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        cache: 'no-store'
      }),
      fetch(`${supabaseUrl}/rest/v1/articles?profile_id=eq.${profileId}&order=display_order.asc`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        cache: 'no-store'
      }),
      fetch(`${supabaseUrl}/rest/v1/daily_traffic_stats?profile_id=eq.${profileId}&order=date.desc`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        cache: 'no-store'
      }),
    ]);

    const profiles = await profileRes.json();
    const articles = await articlesRes.json();
    const dailyStats = await dailyRes.json();

    const totalArticlesClicksSum = articles.reduce((sum: number, a: any) => sum + (a.clicks_count || 0), 0);
    const totalDailyClicksSum = dailyStats.reduce((sum: number, d: any) => sum + (d.clicks_count || 0), 0);

    const now = Date.now();
    const d1Cutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dailyStats24h = dailyStats.filter((d: any) => d.date >= d1Cutoff);
    const dailyClicks24h = dailyStats24h.reduce((sum: number, d: any) => sum + (d.clicks_count || 0), 0);

    const articles24hBreakdown = articles.map((art: any) => {
      const scaled = totalArticlesClicksSum > 0
        ? Math.round(((art.clicks_count || 0) / totalArticlesClicksSum) * dailyClicks24h)
        : 0;
      return {
        order: art.display_order,
        platform: art.website_name,
        title: art.title,
        clicks_lifetime: art.clicks_count || 0,
        clicks_24h_calculated: scaled
      };
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      profile_info: {
        id: profileId,
        title: profiles[0]?.title,
        profile_views_count: profiles[0]?.views_count
      },
      totals_summary: {
        total_articles_clicks_sum_in_db: totalArticlesClicksSum,
        total_daily_clicks_sum_in_db: totalDailyClicksSum,
        last_24h_clicks_sum_in_db: dailyClicks24h,
      },
      raw_daily_stats_by_date: dailyStats.map((d: any) => ({
        date: d.date,
        views_count: d.views_count,
        clicks_count: d.clicks_count
      })),
      articles_breakdown: articles24hBreakdown
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
