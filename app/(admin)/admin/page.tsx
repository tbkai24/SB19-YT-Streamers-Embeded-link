'use client';

import React from 'react';
import Link from 'next/link';
import { useAdminWorkspace } from './layout';
import {
  FileText,
  Clock,
  Eye,
  ExternalLink,
  PlusCircle,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

export default function OverviewPage() {
  const { activeProfile, articles, submissions, openCreateModal } = useAdminWorkspace();

  if (!activeProfile) {
    return (
      <div className="p-8 text-center glass-panel rounded-2xl border border-slate-200 bg-white text-slate-800 text-sm flex flex-col items-center justify-center my-6 shadow-sm">
        <Sparkles className="w-8 h-8 text-rose-600 mb-2" />
        <h2 className="text-base font-bold text-slate-900">No Active Profile</h2>
        <p className="text-xs text-slate-600 mt-1 max-w-sm mb-4 font-medium">
          Create your first release profile to begin adding streaming articles and social links.
        </p>
        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:brightness-110 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create First Profile</span>
        </button>
      </div>
    );
  }

  const profileArticles = articles.filter(a => a.profile_id === activeProfile.id && a.status === 'published');
  const profileSubmissions = submissions.filter(s => s.profile_id === activeProfile.id && s.status === 'pending');
  const totalViews = activeProfile.views_count || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Header Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div
          className="absolute -right-16 -top-16 w-64 h-64 blur-[90px] pointer-events-none rounded-full opacity-15"
          style={{ backgroundColor: activeProfile.accent_color || '#e11d48' }}
        />

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider">
              Active Profile
            </span>
            <span className="text-xs text-slate-500 font-medium">/{activeProfile.slug}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{activeProfile.title}</span>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeProfile.accent_color || '#e11d48' }} />
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-lg font-medium">
            {activeProfile.description || 'No description configured for this release profile.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/articles"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Article</span>
          </Link>
          <Link
            href={`/profile/${activeProfile.slug}`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-600 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-rose-600" />
            <span>Public Page</span>
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-slate-500">Published Articles</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{profileArticles.length}</div>
            <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 text-amber-500" /> Live on public profile
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-slate-500">Pending Review</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{profileSubmissions.length}</div>
            <div className="text-[11px] text-slate-600 mt-1 font-medium">Community submissions</div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 bg-white flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-bold text-slate-500">Total Profile Views</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{totalViews.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-semibold">
              <TrendingUp className="w-3 h-3" /> Live traffic active
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200">
            <Eye className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Activity / Overview Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Published Articles */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Published Streaming Articles</span>
            </h3>
            <Link href="/admin/articles" className="text-xs font-bold text-rose-600 hover:underline">
              View All ({profileArticles.length})
            </Link>
          </div>

          {profileArticles.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200 font-medium">
              No articles published yet for {activeProfile.title}.
            </div>
          ) : (
            <div className="space-y-2.5">
              {profileArticles.slice(0, 4).map((art) => (
                <div key={art.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{art.title}</div>
                    <div className="text-[11px] text-slate-500 font-medium truncate">{art.website_name} • {art.article_url}</div>
                  </div>
                  <a
                    href={art.article_url}
                    target="_blank"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-rose-300 shrink-0 shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Submissions Queue Preview */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Pending Review Queue</span>
            </h3>
            <Link href="/admin/submissions" className="text-xs font-bold text-amber-600 hover:underline">
              Manage Queue ({profileSubmissions.length})
            </Link>
          </div>

          {profileSubmissions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200 font-medium">
              No pending community submissions for {activeProfile.title}.
            </div>
          ) : (
            <div className="space-y-2.5">
              {profileSubmissions.slice(0, 4).map((sub) => (
                <div key={sub.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{sub.title || sub.article_url}</div>
                    <div className="text-[11px] text-slate-500 font-medium truncate">{sub.website_name} • Submitted by {sub.submitted_by_name || 'Fan'}</div>
                  </div>
                  <Link
                    href="/admin/submissions"
                    className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold shrink-0"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
