# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Superwire is an AI-powered news podcast generator that creates dynamic audio episodes from current news headlines. It combines OpenAI for content generation and ElevenLabs for text-to-speech synthesis, with Firebase Storage for audio hosting.

## Development Commands

```bash
# Development
yarn dev          # Start development server on localhost:3000

# Production
yarn build        # Create production build
yarn start        # Start production server

# Installation
yarn install      # Install dependencies (uses Yarn v1)
```

## Architecture Overview

### Hybrid Router Architecture
The project uses both `/pages` and `/app` directories (Next.js 13+ App Router migration in progress):
- **`/app`**: New App Router components (page.tsx is main entry point)
- **`/pages`**: Legacy Pages Router with API routes and Firebase setup
- **`/pages/api/episodes.ts`**: Core API endpoint orchestrating the entire news-to-audio pipeline

### News-to-Audio Pipeline
1. **News Fetching**: Retrieves headlines from News API (BBC, Reuters, AP)
2. **Content Extraction**: Uses Cheerio to scrape full article content
3. **AI Script Generation**: OpenAI generates intro/segments/outro with distinct host personalities
4. **Voice Synthesis**: ElevenLabs converts text to speech with different voices per host
5. **Audio Processing**: FFmpeg stitches segments into complete episodes
6. **Storage**: Firebase Storage hosts final episode files

### Host System (defined in `constants.ts`)
- **Adam**: Primary host - serious, analytical tone
- **Dallas**: Co-host - empathetic, human-interest focus  
- **Jordan**: Dynamic host - energetic, focuses on culture/human rights

## Critical Dependencies & Known Issues

### Deprecated OpenAI API
Currently using OpenAI v3.1.0 with discontinued `text-davinci-003` model. Migration to v4+ with GPT-4 or GPT-3.5-turbo is critical.

### Environment Variables Required
```bash
OPENAI_API_KEY          # OpenAI API access
NEWS_API_KEY            # News API access
ELEVEN_LABS_API_KEY     # ElevenLabs TTS
GOOGLE_SERVICE_KEY      # Base64 encoded Firebase service account
```

### Security Concern
Firebase configuration is currently exposed in client-side code (`pages/_app.tsx`). Should be moved to environment variables.

## Key Implementation Details

### Audio Generation Flow (`pages/api/episodes.ts`)
- Implements retry logic with exponential backoff for API calls
- Processes news articles in parallel batches
- Stitches audio segments with FFmpeg
- Generates unique filenames with ISO timestamps

### Client-Side Audio Player (`app/page.tsx`)
- Development-only episode generation button
- Firebase Storage URL resolution for audio playback
- Date formatting and episode listing logic

## Active TODOs in Codebase

1. Extract useEffect logic to custom hook (`app/page.tsx:11`)
2. Move date formatting to utility file (`app/page.tsx:63`)
3. Link prompt host with audio host consistency (`pages/api/episodes.ts:106`)
4. Add smooth transitions between segments (`pages/api/episodes.ts:266`)
5. Implement host rotation system (`pages/api/episodes.ts:310`)

## Development Guidelines

### When modifying the news pipeline:
- Maintain retry logic for external API calls
- Preserve host personality consistency in prompts
- Ensure proper error handling for each pipeline stage

### When working with audio:
- Audio files are stored in Firebase Storage under `/episodes/`
- File naming: `episode-[ISO-timestamp].mp3`
- FFmpeg is required for audio processing

### TypeScript conventions:
- Strict mode enabled
- Consistent casing enforced
- Avoid `any` types where possible