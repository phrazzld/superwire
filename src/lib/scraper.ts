import * as cheerio from 'cheerio';
import { getSettings, NewsSource } from './sources';

// Type definitions
export interface ScrapedArticle {
  content: string;
  title?: string;
  author?: string;
  publishDate?: string;
  imageUrl?: string;
  excerpt?: string;
  wordCount: number;
  selector: string; // Which selector successfully extracted content
}

export interface ScrapeError {
  url: string;
  error: string;
  statusCode?: number;
  isPaywall: boolean;
  isTimeout: boolean;
}

// Common paywall indicators
const PAYWALL_INDICATORS = [
  'paywall',
  'subscribe',
  'subscription required',
  'members only',
  'premium content',
  'exclusive content',
  'sign in to read',
  'create an account',
  'limited articles remaining',
  'meter-expired',
  'payment-required',
];

// Content removal patterns
const CONTENT_REMOVAL_PATTERNS = [
  /ADVERTISEMENT/gi,
  /\[AD\]/gi,
  /Sponsored Content/gi,
  /Continue reading.../gi,
  /Read more at.../gi,
  /Sign up for our newsletter/gi,
  /Follow us on/gi,
  /Share this article/gi,
  /Related Articles?:/gi,
];

/**
 * Delay helper for retry logic
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if response indicates a paywall
 */
function detectPaywall(html: string, statusCode?: number): boolean {
  if (statusCode === 402 || statusCode === 403) {
    return true;
  }
  
  const lowerHtml = html.toLowerCase();
  return PAYWALL_INDICATORS.some(indicator => lowerHtml.includes(indicator));
}

/**
 * Clean extracted text content
 */
function cleanContent(text: string): string {
  let cleaned = text;
  
  // Remove content patterns
  CONTENT_REMOVAL_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Normalize whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return cleaned;
}

/**
 * Extract text using multiple fallback selectors
 */
function extractWithFallbacks(
  $: cheerio.CheerioAPI,
  primarySelector: string,
  fallbackSelectors?: string[]
): { content: string; selector: string } | null {
  // Try primary selector
  const primaryElement = $(primarySelector);
  if (primaryElement.length > 0) {
    const text = primaryElement.text().trim();
    if (text.length > 100) { // Minimum content threshold
      return { content: text, selector: primarySelector };
    }
  }
  
  // Try fallback selectors
  if (fallbackSelectors) {
    for (const selector of fallbackSelectors) {
      try {
        const element = $(selector);
        if (element.length > 0) {
          const text = element.text().trim();
          if (text.length > 100) {
            return { content: text, selector };
          }
        }
      } catch (error) {
        // Invalid selector, skip
        continue;
      }
    }
  }
  
  // Last resort: try common article patterns
  const commonSelectors = [
    'article',
    'main article',
    '.article-content',
    '.article-body',
    '.story-body',
    '.entry-content',
    '[itemprop="articleBody"]',
    '.post-content',
    '.content-body',
  ];
  
  for (const selector of commonSelectors) {
    try {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        if (text.length > 100) {
          return { content: text, selector: `fallback:${selector}` };
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

/**
 * Scrape article content from URL
 * @param url - Article URL to scrape
 * @param selector - Primary CSS selector for content
 * @param fallbackSelectors - Optional fallback selectors
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Scraped article content or error
 */
export async function scrapeArticle(
  url: string,
  selector: string,
  fallbackSelectors?: string[],
  maxRetries: number = 3
): Promise<ScrapedArticle | ScrapeError> {
  const settings = getSettings();
  let lastError: Error | null = null;
  let lastStatusCode: number | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Scraping ${url} (attempt ${attempt}/${maxRetries})`);
      
      // Fetch with timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), settings.requestTimeout);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': settings.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
      });
      
      clearTimeout(timeoutId);
      lastStatusCode = response.status;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Check for paywall
      if (detectPaywall(html, response.status)) {
        return {
          url,
          error: 'Paywall detected',
          statusCode: response.status,
          isPaywall: true,
          isTimeout: false,
        };
      }
      
      // Parse HTML with cheerio
      const $ = cheerio.load(html);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .advertisement, .social-share').remove();
      
      // Extract content with fallbacks
      const extraction = extractWithFallbacks($, selector, fallbackSelectors);
      
      if (!extraction) {
        throw new Error('Could not extract content with any selector');
      }
      
      const cleanedContent = cleanContent(extraction.content);
      
      // Extract metadata
      const title = $('h1').first().text().trim() || 
                   $('title').text().trim() ||
                   $('[property="og:title"]').attr('content') || '';
      
      const author = $('[rel="author"]').text().trim() ||
                    $('[itemprop="author"]').text().trim() ||
                    $('meta[name="author"]').attr('content') || '';
      
      const publishDate = $('time').first().attr('datetime') ||
                         $('[itemprop="datePublished"]').attr('content') ||
                         $('meta[property="article:published_time"]').attr('content') || '';
      
      const imageUrl = $('meta[property="og:image"]').attr('content') ||
                       $('article img').first().attr('src') || '';
      
      const excerpt = $('meta[name="description"]').attr('content') ||
                     $('meta[property="og:description"]').attr('content') || '';
      
      const wordCount = cleanedContent.split(/\s+/).length;
      
      console.log(`✅ Successfully scraped ${url} (${wordCount} words using ${extraction.selector})`);
      
      return {
        content: cleanedContent,
        title,
        author,
        publishDate,
        imageUrl,
        excerpt,
        wordCount,
        selector: extraction.selector,
      };
      
    } catch (error) {
      lastError = error as Error;
      
      // Check if timeout
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`⏱️ Timeout scraping ${url}`);
        if (attempt === maxRetries) {
          return {
            url,
            error: 'Request timeout',
            statusCode: lastStatusCode,
            isPaywall: false,
            isTimeout: true,
          };
        }
      } else {
        console.error(`❌ Scrape failed (attempt ${attempt}/${maxRetries}):`, error);
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }
  }
  
  // All retries failed
  return {
    url,
    error: lastError?.message || 'Unknown error',
    statusCode: lastStatusCode,
    isPaywall: false,
    isTimeout: false,
  };
}

/**
 * Scrape multiple articles in parallel with rate limiting
 */
export async function scrapeMultipleArticles(
  articles: { url: string; selector: string; fallbackSelectors?: string[] }[],
  maxConcurrent: number = 5
): Promise<(ScrapedArticle | ScrapeError)[]> {
  const results: (ScrapedArticle | ScrapeError)[] = [];
  
  // Process in chunks to respect concurrency limit
  for (let i = 0; i < articles.length; i += maxConcurrent) {
    const chunk = articles.slice(i, i + maxConcurrent);
    const chunkResults = await Promise.all(
      chunk.map(article => 
        scrapeArticle(article.url, article.selector, article.fallbackSelectors)
      )
    );
    results.push(...chunkResults);
    
    // Add small delay between chunks to be respectful
    if (i + maxConcurrent < articles.length) {
      await delay(500);
    }
  }
  
  return results;
}

/**
 * Test if a selector would work on given HTML
 */
export function testSelector(html: string, selector: string): boolean {
  try {
    const $ = cheerio.load(html);
    const element = $(selector);
    return element.length > 0 && element.text().trim().length > 100;
  } catch (error) {
    return false;
  }
}

/**
 * Extract all links from article content
 */
export function extractLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (href && href.startsWith('http')) {
      links.push(href);
    }
  });
  
  return [...new Set(links)]; // Remove duplicates
}