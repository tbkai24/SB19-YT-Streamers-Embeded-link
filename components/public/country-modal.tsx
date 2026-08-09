'use client';

import React, { useState } from 'react';
import { Globe, X, Search, Sparkles, TrendingUp } from 'lucide-react';
import { getCountryFlagEmoji, COUNTRY_NAMES, getCountryName } from '@/lib/device-detector';

interface CountryBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  countryBreakdown?: Record<string, number> | null;
  profileTitle?: string;
}

export function CountryBreakdownModal({
  isOpen,
  onClose,
  countryBreakdown,
  profileTitle,
}: CountryBreakdownModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const rawMap = countryBreakdown || {};
  const totalCount = Object.values(rawMap).reduce((a, b) => a + b, 0);

  // Sort countries by count descending
  const sortedCountries = Object.entries(rawMap)
    .map(([code, count]) => {
      const name = getCountryName(code);
      const flag = getCountryFlagEmoji(code);
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      return { code, name, flag, count, percentage };
    })
    .sort((a, b) => b.count - a.count);

  const filteredCountries = sortedCountries.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 text-white relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 text-white shadow-xs">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Global Streamers</span>
              </div>
              <h2 className="text-lg font-extrabold leading-tight text-white line-clamp-1">
                {profileTitle ? `${profileTitle}` : 'Country Breakdown'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5 text-slate-700">
            <TrendingUp className="w-4 h-4 text-rose-500" />
            <span>Total Logged Streams:</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-extrabold border border-rose-200">
            {totalCount.toLocaleString()} {totalCount === 1 ? 'stream' : 'streams'}
          </span>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:bg-white transition-all font-medium border border-transparent focus:border-rose-300"
            />
          </div>
        </div>

        {/* Country List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredCountries.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium">
              {totalCount === 0 ? 'No country streaming data recorded yet.' : `No countries match "${searchQuery}".`}
            </div>
          ) : (
            filteredCountries.map((c) => (
              <div
                key={c.code}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-rose-300 hover:bg-rose-50/30 transition-all flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="text-xl leading-none">{c.flag}</span>
                    <span>{c.name}</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-600">
                      {c.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">{c.count.toLocaleString()}</span>
                    <span className="text-[11px] font-bold text-rose-600 w-9 text-right">{c.percentage}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(c.percentage, 3)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm transition-all active:scale-[0.99]"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
