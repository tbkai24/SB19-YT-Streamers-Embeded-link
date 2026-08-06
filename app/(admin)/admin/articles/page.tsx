'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAdminWorkspace } from '../layout';
import { Article, ExtractedMetadata } from '@/types/database';
import { getStoredArticles, saveArticles, saveArticleToSupabase, generateUUID } from '@/lib/data-store';
import { normalizeUrl, decodeHtmlEntities } from '@/lib/url-normalizer';
import { ImageUploadInput } from '@/components/admin/image-upload-input';
import { Plus, Trash2, Edit2, ExternalLink, Sparkles, Loader2, Link2, MoveUp, MoveDown, X, CheckCircle2 } from 'lucide-react';

export default function ArticlesAdminPage() {
  const { activeProfile, articles, refreshData } = useAdminWorkspace();

  const [mounted, setMounted] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [description, setDescription] = useState('');
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!activeProfile) return null;

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const profileArticles = articles
    .filter(a => a.profile_id === activeProfile.id)
    .sort((a, b) => a.display_order - b.display_order);

  const handleFetchMetadata = async () => {
    if (!url.trim()) return;
    setFetchingMeta(true);
    try {
      const res = await fetch('/api/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data: ExtractedMetadata = await res.json();
      if (data.title) setTitle(data.title);
      if (data.websiteName) setWebsiteName(data.websiteName);
      if (data.thumbnail) setThumbnail(data.thumbnail);
      if (data.description) setDescription(data.description);
    } catch {
      // Ignore
    } finally {
      setFetchingMeta(false);
    }
  };

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setWebsiteName('');
    setThumbnail('');
    setDescription('');
    setEditingArticle(null);
    setIsAddOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;

    setSubmitting(true);
    const normalized = normalizeUrl(url);
    const allArticles = getStoredArticles();

    if (editingArticle) {
      const updatedArticle: Article = {
        ...editingArticle,
        article_url: url.trim(),
        canonical_url: normalized,
        title: title.trim(),
        website_name: websiteName.trim() || new URL(normalized).hostname.replace('www.', ''),
        thumbnail: thumbnail.trim() || null,
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const updated = allArticles.map(a => a.id === editingArticle.id ? updatedArticle : a);
      saveArticles(updated);
      await saveArticleToSupabase(updatedArticle);
      showToast('Article updated successfully!', 'success');
    } else {
      const newArt: Article = {
        id: generateUUID(),
        profile_id: activeProfile.id,
        article_url: url.trim(),
        canonical_url: normalized,
        website_name: websiteName.trim() || new URL(normalized).hostname.replace('www.', ''),
        title: title.trim(),
        thumbnail: thumbnail.trim() || null,
        description: description.trim() || null,
        display_order: profileArticles.length + 1,
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveArticles([newArt, ...allArticles]);
      await saveArticleToSupabase(newArt);
      showToast('Article published and saved to workspace!', 'success');
    }

    setSubmitting(false);
    refreshData();
    resetForm();
  };

  const handleDelete = (artId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    const all = getStoredArticles();
    const filtered = all.filter(a => a.id !== artId);
    saveArticles(filtered);
    refreshData();
  };

  const handleMoveOrder = (artId: string, direction: 'up' | 'down') => {
    const sorted = [...profileArticles];
    const index = sorted.findIndex(a => a.id === artId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const tempOrder = sorted[index].display_order;
    sorted[index].display_order = sorted[targetIndex].display_order;
    sorted[targetIndex].display_order = tempOrder;

    const allArticles = getStoredArticles();
    const updated = allArticles.map(a => {
      const match = sorted.find(s => s.id === a.id);
      return match ? match : a;
    });

    saveArticles(updated);
    refreshData();
  };

  const openEdit = (art: Article) => {
    setEditingArticle(art);
    setUrl(art.article_url);
    setTitle(art.title);
    setWebsiteName(art.website_name);
    setThumbnail(art.thumbnail || '');
    setDescription(art.description || '');
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl w-full">
      {/* Toast Feedback Notification Banner */}
      {toast && (
        <div className="p-4 rounded-2xl border bg-emerald-50 border-emerald-300 text-emerald-900 flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-3 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-black/5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Articles Directory</h1>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Manage streaming articles for workspace: <span className="text-rose-600 font-bold">{activeProfile.title}</span>
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsAddOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Article</span>
        </button>
      </div>

      <div className="rounded-2xl glass-panel border border-slate-200 bg-white overflow-hidden shadow-xs">
        {profileArticles.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            No articles added to {activeProfile.title} yet. Click "Add New Article" to add one.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {profileArticles.map((art, idx) => (
              <div key={art.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMoveOrder(art.id, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === profileArticles.length - 1}
                      onClick={() => handleMoveOrder(art.id, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {art.thumbnail ? (
                    <img src={art.thumbnail} alt={art.title} className="w-16 h-12 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200" />
                  ) : (
                    <div className="w-16 h-12 rounded-lg bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-medium">
                      No Image
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {decodeHtmlEntities(art.website_name)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {(art.clicks_count || 0).toLocaleString()} clicks
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">Order #{art.display_order}</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 truncate mt-1">{decodeHtmlEntities(art.title)}</h3>
                    <div className="text-[11px] text-slate-500 font-medium truncate">{art.article_url}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={art.article_url}
                    target="_blank"
                    className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-rose-600 hover:bg-slate-200 border border-slate-200"
                    title="Preview external article"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => openEdit(art)}
                    className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-rose-600 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                    title="Edit article"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(art.id)}
                    className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                    title="Delete article"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAddOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-10 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl max-h-[calc(100vh-130px)] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl text-slate-900 overflow-hidden shrink-0">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-200 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
                  <Sparkles className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    {editingArticle ? 'Edit Article' : `Add Article to ${activeProfile.title}`}
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold">Publish or update streaming article link</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="article-admin-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-rose-600" /> Article Link (URL) *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={handleFetchMetadata}
                    placeholder="https://..."
                    className="w-full pl-4 pr-24 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={handleFetchMetadata}
                    disabled={fetchingMeta || !url.trim()}
                    className="absolute right-2 px-3 py-1 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {fetchingMeta ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                    )}
                    <span>Auto-Fetch</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Article Headline..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
                  Website Name (Outlet)
                </label>
                <input
                  type="text"
                  value={websiteName}
                  onChange={(e) => setWebsiteName(e.target.value)}
                  placeholder="e.g. Billboard Philippines, ABS-CBN News"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shadow-xs"
                />
              </div>

              <div>
                <ImageUploadInput
                  label="Thumbnail Cover Image (Optional)"
                  value={thumbnail}
                  onChange={setThumbnail}
                  placeholder="Upload thumbnail or paste image URL..."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-rose-600 shadow-xs resize-none"
                />
              </div>
            </form>

            {/* Fixed Footer */}
            <div className="p-4 px-6 border-t border-slate-200 shrink-0 bg-slate-50/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="article-admin-form"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{editingArticle ? 'Save Changes' : 'Publish Article'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
