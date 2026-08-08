'use client';

import React, { useState, useEffect } from 'react';
import { useAdminWorkspace } from '../layout';
import { getStoredProfiles, saveProfiles, saveProfileToSupabase } from '@/lib/data-store';
import { ImageUploadInput } from '@/components/admin/image-upload-input';
import { extractYouTubeId } from '@/lib/url-normalizer';
import { Palette, Check, Save, Video, PlayCircle } from 'lucide-react';

export default function AppearanceAdminPage() {
  const { activeProfile, refreshData } = useAdminWorkspace();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [accentColor, setAccentColor] = useState('#e11d48');
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (activeProfile) {
      setTitle(activeProfile.title);
      setDescription(activeProfile.description || '');
      setCoverImage(activeProfile.cover_image || '');
      setProfileImage(activeProfile.profile_image || '');
      setAccentColor(activeProfile.accent_color || '#e11d48');
      setFeaturedVideoUrl(activeProfile.featured_video_url || activeProfile.youtube_url || '');
    }
  }, [activeProfile]);

  if (!activeProfile) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const allProfiles = getStoredProfiles();
    const finalVideoUrl = featuredVideoUrl.trim() || null;
    const updatedProfile = {
      ...activeProfile,
      title: title.trim(),
      description: description.trim() || null,
      cover_image: coverImage.trim() || null,
      profile_image: profileImage.trim() || null,
      accent_color: accentColor,
      featured_video_url: featuredVideoUrl.trim() || null,
      youtube_url: activeProfile.youtube_url || null,
      updated_at: new Date().toISOString(),
    };

    const updated = allProfiles.map(p => p.id === activeProfile.id ? updatedProfile : p);
    saveProfiles(updated);
    await saveProfileToSupabase(updatedProfile);
    refreshData();

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const previewYtId = extractYouTubeId(featuredVideoUrl);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Palette className="w-5 h-5 text-rose-600" />
          <span>Appearance & Branding</span>
        </h1>
        <p className="text-xs text-slate-600 mt-0.5 font-medium">
          Customize independent branding for active workspace: <span className="text-rose-600 font-bold">{activeProfile.title}</span>
        </p>
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-5 shadow-xs">
        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Appearance settings updated successfully!</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Release Profile Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Profile Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-rose-500 resize-none font-medium"
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

        {/* Featured Music Video YouTube Link */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
            <Video className="w-4 h-4 text-rose-600" />
            <span>Featured Music Video YouTube URL</span>
          </label>
          <p className="text-[11px] text-slate-500 font-medium">
            Paste a YouTube video link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...). This video will be embedded as a playable MV player directly above the Streaming Articles section!
          </p>
          <input
            type="url"
            value={featuredVideoUrl}
            onChange={(e) => setFeaturedVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=sb19mv"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
          />

          {/* Live Playable Video Player Preview */}
          {previewYtId && (
            <div className="pt-2 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                <PlayCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Live Playable MV Player Preview</span>
              </span>
              <div className="w-full aspect-video rounded-xl overflow-hidden shadow-md border border-slate-200 bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${previewYtId}?rel=0`}
                  title="Live MV Player Preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Accent Theme Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-12 h-10 rounded-xl bg-white border border-slate-200 cursor-pointer"
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-36 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-bold"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Appearance Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
