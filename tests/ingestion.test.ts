import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { 
  ingestDailyNews, 
  ingestFromSource,
  testIngestion 
} from '../src/lib/ingestion';
import { 
  fetchRSS, 
  fetchMultipleRSS 
} from '../src/lib/rss-fetcher';
import { 
  scrapeArticle, 
  ScrapeResult 
} from '../src/lib/scraper';
import { 
  getEnabledSources, 
  loadSourcesConfiguration 
} from '../src/lib/sources';

describe('News Ingestion Pipeline', () => {
  let sources: any[];

  beforeAll(async () => {
    // Load news sources configuration
    const config = await loadSourcesConfiguration();
    sources = getEnabledSources(config);
  });

  describe('RSS Fetching', () => {
    it('should fetch RSS feeds from all configured sources', async () => {
      const results = await Promise.allSettled(
        sources.map(source => fetchRSS(source.rss))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // At least 60% of sources should be reachable
      expect(successful).toBeGreaterThan(sources.length * 0.6);
      
      // Log failures for debugging
      if (failed > 0) {
        console.log(`Failed to fetch ${failed} out of ${sources.length} RSS feeds`);
      }
    }, 30000); // 30 second timeout

    it('should parse RSS items with required fields', async () => {
      const testSource = sources[0];
      const items = await fetchRSS(testSource.rss);
      
      expect(items.length).toBeGreaterThan(0);
      
      const firstItem = items[0];
      expect(firstItem).toHaveProperty('title');
      expect(firstItem).toHaveProperty('link');
      expect(firstItem).toHaveProperty('pubDate');
      expect(firstItem).toHaveProperty('content');
    }, 15000);

    it('should handle parallel RSS fetching efficiently', async () => {
      const startTime = Date.now();
      const results = await fetchMultipleRSS(
        sources.map(s => s.rss),
        { maxConcurrent: 5 }
      );
      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time (< 10s for 5 sources)
      expect(duration).toBeLessThan(10000);
      expect(results.items.length).toBeGreaterThan(0);
      expect(results.errors.length).toBeLessThanOrEqual(sources.length * 0.4);
    }, 15000);
  });

  describe('Article Scraping', () => {
    it('should scrape article content from valid URLs', async () => {
      // Use a test article URL (you may need to update this)
      const testUrl = 'https://www.reuters.com/world/';
      const selector = 'article';
      
      const result = await scrapeArticle(testUrl, selector);
      
      if (result.success) {
        expect(result.data.content).toBeTruthy();
        expect(result.data.content.length).toBeGreaterThan(100);
        expect(result.data.metadata).toBeDefined();
      } else {
        // If scraping fails, ensure proper error handling
        expect(result.error).toBeDefined();
        expect(['PAYWALL', 'TIMEOUT', 'SELECTOR_NOT_FOUND', 'FETCH_ERROR'])
          .toContain(result.error.type);
      }
    }, 15000);

    it('should detect and handle paywalls', async () => {
      const paywallUrl = 'https://www.wsj.com/articles/test';
      const result = await scrapeArticle(paywallUrl, 'article');
      
      if (!result.success && result.error.type === 'PAYWALL') {
        expect(result.error.message).toContain('paywall');
      }
    }, 10000);

    it('should use fallback selectors when primary fails', async () => {
      const testUrl = 'https://apnews.com/';
      const primarySelector = '.non-existent-selector';
      const fallbackSelectors = ['.Body', 'main', 'article'];
      
      const result = await scrapeArticle(testUrl, primarySelector, {
        fallbackSelectors
      });
      
      // Should attempt fallbacks
      if (result.success) {
        expect(result.data.content).toBeTruthy();
      }
    }, 15000);
  });

  describe('Complete Ingestion Pipeline', () => {
    it('should ingest minimum required articles', async () => {
      const result = await testIngestion(20); // Test with 20 articles minimum
      
      expect(result.totalArticles).toBeGreaterThanOrEqual(20);
      expect(result.sources).toBeGreaterThan(0);
      expect(result.errors).toBeLessThan(result.totalArticles * 0.5);
    }, 60000); // 60 second timeout

    it('should handle source failures gracefully', async () => {
      // Simulate with a source that will fail
      const badSource = {
        name: 'bad-source',
        rss: 'https://invalid-url-that-does-not-exist.com/rss',
        selector: 'article',
        enabled: true
      };
      
      const result = await ingestFromSource(badSource, 10);
      
      expect(result.success).toBe(false);
      expect(result.articles).toEqual([]);
      expect(result.error).toBeDefined();
    }, 10000);

    it('should deduplicate similar articles', async () => {
      const result = await ingestDailyNews();
      
      // Check for duplicates by comparing titles
      const titles = result.articles.map(a => a.title);
      const uniqueTitles = new Set(titles);
      
      // Should have mostly unique titles (allow 10% similarity)
      expect(uniqueTitles.size).toBeGreaterThan(titles.length * 0.9);
    }, 60000);

    it('should respect rate limiting', async () => {
      const startTime = Date.now();
      const result = await ingestDailyNews();
      const duration = Date.now() - startTime;
      
      // Should have delays between requests (duration > article count * 100ms)
      const expectedMinDuration = Math.min(result.articles.length * 100, 5000);
      expect(duration).toBeGreaterThan(expectedMinDuration);
    }, 60000);

    it('should extract metadata from articles', async () => {
      const result = await testIngestion(5);
      
      const articlesWithMetadata = result.articles.filter(a => 
        a.metadata && Object.keys(a.metadata).length > 0
      );
      
      // At least 60% should have metadata
      expect(articlesWithMetadata.length).toBeGreaterThan(result.articles.length * 0.6);
      
      // Check metadata structure
      if (articlesWithMetadata.length > 0) {
        const metadata = articlesWithMetadata[0].metadata;
        expect(metadata).toHaveProperty('extractedAt');
      }
    }, 30000);
  });
});

// Export for use in other tests
export { sources };