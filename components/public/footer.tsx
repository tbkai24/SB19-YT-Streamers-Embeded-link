'use client';

import React from 'react';
import { Heart } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="w-full max-w-xl mt-12 mb-6 pt-6 border-t border-slate-200 text-center z-10">
      <p className="text-[11px] text-slate-500 font-medium">
        © {new Date().getFullYear()} <span className="text-rose-600 font-semibold">SB19 YouTube Streamers</span>. All rights reserved.
      </p>
    </footer>
  );
}
