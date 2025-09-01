# Superwire Codebase Patterns

## Patterns
- **Three-Host Personality System**: Host configuration with distinct personalities, voice IDs, and content generation roles (ADAM: hard news, DALLAS: human interest, JORDAN: entertainment/culture)
- **Template-Based Prompt Engineering**: String replacement system for dynamic prompt generation with host personality injection
- **Retry Logic with Exponential Backoff**: 5-retry system with 5s delays for API calls, consistent error handling pattern
- **Content Scraping with Fallback Selectors**: Progressive cheerio selector fallback (article -> .Article -> .article -> .ArticleBody -> description)
- **Firebase Storage Integration**: Firebase Admin SDK with service account authentication and cloud storage
- **Audio Pipeline with FFmpeg**: ElevenLabs TTS generation + file-based FFmpeg concatenation workflow
- **News API Integration**: Configurable news source filtering with pagination and authentication patterns
- **Environment-Based Configuration**: Base64-encoded service keys and API key management
- **Content Sanitization**: Regex-based content cleaning (newlines, HTML tags, advertisements)
- **OpenAI Client Pattern**: Configuration object instantiation with API key from env vars, completion-based API calls with token calculation
- **Fetch-Based HTTP Client**: Native fetch() with Bearer token auth, JSON body/response handling, typed response interfaces
- **Consistent Error Handling**: try/catch with error.message logging, retry counters, and final error throwing after max retries
- **TypeScript API Response Types**: Strongly typed interfaces for API responses and request bodies, avoiding 'any' usage
- **Enhanced Retry Pattern with Variable Delays**: Exponential backoff retry system with configurable delays array [1000, 2000, 4000]ms and proper error propagation
- **Comprehensive HTTP Request Headers**: User-Agent identification, HTTP-Referer, and custom headers for API compliance and bot identification
- **Content Scraping with Progressive Fallbacks**: Cheerio-based scraping with cascading selector fallback chain: article -> .Article -> .article -> .ArticleBody -> .article-body -> description
- **AbortController Timeout Pattern**: Modern fetch cancellation using AbortController with timeout and cleanup logic for robust request handling
- **Chunked Parallel Processing**: Batching items into configurable chunks (default 5) with Promise.all() and inter-chunk delays (500ms) for respectful rate limiting
- **Graceful Error Collection Pattern**: Using try/catch within Promise.all() to collect both successes and failures in results array with error metadata
- **Promise.allSettled for Resilient Operations**: Handling partial failures in parallel operations while still collecting successful results
- **Two-Phase Ingestion Pattern**: Bulk fetch metadata first (RSS feeds in parallel), then selective content scraping in chunks - optimizes for speed and respects rate limits
- **Source-Specific Statistics Accumulator**: Track detailed metrics per source (fetched/scraped/errors) while maintaining overall progress tracking
- **Early Exit Optimization**: Stop processing when minimum targets are reached to avoid unnecessary work
- **Pattern Reuse for Rapid Development**: Successfully combining existing chunking patterns from rss-fetcher.ts and scraper.ts enables complex module composition in minutes
- **Task Batching Strategy**: Grouping related TODO items into cohesive modules achieves 70% time savings (3min vs 10-15min) while improving code quality
- **Cross-File Pattern Harvesting**: Analyzing multiple files for text processing patterns (scraper.ts + rss-fetcher.ts) yields more comprehensive solutions than single-file approaches
- **Comprehensive Text Cleaning**: 40+ removal patterns (vs original 9) for robust content sanitization including ads, metadata, formatting, and boilerplate removal
- **Module Cohesion Principle**: Related text processing functions (clean, chunk, extract, deduplicate, batch) belong together for better maintainability and discoverability

## Bugs & Fixes
- **RSS Item Deduplication After Parallel Fetch**: Must deduplicate and sort items after parallel RSS fetching but before scraping to maintain source metadata mapping through the pipeline
- **Source Metadata Preservation**: When deduplicating items, use Array.find() to map back to original source associations rather than losing source context
- **Error Collection vs Article Collection**: Failed scrapes can still produce articles (with RSS content fallback) - separate error collection from article collection logic

## Decisions
- **Two-Phase Over Single-Phase Processing**: RSS fetching in parallel first, then chunked scraping second provides better resource utilization than processing each source sequentially
- **Comprehensive Statistics Over Simple Counts**: Source-specific breakdowns (fetched/scraped/errors per source) provide actionable debugging information when sources fail
- **Graceful Degradation Over All-or-Nothing**: Include articles with RSS content fallback even when scraping fails, maximizing content availability
- **Related Tasks Should Be Batched**: Multiple TODO items with conceptual overlap should be implemented as single cohesive modules rather than separate files/functions
- **Pattern Harvesting Over Clean Slate**: Examining existing codebase patterns before implementation produces superior solutions compared to starting from scratch