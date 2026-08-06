'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Profile } from '@/types/database';
import { getStoredProfiles, saveProfiles, saveProfileToSupabase, generateUUID } from '@/lib/data-store';
import { ImageUploadInput } from './image-upload-input';
import { X, Sparkles, Plus, Trash2, Share2, AlertCircle, Loader2 } from 'lucide-react';

interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newProfile: Profile) => void;
}

interface SocialItem {
  id: string;
  platform: 'youtube' | 'instagram' | 'facebook' | 'x' | 'threads' | 'website';
  url: string;
}

const PLATFORM_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'threads', label: 'Threads' },
  { value: 'website', label: 'Official Website' },
] as const;

export function CreateProfileModal({ isOpen, onClose, onCreated }: CreateProfileModalProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [accentColor, setAccentColor] = useState('#e11d48');
  const [socialLinks, setSocialLinks] = useState<SocialItem[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setError('');
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    }
  };

  const handleAddSocial = () => {
    const available = PLATFORM_OPTIONS.filter(p => !socialLinks.some(s => s.platform === p.value));
    const nextPlat = available.length > 0 ? available[0].value : 'website';
    setSocialLinks([...socialLinks, { id: `soc-${Date.now()}`, platform: nextPlat, url: '' }]);
  };

  const handleRemoveSocial = (id: string) => {
    setSocialLinks(socialLinks.filter(s => s.id !== id));
  };

  const handleUpdateSocial = (id: string, field: 'platform' | 'url', val: string) => {
    setSocialLinks(socialLinks.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !slug.trim()) {
      setError('Please fill in all required fields marked with * (Release Title & URL Slug).');
      return;
    }

    setSubmitting(true);

    const getUrl = (plat: string) => {
      const found = socialLinks.find(s => s.platform === plat);
      return found && found.url.trim() ? found.url.trim() : null;
    };

    const newProfile: Profile = {
      id: generateUUID(),
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim() || null,
      cover_image: coverImage.trim() || null,
      profile_image: profileImage.trim() || null,
      accent_color: accentColor,
      theme: 'dark',
      website_url: getUrl('website'),
      youtube_url: getUrl('youtube'),
      facebook_url: getUrl('facebook'),
      instagram_url: getUrl('instagram'),
      x_url: getUrl('x'),
      threads_url: getUrl('threads'),
      seo_title: `${title} - SB19 YouTube Streamers`,
      seo_description: description.trim() || null,
      status: 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const existing = getStoredProfiles();

    // Check duplicate slug in local profiles
    if (existing.some(p => p.slug.toLowerCase() === newProfile.slug)) {
      setError(`A profile with the URL slug "${newProfile.slug}" already exists. Please choose a different title or slug.`);
      setSubmitting(false);
      return;
    }

    const updated = [newProfile, ...existing];
    saveProfiles(updated);

    // Persist to Supabase Database
    const res = await saveProfileToSupabase(newProfile);
    setSubmitting(false);

    if (res && res.error) {
      setError(res.error);
      return;
    }

    onCreated(newProfile);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 sm:p-6 pt-24 sm:pt-28 pb-10 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[calc(100vh-130px)] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl text-slate-900 overflow-hidden shrink-0">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Create New Release Profile</h2>
              <p className="text-xs text-slate-500 font-semibold">Add a new song or album workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                Release Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. LAWLESS, DAM, GENTO"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 font-bold transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                URL Slug <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="lawless"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 font-bold transition-all shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of the song/album release..."
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 font-semibold transition-all shadow-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUploadInput
              label="Cover Image"
              value={coverImage}
              onChange={setCoverImage}
              folder="SB19/covers"
              placeholder="https://... or upload picture"
            />
            <ImageUploadInput
              label="Avatar Image"
              value={profileImage}
              onChange={setProfileImage}
              folder="SB19/avatars"
              placeholder="https://... or upload picture"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-10 rounded-xl bg-white border border-slate-300 cursor-pointer shrink-0 p-1"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-36 px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-extrabold text-xs focus:outline-none focus:border-rose-600 transition-all shadow-xs"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" /> Official Social Links
              </h3>
              <button
                type="button"
                onClick={handleAddSocial}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Link</span>
              </button>
            </div>

            {socialLinks.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic bg-slate-50 border border-slate-200 rounded-xl p-3 text-center font-medium">
                No social links added yet. Click &quot;Add Link&quot; above to add official links (Optional).
              </p>
            ) : (
              <div className="space-y-2">
                {socialLinks.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <select
                      value={item.platform}
                      onChange={(e) => handleUpdateSocial(item.id, 'platform', e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-600 shrink-0"
                    >
                      {PLATFORM_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="url"
                      required
                      value={item.url}
                      onChange={(e) => handleUpdateSocial(item.id, 'url', e.target.value)}
                      placeholder={`Enter ${item.platform} URL...`}
                      className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-rose-600 shadow-xs"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveSocial(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
                      title="Remove social link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Profile Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
