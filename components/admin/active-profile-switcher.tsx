'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Profile } from '@/types/database';
import { ReorderProfilesModal } from './reorder-profiles-modal';
import { ChevronDown, Plus, Check, Layers, ArrowUpDown } from 'lucide-react';

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
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl bg-white p-2.5 border border-slate-200 shadow-2xl z-50 animate-fade-in text-slate-900">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-600 flex items-center justify-between border-b border-slate-100 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-rose-600" />
              <span>Active Profiles</span>
            </div>
            {profiles.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsReorderOpen(true);
                }}
                className="text-[10px] font-bold text-slate-600 hover:text-rose-600 flex items-center gap-1 cursor-pointer hover:bg-slate-100 px-1.5 py-0.5 rounded-md transition-colors"
                title="Arrange profile order"
              >
                <ArrowUpDown className="w-3 h-3 text-rose-600" />
                <span>Arrange</span>
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {profiles.map((profile) => {
              const isSelected = activeProfile?.id === profile.id;
              return (
                <button
                  key={profile.id}
                  onClick={() => {
                    onSelectProfile(profile);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                      : 'text-slate-800 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 border border-slate-300"
                      style={{ backgroundColor: profile.accent_color || '#e11d48' }}
                    />
                    <span className="truncate">{profile.title}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-rose-600 shrink-0" />}
                </button>
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

      <ReorderProfilesModal
        isOpen={isReorderOpen}
        profiles={profiles}
        onClose={() => setIsReorderOpen(false)}
        onSaved={() => {
          if (onRefreshData) onRefreshData();
        }}
      />
    </div>
  );
}
