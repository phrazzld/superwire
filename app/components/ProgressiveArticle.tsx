"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

/**
 * Progressive Article Component
 * 
 * Implements progressive loading for article content:
 * - First paragraph loads immediately
 * - Rest of content loads on demand (scroll, click, or auto-load)
 * - Uses Intersection Observer for automatic loading when in viewport
 * - Provides smooth transitions and loading states
 */

interface ProgressiveArticleProps {
  headline: string;
  firstParagraph: string;
  remainingContent?: string;
  metadata?: {
    author?: string;
    date?: string;
    readTime?: number;
    sources?: string[];
  };
  autoLoad?: boolean; // Auto-load when scrolled into view
  loadDelay?: number; // Delay before loading rest of content (ms)
  onLoadComplete?: () => void;
}

export default function ProgressiveArticle({
  headline,
  firstParagraph,
  remainingContent,
  metadata,
  autoLoad = true,
  loadDelay = 0,
  onLoadComplete
}: ProgressiveArticleProps) {
  const [isLoadingRest, setIsLoadingRest] = useState(false);
  const [restLoaded, setRestLoaded] = useState(false);
  const [restContent, setRestContent] = useState<string | null>(null);
  const loadTriggerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredLoad = useRef(false);

  // Load rest of content
  const loadRestOfContent = useCallback(async () => {
    if (hasTriggeredLoad.current || !remainingContent) return;
    hasTriggeredLoad.current = true;

    setIsLoadingRest(true);
    
    // Simulate async loading with optional delay
    if (loadDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, loadDelay));
    }
    
    setRestContent(remainingContent);
    setRestLoaded(true);
    setIsLoadingRest(false);
    
    if (onLoadComplete) {
      onLoadComplete();
    }
  }, [remainingContent, loadDelay, onLoadComplete]);

  // Set up Intersection Observer for auto-loading
  useEffect(() => {
    if (!autoLoad || !loadTriggerRef.current || restLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !hasTriggeredLoad.current) {
            loadRestOfContent();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before element is visible
        threshold: 0.1
      }
    );

    observer.observe(loadTriggerRef.current);

    return () => observer.disconnect();
  }, [autoLoad, restLoaded, loadRestOfContent]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  // Split content into paragraphs
  const splitIntoParagraphs = (text: string): string[] => {
    return text
      .split(/\n\n+/)
      .filter(p => p.trim().length > 0)
      .map(p => p.trim());
  };

  const firstParagraphs = splitIntoParagraphs(firstParagraph);
  const remainingParagraphs = restContent ? splitIntoParagraphs(restContent) : [];

  return (
    <article className="max-w-4xl mx-auto">
      {/* Article Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
          {headline}
        </h1>
        
        {metadata && (
          <div className="flex flex-wrap items-center text-sm text-gray-600 gap-4">
            {metadata.author && (
              <span className="font-medium">{metadata.author}</span>
            )}
            {metadata.date && (
              <time dateTime={metadata.date}>
                {formatDate(metadata.date)}
              </time>
            )}
            {metadata.readTime && (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {metadata.readTime} min read
              </span>
            )}
            {metadata.sources && metadata.sources.length > 0 && (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Sources: {metadata.sources.join(", ")}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Article Content */}
      <div className="prose prose-lg max-w-none">
        {/* First paragraph(s) - loaded immediately */}
        <div className="space-y-4 mb-6">
          {firstParagraphs.map((paragraph, index) => (
            <p key={`first-${index}`} className="text-gray-800 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Load trigger point */}
        <div ref={loadTriggerRef} className="relative">
          {/* Loading indicator or Load More button */}
          {!restLoaded && remainingContent && (
            <div className="my-8">
              {isLoadingRest ? (
                <LoadingIndicator />
              ) : (
                !autoLoad && (
                  <button
                    onClick={loadRestOfContent}
                    className="w-full py-3 px-6 bg-blue-50 hover:bg-blue-100 text-blue-700 
                      rounded-lg font-medium transition-colors duration-200 
                      flex items-center justify-center gap-2"
                  >
                    <span>Continue Reading</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )
              )}
            </div>
          )}

          {/* Remaining paragraphs - loaded progressively */}
          {restLoaded && (
            <div className="space-y-4 animate-fadeIn">
              {remainingParagraphs.map((paragraph, index) => (
                <p key={`rest-${index}`} className="text-gray-800 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Loading indicator component
 */
function LoadingIndicator() {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="space-y-3 w-full max-w-2xl">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
      </div>
    </div>
  );
}

/**
 * Hook for progressive content loading
 * Can be used to load content from API
 */
export function useProgressiveContent(
  articleId: string,
  options?: {
    preloadDelay?: number;
    cacheResults?: boolean;
  }
) {
  const [firstParagraph, setFirstParagraph] = useState<string>("");
  const [remainingContent, setRemainingContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        
        // Fetch first paragraph immediately
        const firstResponse = await fetch(`/api/articles/${articleId}/first-paragraph`);
        if (!firstResponse.ok) throw new Error("Failed to load first paragraph");
        const firstData = await firstResponse.json();
        setFirstParagraph(firstData.content);
        
        // Optionally preload rest of content after delay
        if (options?.preloadDelay) {
          setTimeout(async () => {
            const restResponse = await fetch(`/api/articles/${articleId}/remaining-content`);
            if (restResponse.ok) {
              const restData = await restResponse.json();
              setRemainingContent(restData.content);
            }
          }, options.preloadDelay);
        } else {
          // Load rest of content immediately
          const restResponse = await fetch(`/api/articles/${articleId}/remaining-content`);
          if (restResponse.ok) {
            const restData = await restResponse.json();
            setRemainingContent(restData.content);
          }
        }
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setLoading(false);
      }
    };

    loadContent();
  }, [articleId, options?.preloadDelay]);

  return { firstParagraph, remainingContent, loading, error };
}

/**
 * CSS animations (add to global styles or Tailwind config)
 */
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
  }
`;