"use client";

import React from "react";

interface ArticleCardProps {
  article: {
    id: string;
    headline: string;
    excerpt: string;
    content?: string;
    readTime: number;
    sources: string[];
    createdAt: string;
  };
  variant?: "compact" | "full" | "featured";
  onClick?: () => void;
  showDate?: boolean;
  maxExcerptLines?: number;
}

export default function ArticleCard({
  article,
  variant = "compact",
  onClick,
  showDate = false,
  maxExcerptLines = 3
}: ArticleCardProps) {
  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
  };

  const formatTime = (date: string): string => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true
    });
  };

  // Variant-specific styles
  const variantStyles = {
    compact: {
      container: "p-5",
      headline: "font-semibold text-gray-900 mb-2 line-clamp-2",
      excerpt: "text-gray-600 text-sm mb-3",
      metadata: "text-xs text-gray-500"
    },
    full: {
      container: "p-6",
      headline: "text-xl font-semibold text-gray-900 mb-3",
      excerpt: "text-gray-700 mb-4",
      metadata: "text-sm text-gray-500"
    },
    featured: {
      container: "p-6 hover:shadow-md transition-shadow",
      headline: "text-2xl font-bold text-gray-900 mb-3",
      excerpt: "text-gray-700 text-base mb-4",
      metadata: "text-sm text-gray-600"
    }
  };

  const styles = variantStyles[variant];
  const excerptClamp = `line-clamp-${maxExcerptLines}`;

  return (
    <div 
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200 
        ${styles.container}
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      `}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Category/Source Badge (optional for featured) */}
      {variant === "featured" && article.sources[0] && (
        <div className="mb-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {article.sources[0]}
          </span>
        </div>
      )}

      {/* Headline */}
      <h3 className={styles.headline}>
        {article.headline}
      </h3>

      {/* Excerpt */}
      <p className={`${styles.excerpt} ${excerptClamp}`}>
        {article.excerpt}
      </p>

      {/* Metadata */}
      <div className={`flex items-center justify-between ${styles.metadata}`}>
        <div className="flex items-center space-x-3">
          {/* Read Time */}
          <span className="flex items-center">
            <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {article.readTime} min read
          </span>

          {/* Sources */}
          {variant !== "compact" && article.sources.length > 0 && (
            <span className="flex items-center">
              <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              {article.sources.slice(0, 2).join(", ")}
              {article.sources.length > 2 && ` +${article.sources.length - 2}`}
            </span>
          )}
        </div>

        {/* Date/Time */}
        {showDate && (
          <span className="text-right">
            {variant === "full" ? formatTime(article.createdAt) : formatDate(article.createdAt)}
          </span>
        )}

        {/* Read More Arrow (for clickable cards) */}
        {onClick && variant !== "compact" && (
          <span className="flex items-center text-blue-600">
            Read more
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}

// Export a grid wrapper component for consistent layout
export function ArticleGrid({ 
  children, 
  columns = "auto" 
}: { 
  children: React.ReactNode; 
  columns?: "auto" | 1 | 2 | 3 
}) {
  const columnClasses = {
    auto: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
  };

  const gridClass = typeof columns === "number" ? columnClasses[columns] : columnClasses.auto;

  return (
    <div className={`grid ${gridClass} gap-6`}>
      {children}
    </div>
  );
}

// Export a skeleton loader for loading states
export function ArticleCardSkeleton({ variant = "compact" }: { variant?: "compact" | "full" | "featured" }) {
  const variantStyles = {
    compact: "p-5",
    full: "p-6",
    featured: "p-6"
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${variantStyles[variant]} animate-pulse`}>
      {variant === "featured" && (
        <div className="w-20 h-5 bg-gray-200 rounded-full mb-3"></div>
      )}
      <div className="h-6 bg-gray-200 rounded mb-3"></div>
      <div className="h-4 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="flex justify-between">
        <div className="h-3 bg-gray-200 rounded w-24"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );
}