'use client';

// Imports for icons, database types, data tracking, and image handling
import React from 'react';
import { Article } from '@/types/database';
import { recordArticleClick } from '@/lib/data-store';
import { decodeHtmlEntities } from '@/lib/url-normalizer';
import { getWebsiteBadgeStyle } from '@/lib/brand-colors';
import { getCloudinaryImageUrl } from '@/lib/cloudinary';
import { ExternalLink, PlayCircle } from 'lucide-react';

// Props passed into ArticleCard component
interface ArticleCardProps {
  article: Article;
  accentColor?: string;
  isEngagementProfile?: boolean;
}

// Renders an individual article or social engagement card with thumbnail preview and CTA button
export function ArticleCard({ article, accentColor = '#e11d48', isEngagementProfile = false }: ArticleCardProps) {
  const [imageError, setImageError] = React.useState(false);
  const brandStyle = getWebsiteBadgeStyle(article.website_name);
  const cleanSite = (article.website_name || '').toLowerCase();
  
  // Standardized Action Label: "Open"
  const ctaText = 'Open';

  return (
    // Main card container link - records click count when clicked
    <a
      href={article.article_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => recordArticleClick(article.id)}
      className="group relative block w-full rounded-2xl overflow-hidden glass-card p-4 transition-all duration-300 border border-slate-200 hover:border-rose-400 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Thumbnail preview section */}
        {article.thumbnail && !imageError ? (
          <div className="relative w-full sm:w-28 h-28 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
            <img
              src={getCloudinaryImageUrl(article.thumbnail, { width: 400 })}
              alt={decodeHtmlEntities(article.title)}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />

            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <PlayCircle className="w-6 h-6 text-white drop-shadow" />
            </div>
          </div>
        ) : (
          <div className="w-full sm:w-28 h-28 sm:h-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
            <PlayCircle className="w-8 h-8 text-slate-400" />
          </div>
        )}

        {/* Content details: Brand Badge, Article Title, & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="inline-block px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider rounded-md border shadow-2xs transition-all"
              style={{
                backgroundColor: brandStyle.bg,
                color: brandStyle.text,
                borderColor: brandStyle.border,
              }}
            >
              {decodeHtmlEntities(article.website_name)}
            </span>
          </div>
          <h3 className="font-bold text-slate-900 group-hover:text-rose-600 line-clamp-2 text-base transition-colors">
            {decodeHtmlEntities(article.title)}
          </h3>
          {article.description && (
            <p className="text-xs text-slate-600 line-clamp-1 mt-1 font-medium">
              {decodeHtmlEntities(article.description)}
            </p>
          )}
        </div>

        {/* Action Button: Styled using the chosen theme accent color */}
        <div className="shrink-0 flex items-center justify-end sm:self-center w-full sm:w-auto mt-2 sm:mt-0">
          <div 
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white transition-all group-hover:translate-x-0.5 shadow-sm"
            style={{ backgroundColor: accentColor }}
          >
            <span>{ctaText}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </a>
  );
}
