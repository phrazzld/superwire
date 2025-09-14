import RSSParser from 'rss-parser';
import { getSettings } from './sources';

// Type definitions for RSS feed items
export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  categories?: string[];
  author?: string;
}

// Initialize RSS parser with custom fields
const parser = new RSSParser({
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['media:content', 'media'],
      ['description', 'description'],
    ],
  },
  timeout: 10000, // 10 second timeout
  headers: {
    'User-Agent': 'Superwire News Bot/1.0 (+https://superwire.news/bot)',
  },
});

/**
 * Delay helper for retry logic
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch and parse RSS feed with retry logic
 * @param url - RSS feed URL
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Array of RSS items
 */
export async function fetchRSS(
  url: string,
  maxRetries: number = 3
): Promise<RSSItem[]> {
  const settings = getSettings();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Fetching RSS feed: ${url} (attempt ${attempt}/${maxRetries})`);
      
      const feed = await parser.parseURL(url);
      
      if (!feed.items || feed.items.length === 0) {
        console.warn(`⚠️ RSS feed returned no items: ${url}`);
        return [];
      }

      // Transform RSS items to our format
      const items: RSSItem[] = feed.items.map(item => ({
        title: item.title || 'Untitled',
        link: item.link || item.guid || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        content: item.content || item['content:encoded'] || item.contentSnippet || '',
        contentSnippet: item.contentSnippet || '',
        guid: item.guid || item.link || '',
        categories: item.categories || [],
        author: (item as any).creator || (item as any).author || '',
      }));

      console.log(`✅ Successfully fetched ${items.length} items from ${url}`);
      return items;

    } catch (error) {
      lastError = error as Error;
      console.error(`❌ RSS fetch failed (attempt ${attempt}/${maxRetries}):`, error);

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }
  }

  // All retries failed
  throw new Error(`Failed to fetch RSS feed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Fetch RSS feeds from multiple sources in parallel
 * @param urls - Array of RSS feed URLs
 * @returns Array of RSS items from all sources
 */
export async function fetchMultipleRSS(urls: string[]): Promise<{
  source: string;
  items: RSSItem[];
  error?: string;
}[]> {
  const settings = getSettings();
  
  // Limit concurrent requests
  const chunks: string[][] = [];
  for (let i = 0; i < urls.length; i += settings.maxConcurrentRequests) {
    chunks.push(urls.slice(i, i + settings.maxConcurrentRequests));
  }

  const results: { source: string; items: RSSItem[]; error?: string }[] = [];

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (url) => {
        try {
          const items = await fetchRSS(url);
          return { source: url, items };
        } catch (error) {
          console.error(`Failed to fetch ${url}:`, error);
          return { 
            source: url, 
            items: [], 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      })
    );
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Filter RSS items by date range
 * @param items - Array of RSS items
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Filtered array of RSS items
 */
export function filterByDateRange(
  items: RSSItem[],
  startDate: Date,
  endDate: Date
): RSSItem[] {
  return items.filter(item => {
    const itemDate = new Date(item.pubDate);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

/**
 * Get RSS items from the last N hours
 * @param items - Array of RSS items
 * @param hours - Number of hours to look back
 * @returns Filtered array of RSS items
 */
export function getRecentItems(items: RSSItem[], hours: number = 24): RSSItem[] {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);
  
  return items.filter(item => {
    const itemDate = new Date(item.pubDate);
    return itemDate >= cutoffTime;
  });
}

/**
 * Sort RSS items by publication date
 * @param items - Array of RSS items
 * @param ascending - Sort order (default: false for newest first)
 * @returns Sorted array of RSS items
 */
export function sortByDate(items: RSSItem[], ascending: boolean = false): RSSItem[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime();
    const dateB = new Date(b.pubDate).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

/**
 * Remove duplicate RSS items by link
 * @param items - Array of RSS items
 * @returns Array of unique RSS items
 */
export function deduplicateItems(items: RSSItem[]): RSSItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.link)) {
      return false;
    }
    seen.add(item.link);
    return true;
  });
}

/**
 * Validate RSS item has required fields
 * @param item - RSS item to validate
 * @returns Boolean indicating if item is valid
 */
export function validateItem(item: RSSItem): boolean {
  return !!(
    item.title &&
    item.link &&
    item.pubDate &&
    item.link.startsWith('http')
  );
}

/**
 * Extract clean text from RSS content (removes HTML)
 * @param content - Raw RSS content (may contain HTML)
 * @returns Clean text content
 */
export function extractTextFromContent(content: string): string {
  // Remove HTML tags
  let text = content.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}