'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Profile, Article } from '@/types/database';
import { getStoredProfiles, getStoredArticles, fetchProfilesFromSupabase, fetchArticlesFromSupabase } from '@/lib/data-store';
import { getCloudinaryImageUrl } from '@/lib/cloudinary';
import { PublicFooter } from '@/components/public/footer';
import { BrandLogo } from '@/components/public/logo';
import { CountryBreakdownModal } from '@/components/public/country-modal';
import { getCountryFlagEmoji } from '@/lib/device-detector';
import { Search, Sparkles, ArrowRight, Music, Globe } from 'lucide-react';

export default function PublicHomePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeCountryProfile, setActiveCountryProfile] = useState<Profile | null>(null);

  const loadData = async () => {
    // 1. Initial local load
    const localProfiles = getStoredProfiles().filter(p => p.status === 'published');
    const localArticles = getStoredArticles().filter(a => a.status === 'published');
    if (localProfiles.length > 0) {
      setProfiles(localProfiles);
      setArticles(localArticles);
    }

    // 2. Fetch fresh data from Supabase DB
    try {
      const dbProfiles = await fetchProfilesFromSupabase();
      const dbArticles = await fetchArticlesFromSupabase();

      const publishedProfs = dbProfiles
        .filter(p => p.status === 'published')
        .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
      const publishedArts = dbArticles.filter(a => a.status === 'published');

      setProfiles(publishedProfs);
      setArticles(publishedArts);
    } catch {
      // Ignore network errors, fallback to local
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProfiles = profiles.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getArticleCount = (profileId: string) => {
    return articles.filter(a => a.profile_id === profileId).length;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Soft Red & Amber ambient glow background */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-rose-500/10 blur-[140px] pointer-events-none rounded-full animate-pulse-red" />
      <div className="fixed bottom-0 right-0 w-[450px] h-[350px] bg-amber-400/10 blur-[130px] pointer-events-none rounded-full" />

      {/* Top Header / Brand Bar */}
      <div className="w-full max-w-xl flex items-center justify-center mb-8 z-10">
        <BrandLogo size="md" showText={true} />
      </div>

      {/* Main Container */}
      <main className="w-full max-w-xl z-10 flex flex-col items-center">
        {/* Title / Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Verified YouTube Article Directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            SB19 YouTube Streamers
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed font-medium">
            Discover and stream verified articles featuring embedded YouTube MVs.
          </p>
        </div>

        {/* Instant Search Bar */}
        <div className="w-full relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SB19 MV releases"
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 text-sm shadow-md transition-all font-medium"
          />
        </div>

        {/* Content Area */}
        <div className="w-full space-y-4">
          {isLoading && profiles.length === 0 ? (
            <div className="space-y-4">
              <div className="w-full h-24 bg-white border border-slate-200 rounded-2xl animate-pulse p-4 shadow-2xs" />
              <div className="w-full h-24 bg-white border border-slate-200 rounded-2xl animate-pulse p-4 shadow-2xs" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="w-full p-8 text-center glass-panel rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3 shadow-xs">
                <Music className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">No SB19 MV releases available</h2>
              <p className="text-xs text-slate-600 max-w-sm mt-1 font-medium">
                There are no published release profiles available at this time. Please check back soon!
              </p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-8 text-center glass-panel rounded-2xl border border-slate-200 text-slate-500 text-xs font-medium">
              No matching release profiles found for "{searchQuery}".
            </div>
          ) : (
            filteredProfiles.map((profile) => {
              const count = getArticleCount(profile.id);
              const topCountries = Object.keys(profile.country_breakdown || {}).slice(0, 3);
              return (
                <div
                  key={profile.id}
                  className="group relative block w-full rounded-2xl overflow-hidden glass-card p-4 border border-slate-200/90 hover:border-rose-400 shadow-sm hover:shadow-md transition-all"
                >
                  <Link href={`/profile/${profile.slug}`} className="block">
                    <div className="flex items-center gap-4">
                      {/* Image / Avatar */}
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        {profile.cover_image || profile.profile_image ? (
                          <img
                            src={getCloudinaryImageUrl(profile.profile_image || profile.cover_image || '', { width: 200 })}
                            alt={profile.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                            <Music className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      {/* Meta info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                            {profile.title}
                          </h2>
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-[11px] font-bold text-rose-700 border border-rose-200">
                            {count} {count === 1 ? 'article' : 'articles'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1 mt-0.5 font-medium">
                          {profile.description}
                        </p>
                      </div>

                      {/* Red Arrow CTA */}
                      <div className="shrink-0">
                        <div className="p-2.5 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-sm transition-all group-hover:translate-x-1">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </div>

        <PublicFooter />
      </main>

      {/* Floating Country Breakdown Modal */}
      <CountryBreakdownModal
        isOpen={!!activeCountryProfile}
        onClose={() => setActiveCountryProfile(null)}
        countryBreakdown={activeCountryProfile?.country_breakdown}
        profileTitle={activeCountryProfile?.title}
      />
    </div>
  );
}

