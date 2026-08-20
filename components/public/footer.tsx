'use client';

import React from 'react';
import { Heart } from 'lucide-react';

// Props for PublicFooter component
interface PublicFooterProps {
  onOpenSupport?: () => void;
}

export function PublicFooter({ onOpenSupport }: PublicFooterProps) {
  return (
    <footer className="w-full max-w-xl mt-12 mb-6 pt-6 border-t border-slate-200 text-center z-10 space-y-3">
      {/* Support & Hosting Maintenance Button */}
      {onOpenSupport && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onOpenSupport}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-500" />
            <span>Support Project & Hosting Maintenance</span>
          </button>
        </div>
      )}

      {/* Copyright Branding Footer */}
      <p className="text-[11px] text-slate-500 font-medium">
        © {new Date().getFullYear()} <span className="text-rose-600 font-semibold">SB19 YouTube Streamers</span>. All rights reserved.
      </p>
    </footer>
  );
}
