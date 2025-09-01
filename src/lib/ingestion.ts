import { getEnabledSources, getSettings, NewsSource } from './sources';
import { fetchRSS, RSSItem, getRecentItems, deduplicateItems, sortByDate } from './rss-fetcher';
import { scrapeArticle, ScrapedArticle, ScrapeError } from './scraper';

// Type definitions
export interface IngestedArticle {
  // RSS metadata
  title: string;
  url: string;
  pubDate: string;
  source: string;
  sourceName: string;
  
  // Scraped content
  content?: string;
  author?: string;
  imageUrl?: string;
  excerpt?: string;
  wordCount?: number;
  
  // Processing metadata
  scrapedAt?: Date;
  scrapeError?: string;
  isPaywalled?: boolean;
}

export interface IngestionResult {
  articles: IngestedArticle[];
  stats: {
    totalFetched: number;
    totalScraped: number;
    totalErrors: number;
    paywallCount: number;
    timeElapsed: number;
    sourceBreakdown: Record<string, {
      fetched: number;
      scraped: number;
      errors: number;
    }>;
  };
  errors: Array<{
    source: string;
    url?: string;
    error: string;
  }>;
}

/**
 * Delay helper for rate limiting
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch RSS items from a single news source
 */
async function fetchSourceRSS(source: NewsSource): Promise<{
  source: NewsSource;
  items: RSSItem[];
  error?: string;
}> {
  try {
    console.log(`📰 Fetching RSS from ${source.displayName}...`);
    const items = await fetchRSS(source.rss);
    
    // Get only recent items (last 24 hours by default)
    const recentItems = getRecentItems(items, 24);
    
    console.log(`✅ Fetched ${recentItems.length} recent articles from ${source.displayName}`);
    return { source, items: recentItems };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to fetch from ${source.displayName}: ${errorMsg}`);
    return { source, items: [], error: errorMsg };
  }
}

/**
 * Scrape article content with source-specific selectors
 */
async function scrapeArticleWithSource(
  item: RSSItem,
  source: NewsSource
): Promise<IngestedArticle> {
  const article: IngestedArticle = {
    title: item.title,
    url: item.link,
    pubDate: item.pubDate,
    source: source.name,
    sourceName: source.displayName,
  };
  
  // Skip if URL is invalid
  if (!item.link || !item.link.startsWith('http')) {
    article.scrapeError = 'Invalid URL';
    return article;
  }
  
  // Attempt to scrape
  const result = await scrapeArticle(
    item.link,
    source.selector,
    source.fallbackSelectors
  );
  
  // Handle scrape result
  if ('content' in result) {
    // Successful scrape
    article.content = result.content;
    article.author = result.author;
    article.imageUrl = result.imageUrl;
    article.excerpt = result.excerpt || item.contentSnippet;
    article.wordCount = result.wordCount;
    article.scrapedAt = new Date();
  } else {
    // Scrape error
    article.scrapeError = result.error;
    article.isPaywalled = result.isPaywall;
    
    // Use RSS content as fallback if available
    if (item.content || item.contentSnippet) {
      article.content = item.content || item.contentSnippet;
      article.wordCount = article.content!.split(/\s+/).length;
    }
  }
  
  return article;
}

/**
 * Main ingestion function - fetches and scrapes news from all sources
 * @param minArticles - Minimum number of articles to target (default: 100)
 * @param maxArticlesPerSource - Maximum articles to fetch per source
 * @returns Ingestion result with articles and statistics
 */
export async function ingestDailyNews(
  minArticles: number = 100,
  maxArticlesPerSource?: number
): Promise<IngestionResult> {
  const startTime = Date.now();
  const settings = getSettings();
  const sources = getEnabledSources();
  
  // Override max articles per source if specified
  const maxPerSource = maxArticlesPerSource || settings.maxArticlesPerSource;
  
  const result: IngestionResult = {
    articles: [],
    stats: {
      totalFetched: 0,
      totalScraped: 0,
      totalErrors: 0,
      paywallCount: 0,
      timeElapsed: 0,
      sourceBreakdown: {},
    },
    errors: [],
  };
  
  console.log(`🚀 Starting news ingestion from ${sources.length} sources...`);
  console.log(`📊 Target: ${minArticles} articles minimum`);
  
  // Step 1: Fetch RSS feeds from all sources in parallel
  console.log('\n📥 Phase 1: Fetching RSS feeds...');
  const rssResults = await Promise.all(
    sources.map(source => fetchSourceRSS(source))
  );
  
  // Collect all RSS items with source metadata
  const allRSSItems: Array<{ item: RSSItem; source: NewsSource }> = [];
  
  for (const rssResult of rssResults) {
    const { source, items, error } = rssResult;
    
    // Initialize source stats
    result.stats.sourceBreakdown[source.name] = {
      fetched: 0,
      scraped: 0,
      errors: 0,
    };
    
    if (error) {
      result.errors.push({ source: source.name, error });
      continue;
    }
    
    // Limit items per source and add to collection
    const limitedItems = items.slice(0, maxPerSource);
    result.stats.sourceBreakdown[source.name].fetched = limitedItems.length;
    result.stats.totalFetched += limitedItems.length;
    
    for (const item of limitedItems) {
      allRSSItems.push({ item, source });
    }
  }
  
  console.log(`📈 Fetched ${result.stats.totalFetched} total RSS items`);
  
  // Step 2: Deduplicate and sort by date
  const uniqueItems = deduplicateItems(allRSSItems.map(x => x.item));
  const sortedItems = sortByDate(uniqueItems);
  
  // Map back to items with sources
  const itemsToScrape = sortedItems
    .map(item => {
      const match = allRSSItems.find(x => x.item.link === item.link);
      return match;
    })
    .filter((x): x is { item: RSSItem; source: NewsSource } => x !== undefined);
  
  console.log(`📊 After deduplication: ${itemsToScrape.length} unique articles`);
  
  // Step 3: Scrape articles in chunks with rate limiting
  console.log('\n🔍 Phase 2: Scraping article content...');
  
  const maxConcurrent = settings.maxConcurrentRequests;
  let scrapedCount = 0;
  
  for (let i = 0; i < itemsToScrape.length; i += maxConcurrent) {
    // Check if we've reached our minimum
    if (result.articles.length >= minArticles) {
      console.log(`✅ Reached target of ${minArticles} articles`);
      break;
    }
    
    const chunk = itemsToScrape.slice(i, i + maxConcurrent);
    console.log(`🔄 Scraping batch ${Math.floor(i / maxConcurrent) + 1} (${chunk.length} articles)...`);
    
    // Scrape chunk in parallel
    const chunkResults = await Promise.all(
      chunk.map(({ item, source }) => scrapeArticleWithSource(item, source))
    );
    
    // Process results
    for (const article of chunkResults) {
      const sourceStats = result.stats.sourceBreakdown[article.source];
      
      if (article.content && !article.scrapeError) {
        // Successfully scraped
        result.articles.push(article);
        result.stats.totalScraped++;
        sourceStats.scraped++;
        scrapedCount++;
        
        if (scrapedCount % 10 === 0) {
          console.log(`📈 Progress: ${scrapedCount} articles scraped`);
        }
      } else {
        // Scrape failed
        result.stats.totalErrors++;
        sourceStats.errors++;
        
        if (article.isPaywalled) {
          result.stats.paywallCount++;
        }
        
        // Include article even if scrape failed (might have RSS content)
        if (article.content) {
          result.articles.push(article);
        } else {
          result.errors.push({
            source: article.source,
            url: article.url,
            error: article.scrapeError || 'No content available',
          });
        }
      }
    }
    
    // Rate limiting delay between chunks
    if (i + maxConcurrent < itemsToScrape.length && result.articles.length < minArticles) {
      await delay(500);
    }
  }
  
  // Step 4: Final statistics
  result.stats.timeElapsed = Date.now() - startTime;
  
  console.log('\n📊 Ingestion Complete!');
  console.log(`✅ Successfully ingested ${result.articles.length} articles`);
  console.log(`⏱️ Time elapsed: ${(result.stats.timeElapsed / 1000).toFixed(1)}s`);
  console.log(`📈 Stats:`);
  console.log(`   - Total fetched: ${result.stats.totalFetched}`);
  console.log(`   - Total scraped: ${result.stats.totalScraped}`);
  console.log(`   - Total errors: ${result.stats.totalErrors}`);
  console.log(`   - Paywalls hit: ${result.stats.paywallCount}`);
  
  console.log('\n📰 Source breakdown:');
  for (const [source, stats] of Object.entries(result.stats.sourceBreakdown)) {
    if (stats.fetched > 0) {
      console.log(`   ${source}: ${stats.scraped}/${stats.fetched} scraped (${stats.errors} errors)`);
    }
  }
  
  return result;
}

/**
 * Ingest news from specific sources only
 */
export async function ingestFromSources(
  sourceNames: string[],
  maxArticlesPerSource?: number
): Promise<IngestionResult> {
  const allSources = getEnabledSources();
  const selectedSources = allSources.filter(s => sourceNames.includes(s.name));
  
  if (selectedSources.length === 0) {
    throw new Error(`No enabled sources found matching: ${sourceNames.join(', ')}`);
  }
  
  console.log(`📰 Ingesting from ${selectedSources.length} selected sources: ${selectedSources.map(s => s.displayName).join(', ')}`);
  
  // Temporarily override sources
  const originalSources = allSources;
  Object.defineProperty(exports, 'getEnabledSources', {
    value: () => selectedSources,
    writable: true,
    configurable: true,
  });
  
  try {
    // Run ingestion with selected sources
    const result = await ingestDailyNews(
      selectedSources.length * (maxArticlesPerSource || 20),
      maxArticlesPerSource
    );
    return result;
  } finally {
    // Restore original sources
    Object.defineProperty(exports, 'getEnabledSources', {
      value: () => originalSources,
      writable: true,
      configurable: true,
    });
  }
}

/**
 * Test ingestion with a small sample
 */
export async function testIngestion(): Promise<void> {
  console.log('🧪 Running test ingestion with limited scope...');
  
  // Test with just 10 articles from 2 sources
  const result = await ingestFromSources(['reuters', 'bbc'], 5);
  
  console.log('\n✅ Test Results:');
  console.log(`Articles ingested: ${result.articles.length}`);
  console.log(`Errors encountered: ${result.errors.length}`);
  
  if (result.articles.length > 0) {
    const sample = result.articles[0];
    console.log('\n📄 Sample article:');
    console.log(`  Title: ${sample.title}`);
    console.log(`  Source: ${sample.sourceName}`);
    console.log(`  Word count: ${sample.wordCount || 'N/A'}`);
    console.log(`  Has content: ${!!sample.content}`);
  }
}

// Export for testing
export { delay };