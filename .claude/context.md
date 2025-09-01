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