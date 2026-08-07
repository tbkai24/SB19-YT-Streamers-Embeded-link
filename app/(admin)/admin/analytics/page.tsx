'use client';

import React, { useState, useEffect } from 'react';
import { useAdminWorkspace } from '../layout';
import { getStoredProfiles, saveProfiles, saveProfileToSupabase, fetchAnalyticsEventsFromSupabase, fetchDailyTrafficStatsFromSupabase } from '@/lib/data-store';
import { AnalyticsEvent, DailyTrafficStat } from '@/types/database';
import { getCountryFlagEmoji, COUNTRY_NAMES, normalizeReferrer } from '@/lib/device-detector';
import { BarChart3, Search, Eye, MousePointerClick, ShieldCheck, Check, Save, Smartphone, Laptop, Tablet, Globe, Calendar, ChevronDown, Users, Share2 } from 'lucide-react';

export default function AnalyticsAdminPage() {
  const { activeProfile, articles, submissions, refreshData } = useAdminWorkspace();

  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Date Range Filter state: 1 Day (Default), 1 Week, 1 Month, All Time, Custom
  const [timeRange, setTimeRange] = useState<'1d' | '1w' | '1m' | 'all' | 'custom'>('1d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyTrafficStat[]>([]);

  useEffect(() => {
    if (activeProfile) {
      setSeoTitle(activeProfile.seo_title || `${activeProfile.title} - SB19 YouTube Streamers`);
      setSeoDescription(activeProfile.seo_description || activeProfile.description || '');

      Promise.all([
        fetchAnalyticsEventsFromSupabase(activeProfile.id),
        fetchDailyTrafficStatsFromSupabase(activeProfile.id),
      ]).then(([evs, stats]) => {
        setEvents(evs);
        setDailyStats(stats);
      });
    }
  }, [activeProfile]);

  if (!activeProfile) return null;

  const profileArticles = articles.filter(a => a.profile_id === activeProfile.id && a.status === 'published');
  const totalViews = activeProfile.views_count || 0;
  const totalClicks = profileArticles.reduce((sum, a) => sum + (a.clicks_count || 0), 0);

  // Real timestamp range filtering
  const now = Date.now();
  const filteredEvents = events.filter(ev => {
    const evTime = new Date(ev.created_at).getTime();
    if (isNaN(evTime)) return true;

    if (timeRange === '1d') {
      return evTime >= now - 24 * 60 * 60 * 1000;
    } else if (timeRange === '1w') {
      return evTime >= now - 7 * 24 * 60 * 60 * 1000;
    } else if (timeRange === '1m') {
      return evTime >= now - 30 * 24 * 60 * 60 * 1000;
    } else if (timeRange === 'all') {
      return true;
    } else if (timeRange === 'custom') {
      if (!startDate && !endDate) return true;
      const startMs = startDate ? new Date(startDate).getTime() : 0;
      const endMs = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Infinity;
      return evTime >= startMs && evTime <= endMs;
    }
    return true;
  });

  const d1Cutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const d7Cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const d30Cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const filteredDailyStats = dailyStats.filter(ds => {
    if (timeRange === '1d') return ds.date >= d1Cutoff;
    if (timeRange === '1w') return ds.date >= d7Cutoff;
    if (timeRange === '1m') return ds.date >= d30Cutoff;
    if (timeRange === 'all') return true;
    if (timeRange === 'custom') {
      if (!startDate && !endDate) return true;
      const start = startDate || '1970-01-01';
      const end = endDate || '2099-12-31';
      return ds.date >= start && ds.date <= end;
    }
    return true;
  });

  const nonLocalhostEvents = filteredEvents.filter(e => normalizeReferrer(e.referrer) !== 'Localhost');
  const hasEventData = nonLocalhostEvents.length > 0;
  const hasDailyData = dailyStats.length > 0;

  let displayViews = 0;
  let uniqueVisitorsCount = 0;
  let displayClicks = 0;
  let devices: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
  let countriesMap: Record<string, number> = {};
  let referrersMap: Record<string, number> = {};

  if (hasEventData) {
    const viewEvents = nonLocalhostEvents.filter(e => e.event_type === 'profile_view');
    const clickEvents = nonLocalhostEvents.filter(e => e.event_type === 'article_click');

    displayViews = viewEvents.length;
    displayClicks = clickEvents.length;
    uniqueVisitorsCount = new Set(viewEvents.map(e => e.visitor_hash || (e.country ? `${e.country}_${e.device || 'mobile'}_${new Date(e.created_at).toISOString().split('T')[0]}` : 'anon'))).size;

    devices = viewEvents.reduce((acc, ev) => {
      const d = ev.device || 'mobile';
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, { mobile: 0, desktop: 0, tablet: 0 } as Record<string, number>);

    countriesMap = viewEvents.reduce((acc, ev) => {
      if (ev.country) acc[ev.country] = (acc[ev.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    referrersMap = viewEvents.reduce((acc, ev) => {
      const platform = normalizeReferrer(ev.referrer);
      if (platform !== 'Localhost') {
        acc[platform] = (acc[platform] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  } else if (hasDailyData) {
    let nonLocalhostViewsSum = 0;

    referrersMap = filteredDailyStats.reduce((acc, s) => {
      const rd = (s as any).referrer_breakdown || {};
      Object.entries(rd).forEach(([p, cnt]) => {
        const platform = normalizeReferrer(p);
        const count = cnt as number;
        if (platform !== 'Localhost') {
          acc[platform] = (acc[platform] || 0) + count;
          nonLocalhostViewsSum += count;
        }
      });
      return acc;
    }, {} as Record<string, number>);

    displayViews = nonLocalhostViewsSum;
    displayClicks = filteredDailyStats.reduce((sum, s) => sum + (s.clicks_count || 0), 0);
    uniqueVisitorsCount = displayViews;

    devices = filteredDailyStats.reduce((acc, s) => {
      const bd = s.device_breakdown || {};
      acc.mobile = (acc.mobile || 0) + (bd.mobile || 0);
      acc.desktop = (acc.desktop || 0) + (bd.desktop || 0);
      acc.tablet = (acc.tablet || 0) + (bd.tablet || 0);
      return acc;
    }, { mobile: 0, desktop: 0, tablet: 0 } as Record<string, number>);

    countriesMap = filteredDailyStats.reduce((acc, s) => {
      const cd = s.country_breakdown || {};
      Object.entries(cd).forEach(([c, cnt]) => {
        acc[c] = (acc[c] || 0) + (cnt as number);
      });
      return acc;
    }, {} as Record<string, number>);
  } else {
    displayViews = 0;
    displayClicks = 0;
    uniqueVisitorsCount = 0;
    devices = { mobile: 0, desktop: 0, tablet: 0 };
    countriesMap = {};
  }

  const mobileCount = devices.mobile || 0;
  const desktopCount = devices.desktop || 0;
  const tabletCount = devices.tablet || 0;
  const grandTotalDevices = mobileCount + desktopCount + tabletCount || 1;
  const mobilePct = Math.round((mobileCount / grandTotalDevices) * 100);
  const desktopPct = Math.round((desktopCount / grandTotalDevices) * 100);
  const tabletPct = Math.round((tabletCount / grandTotalDevices) * 100);

  const countryList = Object.entries(countriesMap).sort((a, b) => b[1] - a[1]);
  const referrerList = Object.entries(referrersMap).sort((a, b) => b[1] - a[1]);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-rose-600" />
            <span>SEO & Profile Analytics</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Per-profile traffic metrics & SEO metadata for active profile: <span className="text-rose-600 font-bold">{activeProfile.title}</span>
          </p>
        </div>

        {/* Date Range Selector Dropdown */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="pl-8 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-xs appearance-none cursor-pointer"
            >
              <option value="1d">1 Day (Last 24h)</option>
              <option value="1w">1 Week (Last 7d)</option>
              <option value="1m">1 Month (Last 30d)</option>
              <option value="all">All Time (Lifetime Total 🔥)</option>
              <option value="custom">Custom Range...</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
          </div>

          {timeRange === 'custom' && (
            <div className="flex items-center gap-2 bg-white p-1 px-2.5 rounded-xl border border-slate-300 shadow-xs text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-900 font-semibold focus:outline-none text-xs"
              />
              <span className="text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-900 font-semibold focus:outline-none text-xs"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Profile Views</span>
            <Eye className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{displayViews.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">All visits & page refreshes</div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Unique Profile Views</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{uniqueVisitorsCount.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Unique individual fans per date range</div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Article Clicks</span>
            <MousePointerClick className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{displayClicks.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Outbound clicks across articles</div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Valid Articles</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">{profileArticles.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Active streaming links</div>
        </div>
      </div>

      {/* Device, Country Geolocation & Traffic Platforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Device Breakdown Card */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-rose-600" />
              <span>Visitor Devices</span>
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

        {/* Traffic Platforms / Referrers Card (Middle) */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>Traffic Platforms</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-semibold">Social & Web Direct</span>
          </div>

          {referrerList.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium py-3 text-center">
              Direct Link visits.
            </p>
          ) : (
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {referrerList.map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-bold text-slate-900">{platform}</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-extrabold text-emerald-600">
                    {count.toLocaleString()} visits
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Visitor Countries Card (End) */}
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
