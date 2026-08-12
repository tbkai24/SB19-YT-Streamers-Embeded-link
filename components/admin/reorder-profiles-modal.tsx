'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Profile } from '@/types/database';
import { saveProfiles, updateProfilesOrderInSupabase } from '@/lib/data-store';
import { Layers, MoveUp, MoveDown, X, CheckCircle2, Loader2, GripVertical } from 'lucide-react';

interface ReorderProfilesModalProps {
  isOpen: boolean;
  profiles: Profile[];
  onClose: () => void;
  onSaved: () => void;
}

export function ReorderProfilesModal({
  isOpen,
  profiles,
  onClose,
  onSaved,
}: ReorderProfilesModalProps) {
  const [mounted, setMounted] = useState(false);
  const [list, setList] = useState<Profile[]>([]);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setList([...profiles].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)));
    }
  }, [isOpen, profiles]);

  if (!isOpen || !mounted) return null;

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const updated = [...list];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setList(updated);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...list];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);

    setList(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = list.map((p, idx) => ({
      id: p.id,
      display_order: idx + 1,
    }));

    await updateProfilesOrderInSupabase(updates);
    setSaving(false);
    onSaved();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Arrange MV Profiles</h2>
              <p className="text-xs text-slate-500 font-semibold">Change display order on public homepage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          The top profile (#1) will automatically be featured as the primary release on the homepage.
        </p>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-slate-50/50">
          {list.map((profile, idx) => (
            <div
              key={profile.id}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={`p-3 flex items-center justify-between gap-3 transition-all duration-150 ${
                draggedIndex === idx ? 'opacity-30 bg-rose-50/50 scale-[0.98] border-2 border-dashed border-rose-300' :
                dragOverIndex === idx ? 'bg-rose-50 border-t-2 border-rose-600 scale-[1.01] shadow-xs' :
                'hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="p-1 text-slate-400 hover:text-rose-600 cursor-grab active:cursor-grabbing rounded-lg hover:bg-slate-200/60 transition-colors shrink-0"
                  title="Click & Drag to re-order profile"
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, 'up')}
                    className="p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-20 cursor-pointer"
                    title="Move up 1 step"
                  >
                    <MoveUp className="w-3 h-3" />
                  </button>
                  <button
                    disabled={idx === list.length - 1}
                    onClick={() => handleMove(idx, 'down')}
                    className="p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-20 cursor-pointer"
                    title="Move down 1 step"
                  >
                    <MoveDown className="w-3 h-3" />
                  </button>
                </div>

                <div
                  className="w-4 h-4 rounded-full border border-slate-300 shrink-0"
                  style={{ backgroundColor: profile.accent_color || '#e11d48' }}
                />

                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{profile.title}</div>
                  <div className="text-[10px] text-slate-500 font-medium">Order #{idx + 1} • /{profile.slug}</div>
                </div>
              </div>

              {idx === 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold shrink-0">
                  Top Release ★
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Save Profile Arrangement</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
