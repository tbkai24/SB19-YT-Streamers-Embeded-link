'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Profile } from '@/types/database';
import { updateProfilesOrderInSupabase } from '@/lib/data-store';
import { ChevronDown, Plus, Check, Layers, GripVertical } from 'lucide-react';

interface ProfileSwitcherProps {
  profiles: Profile[];
  activeProfile: Profile | null;
  onSelectProfile: (profile: Profile) => void;
  onCreateNewProfile: () => void;
  onRefreshData?: () => void;
}

export function ActiveProfileSwitcher({
  profiles,
  activeProfile,
  onSelectProfile,
  onCreateNewProfile,
  onRefreshData,
}: ProfileSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [profileList, setProfileList] = useState<Profile[]>(profiles);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfileList([...profiles].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)));
  }, [profiles]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...profileList];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);

    setProfileList(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);

    const updates = updated.map((p, idx) => ({
      id: p.id,
      display_order: idx + 1,
    }));

    await updateProfilesOrderInSupabase(updates);
    if (onRefreshData) onRefreshData();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 transition-all text-xs font-bold shadow-2xs cursor-pointer"
      >
        {activeProfile ? (
          <>
            <div
              className="w-3 h-3 rounded-full shrink-0 shadow-xs border border-slate-300"
              style={{ backgroundColor: activeProfile.accent_color || '#e11d48' }}
            />
            <span className="max-w-[140px] truncate">{activeProfile.title}</span>
          </>
        ) : (
          <span>Select Profile</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-white p-2.5 border border-slate-200 shadow-2xl z-50 animate-fade-in text-slate-900">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-600 flex items-center justify-between border-b border-slate-100 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-rose-600" />
              <span>Active Profiles</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">Drag handle to re-order</span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {profileList.map((profile, idx) => {
              const isSelected = activeProfile?.id === profile.id;
              return (
                <div
                  key={profile.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    draggedIndex === idx ? 'opacity-30 bg-rose-50 border-2 border-dashed border-rose-300' :
                    dragOverIndex === idx ? 'bg-rose-50 border-t-2 border-rose-600 scale-[1.01]' :
                    isSelected ? 'bg-rose-50/90 text-rose-700 border border-rose-200 shadow-2xs' : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-grab active:cursor-grabbing rounded-md hover:bg-slate-200/60 shrink-0"
                      title="Drag to re-order profile"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectProfile(profile);
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0 border border-slate-300"
                        style={{ backgroundColor: profile.accent_color || '#e11d48' }}
                      />
                      <span className="truncate">{profile.title}</span>
                    </button>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-rose-600 shrink-0 ml-1" />}
                </div>
              );
            })}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setIsOpen(false);
                onCreateNewProfile();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Profile</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
