'use client';

import React, { useState, useEffect } from 'react';
import { useAdminWorkspace } from '../layout';
import { getStoredProfiles, saveProfiles, saveProfileToSupabase } from '@/lib/data-store';
import { getCountryFlagEmoji, COUNTRY_NAMES } from '@/lib/device-detector';
import { BarChart3, Search, Eye, MousePointerClick, ShieldCheck, Check, Save, Smartphone, Laptop, Tablet, Globe } from 'lucide-react';

export default function AnalyticsAdminPage() {
  const { activeProfile, articles, submissions, refreshData } = useAdminWorkspace();

  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (activeProfile) {
      setSeoTitle(activeProfile.seo_title || `${activeProfile.title} - SB19 YouTube Streamers`);
      setSeoDescription(activeProfile.seo_description || activeProfile.description || '');
    }
  }, [activeProfile]);

  if (!activeProfile) return null;

  const profileArticles = articles.filter(a => a.profile_id === activeProfile.id && a.status === 'published');
  const totalViews = activeProfile.views_count || 0;
  const totalClicks = profileArticles.reduce((sum, a) => sum + (a.clicks_count || 0), 0);

  // Device Breakdown calculation
  const devices = activeProfile.device_breakdown || { mobile: 0, desktop: 0, tablet: 0 };
  const mobileCount = devices.mobile || 0;
  const desktopCount = devices.desktop || 0;
  const tabletCount = devices.tablet || 0;
  const grandTotalDevices = mobileCount + desktopCount + tabletCount || 1;
  const mobilePct = Math.round((mobileCount / grandTotalDevices) * 100);
  const desktopPct = Math.round((desktopCount / grandTotalDevices) * 100);
  const tabletPct = Math.round((tabletCount / grandTotalDevices) * 100);

  // Country Breakdown calculation
  const countriesMap = activeProfile.country_breakdown || {};
  const countryList = Object.entries(countriesMap)
    .sort((a, b) => b[1] - a[1]);

  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    const allProfiles = getStoredProfiles();
    const updatedProfile = {
      ...activeProfile,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDescription.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const updated = allProfiles.map(p => p.id === activeProfile.id ? updatedProfile : p);
    saveProfiles(updated);
    await saveProfileToSupabase(updatedProfile);

    refreshData();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-rose-600" />
          <span>SEO & Workspace Analytics</span>
        </h1>
        <p className="text-xs text-slate-600 mt-0.5 font-medium">
          Per-profile traffic metrics & SEO metadata for active workspace: <span className="text-rose-600 font-bold">{activeProfile.title}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Profile Page Visitors</span>
            <Eye className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalViews.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Live visits for /{activeProfile.slug}</div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Article Clicks</span>
            <MousePointerClick className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalClicks.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Outbound clicks across all articles</div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Valid Published Articles</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">{profileArticles.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Valid active streaming links</div>
        </div>
      </div>

      {/* Device & Country Geolocation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Breakdown Card */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-rose-600" />
              <span>Visitor Device Types</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-semibold">Mobile vs Laptop</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
              <Smartphone className="w-4 h-4 text-rose-600 mx-auto mb-1" />
              <div className="text-sm font-black text-slate-900">{mobileCount}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Mobile ({mobilePct}%)</div>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
              <Laptop className="w-4 h-4 text-sky-600 mx-auto mb-1" />
              <div className="text-sm font-black text-slate-900">{desktopCount}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Laptop ({desktopPct}%)</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <Tablet className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <div className="text-sm font-black text-slate-900">{tabletCount}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Tablet ({tabletPct}%)</div>
            </div>
          </div>
        </div>

        {/* Top Visitor Countries Card */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Visitor Countries</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-semibold">IP Geolocation</span>
          </div>

          {countryList.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium py-3 text-center">
              No country data logged yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {countryList.map(([code, count]) => (
                <div key={code} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span className="text-base leading-none">{getCountryFlagEmoji(code)}</span>
                    <span>{COUNTRY_NAMES[code] || code}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-extrabold text-rose-600">
                    {count.toLocaleString()} visits
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Individual Article Link Performance Breakdown Table */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-emerald-600" />
            <span>Per-Article Link Performance</span>
          </h2>
          <span className="text-xs text-slate-500 font-semibold">Real-time click counts</span>
        </div>

        {profileArticles.length === 0 ? (
          <p className="text-xs text-slate-500 font-medium py-4 text-center">
            No published articles available yet for {activeProfile.title}.
          </p>
        ) : (
          <div className="space-y-2.5">
            {profileArticles.map((art) => (
              <div key={art.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">{art.title}</div>
                  <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{art.website_name} • {art.article_url}</div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black shrink-0 flex items-center gap-1.5 shadow-xs">
                  <MousePointerClick className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{(art.clicks_count || 0).toLocaleString()} Clicks</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSeo} className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Search className="w-4 h-4 text-rose-600" />
          <h2 className="text-sm font-bold text-slate-900">Search Engine Optimization (SEO)</h2>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>SEO metadata updated successfully!</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">SEO Title Tag</label>
          <input
            type="text"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Meta Description</label>
          <textarea
            rows={3}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 resize-none font-medium"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save SEO Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
