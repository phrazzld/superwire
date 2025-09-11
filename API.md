# API Documentation - Superwire Endpoints

## Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://superwire-knzom9ptl-moomooskycow.vercel.app`

## Authentication
Most endpoints require Bearer token authentication using the `CRON_SECRET` environment variable.

```bash
Authorization: Bearer YOUR_CRON_SECRET
```

## Endpoints Overview

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/stats` | GET | No | System statistics and cost tracking |
| `/api/rss` | GET | No | RSS feed of episodes |
| `/api/feed.json` | GET | No | JSON feed of episodes |
| `/api/episodes` | GET/POST | No/Yes | List episodes or generate new |
| `/api/cron/generate` | POST/GET | Yes | Daily generation trigger |
| `/api/content/[date]` | GET | No | Get content for specific date |
| `/api/articles/[id]/first-paragraph` | GET | No | Get article intro |
| `/api/articles/[id]/remaining-content` | GET | No | Get article body |

---

## 📊 Statistics & Monitoring

### GET /api/stats
Returns comprehensive statistics about generation, costs, and system health.

**Response:**
```json
{
  "daily": {
    "today": {
      "ai_costs": 1.85,
      "audio_costs": 0.25,
      "total_costs": 2.10,
      "articles_generated": 5,
      "op_eds_generated": 2,
      "briefs_generated": 1,
      "generation_status": "completed",
      "last_generation": "2025-09-11T06:00:00Z"
    },
    "yesterday": {
      "ai_costs": 1.90,
      "audio_costs": 0.20,
      "total_costs": 2.10,
      "articles_generated": 5
    }
  },
  "weekly": {
    "total_costs": 14.70,
    "average_daily_cost": 2.10,
    "total_articles": 35,
    "total_op_eds": 14,
    "success_rate": 95.5
  },
  "models": {
    "openai/gpt-5": { "requests": 10, "cost": 0.50 },
    "google/gemini-2.5-flash": { "requests": 20, "cost": 0.30 }
  },
  "budget": {
    "daily_limit": 6.00,
    "used_today": 2.10,
    "remaining": 3.90,
    "percentage_used": 35
  }
}
```

**Usage Example:**
```bash
curl https://superwire.vercel.app/api/stats
```

---

## 📰 Content Feeds

### GET /api/rss
Returns RSS 2.0 feed of podcast episodes.

**Response:** XML RSS feed
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Superwire</title>
    <description>AI-powered news podcast</description>
    <link>https://superwire.vercel.app</link>
    <item>
      <title>Episode - September 11, 2025</title>
      <description>Daily news briefing</description>
      <enclosure url="https://storage.url/episode.mp3" type="audio/mpeg"/>
      <pubDate>Wed, 11 Sep 2025 06:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
```

**Usage Example:**
```bash
curl https://superwire.vercel.app/api/rss
```

### GET /api/feed.json
Returns JSON feed of episodes with metadata.

**Response:**
```json
{
  "version": "https://jsonfeed.org/version/1",
  "title": "Superwire",
  "home_page_url": "https://superwire.vercel.app",
  "feed_url": "https://superwire.vercel.app/api/feed.json",
  "description": "AI-powered news podcast",
  "items": [
    {
      "id": "2025-09-11",
      "url": "https://superwire.vercel.app/episodes/2025-09-11",
      "title": "Episode - September 11, 2025",
      "content_text": "Daily news briefing covering technology, climate, and society",
      "date_published": "2025-09-11T06:00:00Z",
      "attachments": [
        {
          "url": "https://storage.url/episode-2025-09-11.mp3",
          "mime_type": "audio/mpeg",
          "duration_in_seconds": 1200
        }
      ]
    }
  ]
}
```

**Usage Example:**
```bash
curl https://superwire.vercel.app/api/feed.json
```

---

## 🎙️ Episode Management

### GET /api/episodes
Lists all generated episodes.

**Response:**
```json
{
  "episodes": [
    {
      "id": "episode-2025-09-11T060000Z",
      "date": "2025-09-11",
      "title": "Daily Briefing - September 11",
      "duration": 1200,
      "audioUrl": "https://storage.url/episode.mp3",
      "transcript": "Full episode transcript...",
      "topics": ["AI", "Climate", "Technology"],
      "hosts": ["Adam", "Dallas", "Jordan"]
    }
  ],
  "count": 30,
  "nextPage": null
}
```

### POST /api/episodes
Manually trigger episode generation (development only).

**Request Body:**
```json
{
  "date": "2025-09-11",
  "includeOpEds": true,
  "includeBrief": true,
  "generateAudio": true
}
```

**Response:**
```json
{
  "success": true,
  "episodeId": "episode-2025-09-11T060000Z",
  "audioUrl": "https://storage.url/episode.mp3",
  "duration": 1200,
  "costs": {
    "ai": 1.85,
    "audio": 0.25,
    "total": 2.10
  }
}
```

---

## 🤖 Generation Pipeline

### POST /api/cron/generate
Triggers the complete daily content generation pipeline.

**Authentication Required:** Yes (Bearer token)

**Request Headers:**
```
Authorization: Bearer YOUR_CRON_SECRET
Content-Type: application/json
```

**Request Body (optional):**
```json
{
  "force": false,
  "steps": {
    "newsIngestion": true,
    "articleGeneration": true,
    "opEdGeneration": true,
    "briefGeneration": true,
    "audioGeneration": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-09-11T06:00:00Z",
  "duration": 90,
  "steps": {
    "newsIngestion": {
      "success": true,
      "articlesCount": 40,
      "duration": 15
    },
    "contentGeneration": {
      "success": true,
      "articlesGenerated": 5,
      "opEdsGenerated": 2,
      "briefGenerated": true,
      "duration": 45
    },
    "costs": {
      "aiCosts": 1.85,
      "audioCosts": 0.25,
      "totalCosts": 2.10
    }
  }
}
```

### GET /api/cron/generate
Check generation status without triggering.

**Authentication Required:** Yes

**Response:**
```json
{
  "isRunning": false,
  "lastRun": "2025-09-11T06:00:00Z",
  "currentStep": null,
  "progress": 100
}
```

**Usage Example:**
```bash
# Trigger generation
curl -X POST https://superwire.vercel.app/api/cron/generate \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Check status
curl https://superwire.vercel.app/api/cron/generate \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 📄 Article Content

### GET /api/content/[date]
Get all content for a specific date.

**Parameters:**
- `date`: ISO date format (YYYY-MM-DD)

**Response:**
```json
{
  "date": "2025-09-11",
  "articles": [
    {
      "id": "article-001",
      "title": "Breaking: AI Advancement",
      "content": "Full article text...",
      "author": "Adam",
      "category": "Technology",
      "importance": 8.5
    }
  ],
  "opEds": [
    {
      "id": "oped-001",
      "title": "The Future of Climate Tech",
      "content": "Opinion piece text...",
      "author": "Dallas",
      "perspective": "optimistic"
    }
  ],
  "brief": {
    "summary": "Today's top stories...",
    "bulletPoints": ["Story 1", "Story 2", "Story 3"]
  }
}
```

### GET /api/articles/[id]/first-paragraph
Get article introduction for progressive loading.

**Parameters:**
- `id`: Article ID

**Response:**
```json
{
  "id": "article-001",
  "title": "Breaking: AI Advancement",
  "firstParagraph": "In a groundbreaking development today...",
  "wordCount": 150
}
```

### GET /api/articles/[id]/remaining-content
Get remaining article content.

**Response:**
```json
{
  "id": "article-001",
  "remainingContent": "The rest of the article content...",
  "metadata": {
    "readTime": 5,
    "wordCount": 650,
    "images": []
  }
}
```

---

## 🧪 Testing Endpoints

### GET /api/test-conclusion
Test content conclusion generation (development only).

**Response:**
```json
{
  "success": true,
  "conclusion": "Generated conclusion text...",
  "model": "gpt-5",
  "tokens": 150,
  "cost": 0.001
}
```

---

## Error Responses

All endpoints follow consistent error response format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    }
  },
  "status": 400
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `RATE_LIMITED` | 429 | Too many requests |
| `BUDGET_EXCEEDED` | 402 | Daily cost limit reached |
| `GENERATION_FAILED` | 500 | Pipeline error |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_REQUEST` | 400 | Malformed request |

---

## Rate Limiting

- **Public endpoints**: 100 requests/minute
- **Authenticated endpoints**: 10 requests/minute
- **Generation endpoint**: 1 request/hour

Headers returned:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1694419200
```

---

## Webhooks

Configure webhooks for generation events:

```json
{
  "url": "https://your-domain.com/webhook",
  "events": ["generation.started", "generation.completed", "generation.failed"],
  "secret": "webhook_secret_key"
}
```

### Event Payloads

**generation.completed**
```json
{
  "event": "generation.completed",
  "timestamp": "2025-09-11T06:15:00Z",
  "data": {
    "episodeId": "episode-2025-09-11",
    "audioUrl": "https://storage.url/episode.mp3",
    "articles": 5,
    "costs": 2.10
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { SuperwireAPI } from '@superwire/sdk';

const api = new SuperwireAPI({
  baseUrl: 'https://superwire.vercel.app',
  apiKey: process.env.CRON_SECRET
});

// Get stats
const stats = await api.getStats();

// Trigger generation
const result = await api.triggerGeneration({
  force: false
});

// Get episodes
const episodes = await api.getEpisodes();
```

### Python
```python
import requests

BASE_URL = "https://superwire.vercel.app"
headers = {"Authorization": f"Bearer {API_KEY}"}

# Get stats
response = requests.get(f"{BASE_URL}/api/stats")
stats = response.json()

# Trigger generation
response = requests.post(
    f"{BASE_URL}/api/cron/generate",
    headers=headers
)
result = response.json()
```

### cURL
```bash
# Get stats
curl https://superwire.vercel.app/api/stats

# Trigger generation
curl -X POST https://superwire.vercel.app/api/cron/generate \
  -H "Authorization: Bearer $CRON_SECRET"

# Get RSS feed
curl https://superwire.vercel.app/api/rss
```

---

## Best Practices

1. **Cache responses** where appropriate (RSS/JSON feeds cache for 5 minutes)
2. **Use conditional requests** with ETags when available
3. **Implement exponential backoff** for retries
4. **Monitor rate limit headers** to avoid throttling
5. **Subscribe to webhooks** instead of polling for updates

---

## Changelog

### v2.0.0 (2025-09-11)
- Migrated from ElevenLabs to OpenAI TTS
- Updated to GPT-5 and Gemini 2.5 models
- Switched from Firebase to Vercel Blob storage
- Improved cost efficiency (65% reduction)

### v1.0.0 (2024-08-01)
- Initial API release
- Basic generation pipeline
- RSS and JSON feeds

---

*Last Updated: 2025-09-11*
*API Version: 2.0.0*