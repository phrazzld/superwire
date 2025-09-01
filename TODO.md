# TODO.md - Superwire Revival Engineering Tasks

## Phase 0: Critical Path Setup (Day 1)
*Get the minimum viable pipeline running. Everything else is secondary.*

### OpenRouter Integration
- [x] Create `src/lib/openrouter.ts` with typed client wrapper using `fetch()` not SDK - include retry logic with exponential backoff (max 3 retries, 1s/2s/4s delays)
- [x] Add OpenRouter API key to `.env.local` as `OPENROUTER_API_KEY` and verify connection with test prompt to `openai/gpt-3.5-turbo`
  ```
  Work Log:
  - Created .env.local and .env.example with all necessary environment variables
  - Built verification script at scripts/verify-openrouter.ts
  - Test succeeded - connection to OpenRouter verified with gpt-3.5-turbo
  - Generated 100-word news summary in 2.5 seconds for $0.000225
  ```
- [x] Implement `modelRouter()` function in `src/lib/openrouter.ts` that maps task types to specific models: `{classification: 'google/gemini-2.0-flash-thinking-exp:free', summary: 'anthropic/claude-3.5-sonnet', creative: 'openai/gpt-4o'}`
  ```
  Work Log:
  - Added TaskType enum with 12 different task categories
  - Created MODEL_ROUTER mapping tasks to optimal models
  - Implemented modelRouter() function with override support
  - Added completeTask() method to client for task-based routing
  - Created test script verifying all routing logic
  - Corrected invalid model IDs to use valid OpenRouter models
  - Added MODEL_CAPABILITIES for model comparison
  ```
- [x] Write cost tracking function `trackTokenUsage()` that logs model, input tokens, output tokens, and calculated cost to `costs.json` after each API call
  ```
  Work Log:
  - Created trackTokenUsage() function with comprehensive cost tracking
  - Added CostEntry and CostTracking interfaces for type safety
  - Integrated automatic tracking into createChatCompletion() method
  - Enhanced completeTask() to track costs with task type context
  - Added getCostSummary() for reading cost analytics
  - Tracks daily totals, model totals, and grand total
  - Warns when daily spend exceeds $5
  - Created test script verifying all functionality
  - Added costs.json to .gitignore
  ```
- [ ] Create simple test script `scripts/test-openrouter.ts` that generates a 100-word news summary and validates response structure

### Convex Database Setup
- [ ] Initialize Convex in project root with `npx convex dev` and select "Create new project" option
- [ ] Create `convex/schema.ts` defining tables: `episodes` (date, audioUrl, transcript, stories[], costs{}), `articles` (date, headline, content, sources[], model, costs), `rawContent` (date, source, url, content, processed)
- [ ] Write `convex/functions.ts` with mutations: `storeEpisode()`, `storeArticle()`, `storeRawContent()` - each returning the created document ID
- [ ] Add Convex environment variables from dashboard to `.env.local`: `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`
- [ ] Test Convex connection with script that writes and reads a test article using `ConvexHttpClient`

## Phase 1: News Ingestion Pipeline (Day 2-3)
*Get raw news into the system. Don't worry about quality yet.*

### News Source Configuration
- [ ] Create `config/sources.yaml` with initial sources: `[{name: 'reuters', rss: 'https://www.reuters.com/rssfeed/topNews', selector: 'article.article-body'}, {name: 'ap', rss: 'https://apnews.com/rss', selector: '.RichTextStoryBody'}]`
- [ ] Write `src/lib/sources.ts` to parse YAML config using `js-yaml` package and export typed `NewsSource[]` array
- [ ] Implement `src/lib/rss-fetcher.ts` with `fetchRSS(url: string)` using `rss-parser` package, returning `{title, link, pubDate, content}[]`
- [ ] Create `src/lib/scraper.ts` with `scrapeArticle(url: string, selector: string)` using `cheerio` to extract article text, handling common failure cases (paywalls, missing selectors)
- [ ] Build `src/lib/ingestion.ts` with `ingestDailyNews()` that fetches all sources in parallel using `Promise.all()`, targeting 100 articles minimum

### Content Processing
- [ ] Write `cleanText(html: string)` in `src/lib/text-utils.ts` to strip HTML, remove ads, normalize whitespace, remove "ADVERTISEMENT" and similar patterns
- [ ] Implement `chunkArticle(text: string, maxTokens: number = 2000)` that splits long articles into processable chunks with overlap
- [ ] Create `extractMetadata(article: string)` using regex to find dates, quoted sources, numerical data, returning structured metadata object
- [ ] Build `deduplicateArticles(articles: Article[])` using simple similarity check (Jaccard index > 0.8 on first 200 chars)
- [ ] Add `batchArticles(articles: Article[], batchSize: number = 10)` for efficient API processing

## Phase 2: Editorial DNA Implementation (Day 4-5)
*Make it YOUR news organization, not just another aggregator.*

### Editorial Configuration
- [ ] Create `config/editorial.yaml` with values, priorities (0-10 scale), perspectives to seek/avoid based on TASK.md specification
- [ ] Implement `src/lib/editorial.ts` with `loadEditorialDNA()` parsing YAML into typed configuration object
- [ ] Write `calculateStoryImportance(story, editorialDNA)` implementing the scoring algorithm from TASK.md (value alignment * 3, topic relevance * 2.5, etc.)
- [ ] Create `applyEditorialFilter(stories, editorialDNA)` that scores, filters, and ranks stories by importance score
- [ ] Build `injectEditorialAngle(story, editorialDNA)` that adds perspective framing based on editorial values

### Host Personality System
- [ ] Migrate existing host configs from `constants.ts` to `config/hosts.yaml` with expanded personality traits
- [ ] Implement `selectHostForStory(story, hosts)` that matches story type to appropriate host personality
- [ ] Write `generateHostDialogue(story, host1, host2)` prompt that creates back-and-forth discussion between hosts
- [ ] Create `maintainHostConsistency(text, host)` that validates generated text matches host personality traits
- [ ] Add `rotateHosts(stories, hosts)` to ensure balanced host participation across episode

## Phase 3: Content Generation Pipeline (Day 6-8)
*Transform filtered news into actual content. Start with cheapest format first.*

### Article Generation (Cheapest - $0.10/day)
- [ ] Create `src/generators/article.ts` with `generateArticle(story, editorialDNA)` using Gemini-2.5-flash for cost efficiency
- [ ] Write article prompt template in `prompts/article.txt` with placeholders for facts, angle, and target length (500-800 words)
- [ ] Implement `validateArticle(text)` checking minimum length, no placeholder text, coherent structure
- [ ] Add `enhanceWithContext(article, relatedStories)` that adds "Related:" section with 2-3 connected stories
- [ ] Store generated articles in Convex with `await ctx.db.insert('articles', {...})` including generation costs

### Op-Ed Generation ($0.50/day)
- [ ] Create `src/generators/oped.ts` with `generateOpEd(stories, host, editorialDNA)` using GPT-4o for creative synthesis
- [ ] Design op-ed prompt in `prompts/oped.txt` emphasizing strong thesis, supporting arguments, call-to-action
- [ ] Implement `selectOpEdTopics(stories, limit=2)` choosing most controversial/important topics for op-eds
- [ ] Write `validateOpEd(text)` ensuring clear position, supporting evidence, conclusion
- [ ] Add cost tracking specifically for op-eds given higher model costs

### Daily Brief Generation ($0.05/day)
- [ ] Create `src/generators/brief.ts` with `generateDailyBrief(allContent)` summarizing the day's coverage
- [ ] Implement `extractKeyPoints(content)` pulling 3-5 bullet points per major story
- [ ] Write `generateExecutiveSummary(stories, maxLength=200)` for brief opener
- [ ] Add `formatBrief(summary, bulletPoints, quickTakes)` creating structured brief output
- [ ] Ensure brief stays under 500 words total for quick consumption

### Podcast Script Generation ($1/day for script only)
- [ ] Refactor existing `writeIntroduction()` to use GPT-4o via OpenRouter instead of deprecated OpenAI v3
- [ ] Update `writeSegment()` to generate richer narratives with historical context and predictions
- [ ] Implement `generateTransitions(segment1, segment2)` for smooth flow between stories
- [ ] Create `generateDiscussion(story, hosts)` for multi-host dialogue on complex topics
- [ ] Add `scriptTiming(text)` to estimate speaking duration (150 words per minute average)

## Phase 4: Audio Production Pipeline (Day 9-10)
*Only if podcast is being generated that day. This is the expensive part.*

### ElevenLabs Integration
- [ ] Update `src/lib/elevenlabs.ts` to use latest API endpoint and optimal voice settings
- [ ] Implement `generateAudioSegment(text, voiceId, stability=0.75, similarity=0.85)` with proper error handling
- [ ] Create `estimateAudioCost(text)` calculating cost before generation (character count * $0.00018)
- [ ] Add `validateAudio(buffer)` checking for minimum duration, proper format, no corruption
- [ ] Implement audio caching in `tmp/audio_cache/` for intro/outro reuse

### Audio Processing
- [ ] Update FFmpeg concatenation to use filter_complex for better quality: `ffmpeg -filter_complex "concat=n=X:v=0:a=1"`
- [ ] Implement `normalizeAudio(file)` using FFmpeg loudness normalization to -16 LUFS podcast standard
- [ ] Create `addTransitions(segments)` with 500ms crossfades between segments
- [ ] Write `compressAudio(file)` reducing file size while maintaining quality (128kbps MP3)
- [ ] Add `uploadToStorage(file)` for Convex file storage or external CDN

## Phase 5: Automation & Orchestration (Day 11-12)
*Make it run itself every day without intervention.*

### Cron Job Setup
- [ ] Create `src/app/api/cron/generate/route.ts` API endpoint that triggers daily generation
- [ ] Implement `verifyBearerToken(request)` to secure cron endpoint with secret token
- [ ] Add Vercel cron configuration in `vercel.json`: `{"crons": [{"path": "/api/cron/generate", "schedule": "0 6 * * *"}]}`
- [ ] Write `src/orchestrator.ts` with `runDailyGeneration()` coordinating all content generation in correct order
- [ ] Implement `checkGenerationStatus()` that prevents duplicate runs if already processing

### Error Handling & Monitoring
- [ ] Create `src/lib/error-handler.ts` with `withRetry(fn, maxAttempts=3, backoff=exponential)` wrapper for all external calls
- [ ] Implement `notifyFailure(error, context)` sending email via SendGrid or Discord webhook with error details
- [ ] Add `logGenerationMetrics(results)` tracking success/failure, duration, costs for each content type
- [ ] Create `src/lib/monitor.ts` with `checkCostThreshold(dailyTotal, limit=6.0)` alerting at 80% budget
- [ ] Write `generateFallbackContent()` creating minimal brief if main generation fails

### State Management
- [ ] Implement `src/lib/generation-state.ts` tracking current generation progress in Convex
- [ ] Add `isGenerating()` check preventing concurrent generation runs
- [ ] Create `resumeGeneration(fromStep)` allowing restart from failure point
- [ ] Write `cleanupIncomplete()` removing partial content from failed generations
- [ ] Implement `markGenerationComplete(date, stats)` with full metrics logging

## Phase 6: Frontend & Delivery (Day 13-14)
*Make the content accessible and beautiful.*

### Web Interface
- [ ] Create `src/app/page.tsx` with clean, minimal design showing today's content
- [ ] Implement `AudioPlayer` component with play/pause, progress bar, speed control
- [ ] Build `ArticleCard` component displaying headline, summary, read time
- [ ] Create `ContentTabs` for switching between Podcast, Articles, Op-Eds, Brief
- [ ] Add `CalendarView` component for browsing historical content by date

### Content API
- [ ] Create `src/app/api/content/[date]/route.ts` returning all content for specific date
- [ ] Implement `src/app/api/feed/rss/route.ts` generating RSS feed for podcast subscriptions
- [ ] Add `src/app/api/feed/json/route.ts` for JSON feed format support
- [ ] Create `src/app/api/stats/route.ts` returning generation metrics and costs
- [ ] Implement caching headers for all API routes (1 hour for current day, indefinite for past)

### Performance Optimization
- [ ] Implement static generation for previous days' content using `generateStaticParams()`
- [ ] Add `next/dynamic` imports for AudioPlayer to reduce initial bundle size
- [ ] Create `src/lib/cdn.ts` for serving audio files through Cloudflare CDN
- [ ] Implement progressive loading for article content (first paragraph immediately, rest on demand)
- [ ] Add service worker for offline access to recent content

## Phase 7: Testing & Quality Assurance (Day 15)
*Ensure it works reliably before going live.*

### Integration Tests
- [ ] Write `tests/ingestion.test.ts` validating news fetching from all configured sources
- [ ] Create `tests/generation.test.ts` checking each content type generates successfully
- [ ] Implement `tests/costs.test.ts` verifying cost calculations match expected ranges
- [ ] Add `tests/editorial.test.ts` confirming editorial DNA properly filters and ranks content
- [ ] Write `tests/convex.test.ts` validating all database operations

### Quality Checks
- [ ] Implement `src/lib/quality.ts` with `checkContentQuality(text)` for grammar, readability, factual claims
- [ ] Create `validateEditorialConsistency(content[])` ensuring tone matches across all formats
- [ ] Add `detectHallucinations(text, sources)` comparing generated content against source material
- [ ] Write `checkHostVoiceConsistency(transcript, host)` validating personality traits
- [ ] Implement automated daily quality report emailed after generation

### Performance Benchmarks
- [ ] Measure and log ingestion time for 500 articles (target: <5 minutes)
- [ ] Track content generation time per format (target: <2 minutes each)
- [ ] Monitor API response times (target: p95 <1 second)
- [ ] Check memory usage during generation (target: <512MB)
- [ ] Validate total daily cost stays under $6 threshold

## Phase 8: Launch Preparation (Day 16)
*Final checks before going live.*

### Deployment
- [ ] Set all production environment variables in Vercel dashboard
- [ ] Configure custom domain (superwire.news) with SSL certificate
- [ ] Set up Cloudflare CDN for static assets and audio files
- [ ] Enable Vercel Analytics for user tracking
- [ ] Configure error tracking with Sentry or similar service

### Documentation
- [ ] Update README.md with setup instructions and architecture overview
- [ ] Create OPERATIONS.md documenting daily generation process and troubleshooting
- [ ] Write EDITORIAL.md explaining how to modify editorial DNA and host personalities
- [ ] Add COSTS.md tracking daily costs and optimization opportunities
- [ ] Generate API documentation for all endpoints

### Final Validation
- [ ] Run full generation pipeline end-to-end in production environment
- [ ] Verify all content types display correctly on frontend
- [ ] Test RSS feed in podcast apps (Apple Podcasts, Spotify, Overcast)
- [ ] Confirm email notifications work for failures
- [ ] Validate costs match projections within 10% margin

---

## Success Criteria
- Daily generation completes successfully 29/30 days per month
- Total daily cost remains under $6
- All content types generate within 15 minutes total
- Zero critical errors in first week of operation
- Content quality scores >8/10 on manual review

## Notes
- Each task should be completable in 1-2 hours of focused work
- Tasks are ordered to minimize dependencies and deliver value quickly
- Focus on working implementation first, optimization second
- When in doubt, choose the simpler solution