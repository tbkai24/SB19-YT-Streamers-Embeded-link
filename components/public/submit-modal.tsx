'use client';

import React, { useState } from 'react';
import { Profile, ExtractedMetadata } from '@/types/database';
import { submitArticleLink, getStoredArticles, getStoredSubmissions } from '@/lib/data-store';
import { normalizeUrl, isDuplicateUrl } from '@/lib/url-normalizer';
import { X, Link2, Sparkles, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';

interface SubmitModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SubmitModal({ profile, isOpen, onClose, onSuccess }: SubmitModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [metadata, setMetadata] = useState<ExtractedMetadata | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const checkDuplicate = (inputUrl: string): boolean => {
    if (!inputUrl.trim()) return false;
    const normalized = normalizeUrl(inputUrl);
    const articles = getStoredArticles();
    const submissions = getStoredSubmissions();

    const publishedUrls = articles.map(a => a.canonical_url || a.article_url);
    if (isDuplicateUrl(normalized, publishedUrls)) {
      setErrorMsg('This article link already exists in the directory!');
      return true;
    }

    const pendingUrls = submissions.filter(s => s.status === 'pending').map(s => s.canonical_url || s.article_url);
    if (isDuplicateUrl(normalized, pendingUrls)) {
      setErrorMsg('This article link is already submitted and pending admin review!');
      return true;
    }

    return false;
  };

  const handleFetchMetadata = async () => {
    if (!url.trim()) return;
    if (checkDuplicate(url)) return;

    setLoadingMetadata(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not fetch URL metadata');
      }
      setMetadata(data);
      if (data.title && (!title || title.trim() === '')) {
        setTitle(data.title);
      }
    } catch (err: any) {
      setErrorMsg('Could not fetch auto-preview metadata. You can still enter title and submit.');
    } finally {
      setLoadingMetadata(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const mergedMetadata = {
      ...(metadata || {}),
      title: title.trim() || metadata?.title || 'Submitted Article Link',
    };

    const result = submitArticleLink(profile.id, url, notes, mergedMetadata as Partial<ExtractedMetadata>);

    setSubmitting(false);
    if (!result.success) {
      setErrorMsg(result.message);
    } else {
      setSuccessMsg(result.message);
      setUrl('');
      setTitle('');
      setNotes('');
      setMetadata(null);
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-2xl overflow-hidden text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-slate-300"
              style={{ backgroundColor: profile.accent_color || '#e11d48' }}
            />
            <h2 className="text-lg font-black text-slate-900">
              Suggest Article for <span style={{ color: profile.accent_color || '#e11d48' }}>{profile.title}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View State */}
        {successMsg ? (
          <div className="mt-6 text-center py-6 px-4 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Submission Received!</h3>
              <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed max-w-sm mx-auto">
                {successMsg}
              </p>
            </div>
            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSuccessMsg(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Submit Another Link
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form Body */
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-rose-600" /> Article Link (URL) <span className="text-rose-600">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUrl(val);
                    setErrorMsg(null);
                    checkDuplicate(val);
                  }}
                  onBlur={handleFetchMetadata}
                  placeholder="https://example.com/sb19-article-link"
                  className="w-full pl-4 pr-24 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 text-xs font-bold transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={handleFetchMetadata}
                  disabled={loadingMetadata || !url.trim()}
                  className="absolute right-2 px-3 py-1 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {loadingMetadata ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <span>Auto-Fetch</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Article must contain an embedded YouTube video.
              </p>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-rose-600" /> Article Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-suggested from link or type title..."
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 text-xs font-bold transition-all shadow-xs"
              />
            </div>

            {/* Auto Metadata Preview */}
            {metadata && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left shadow-2xs">
                <div className="text-[10px] font-black text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  <span>Auto-Extracted Preview</span>
                </div>
                <div className="flex items-start gap-3">
                  {metadata.thumbnail && (
                    <img
                      src={metadata.thumbnail}
                      alt="Preview"
                      className="w-16 h-12 object-cover rounded-xl bg-slate-200 shrink-0 border border-slate-200"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 line-clamp-1">
                      {metadata.title}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold line-clamp-1">
                      {metadata.websiteName} • {metadata.description || 'No description available'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
                Optional Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Official campaign article with high-quality MV embed"
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 text-xs font-semibold transition-all shadow-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !url.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                style={{ backgroundColor: profile.accent_color || '#e11d48' }}
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Submit for Admin Review</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
