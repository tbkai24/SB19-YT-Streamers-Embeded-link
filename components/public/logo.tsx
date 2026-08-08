'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function BrandLogo({ size = 'md', showText = true }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  const localLogoUrl = '/assets/ytslogo.jpg';

  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="relative shrink-0">
        {!imgError ? (
          <img
            src={localLogoUrl}
            alt="SB19 YouTube Streamers"
            onError={() => setImgError(true)}
            className={`${iconSizes[size]} object-cover rounded-xl drop-shadow group-hover:scale-105 transition-transform`}
          />
        ) : (
          <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-tr from-rose-600 via-red-600 to-amber-500 flex items-center justify-center font-extrabold text-white shadow-md shadow-rose-200 group-hover:scale-105 transition-transform`}>
            <span>SB</span>
          </div>
        )}
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-slate-900 tracking-tight leading-none text-sm group-hover:text-rose-600 transition-colors">
            SB19 <span className="text-rose-600">YouTube Streamers</span>
          </span>
        </div>
      )}
    </Link>
  );
}
