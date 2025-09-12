# Superwire - AI-Powered Personal Media Empire

> Transform daily news into YOUR distinctive editorial voice through AI-powered multimedia content generation

## 🚀 Overview

Superwire is a sophisticated AI-powered news platform that automatically generates a complete media publication daily - articles, op-eds, briefs, and podcasts - all filtered through YOUR unique editorial perspective. Think of it as having an entire newsroom powered by AI, with you as the editor-in-chief.

🚀 **Live Demo**: https://superwire-knzom9ptl-moomooskycow.vercel.app

⚠️ **Note**: Migrated from OpenAI v3 to OpenRouter + OpenAI TTS in Sept 2025 for 85% cost reduction

### Key Features

- **Multi-Format Content**: Automatically generates articles, op-eds, daily briefs, and audio podcasts
- **Editorial DNA System**: Configurable values, perspectives, and priorities that shape all content
- **3-Host Podcast System**: Dynamic AI personalities (Adam, Dallas, Jordan) with distinct voices
- **Cost-Optimized AI Routing**: Intelligently routes tasks to appropriate models (Gemini, GPT-4, Claude)
- **Budget Management**: Stays under $6/day with comprehensive cost tracking
- **Quality Assurance**: Built-in content validation, hallucination detection, and consistency checks

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     INGESTION LAYER                          │
│  • 500+ articles/day from Reuters, AP, BBC, Guardian, NYT    │
│  • RSS fetching → Content scraping → Deduplication           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     EDITORIAL LAYER                          │
│  • Apply editorial DNA filters and values                    │
│  • Score stories by importance (0-10 scale)                  │
│  • Filter by minimum thresholds                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    GENERATION LAYER                          │
│  • Articles: Gemini 2.0 Flash ($0.10/day)                   │
│  • Op-Eds: GPT-4o ($0.50/day)                               │
│  • Briefs: Claude 3.5 Sonnet ($0.05/day)                    │
│  • Scripts: GPT-4o ($1.00/day)                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      AUDIO LAYER                             │
│  • OpenAI TTS (85% cheaper than ElevenLabs)                  │
│  • FFmpeg audio processing and normalization                 │
│  • Vercel Blob storage with CDN                              │
└──────────────────────────────────────────────────────────────┘
```

## 🛠️ Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- FFmpeg (for audio processing)
- API Keys:
  - [OpenRouter](https://openrouter.ai/keys) - AI model access
  - [ElevenLabs](https://elevenlabs.io/) - Text-to-speech
  - [News API](https://newsapi.org/) - News sources (optional)
  - Firebase/Convex - Storage

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/superwire.git
cd superwire

# Install dependencies
yarn install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your API keys
```

### Configuration

1. **Set up API keys** in `.env.local`:
```env
OPENROUTER_API_KEY=sk-or-v1-your-key
ELEVEN_LABS_API_KEY=your-elevenlabs-key
NEWS_API_KEY=your-news-api-key
GOOGLE_SERVICE_KEY=base64-encoded-firebase-key
```

2. **Configure Editorial DNA** in `config/editorial.yaml`:
```yaml
values:
  truthSeeking: 10
  systemicThinking: 9
  humanCentered: 8
  futureOriented: 9

topic_priorities:
  technology: 9
  climate: 8
  economy: 7
  society: 8
```

3. **Customize Host Personalities** in `config/hosts.yaml`

### Running Locally

```bash
# Start development server
yarn dev

# Run tests
yarn test

# Generate content manually (development only)
curl -X POST http://localhost:3000/api/cron/generate \
  -H "Authorization: Bearer your-secret-token"

# Check generation status
curl http://localhost:3000/api/stats
```

## 📚 Content Types

### Articles (500-800 words)
- Generated using Gemini 2.0 Flash for cost efficiency
- Editorial angle injection based on story type
- Quality scoring and validation
- ~20 articles per day

### Op-Eds (1000+ words)
- GPT-4o powered for creative synthesis
- Strong host personality integration
- Thesis-driven argumentative structure
- 2 op-eds per day on controversial topics

### Daily Brief (500 words)
- Executive summary of day's coverage
- 3-5 bullet points per major story
- Quick consumption format
- Generated once daily

### Podcast Episodes (20 minutes)
- Multi-host dialogue between AI personalities
- Historical context and future predictions
- Professional audio quality (ElevenLabs + FFmpeg)
- Optional generation based on budget

## 💰 Cost Management

Daily budget target: **$6.00**

| Component | Model | Daily Cost | Usage |
|-----------|-------|------------|-------|
| Articles | Gemini 2.0 Flash | $0.10 | 20 articles |
| Op-Eds | GPT-4o | $0.50 | 2 op-eds |
| Brief | Claude 3.5 | $0.05 | 1 brief |
| Script | GPT-4o | $1.00 | 1 podcast |
| Audio | OpenAI TTS | $0.45 | 20 min audio |
| **Total** | | **$2.10** | Under budget (35% of $6) |

### Cost Optimization Features
- Task-based model routing
- Free tier usage (Gemini Flash)
- Audio caching for intros/outros
- Budget monitoring and alerts
- Automatic limiting when approaching threshold

## 🧪 Testing

```bash
# Run all tests
yarn test

# Run specific test suite
yarn test ingestion.test.ts

# Run with coverage
yarn test:coverage

# Watch mode for development
yarn test:watch
```

### Test Coverage
- **Ingestion**: RSS fetching, scraping, deduplication
- **Generation**: Articles, op-eds, briefs, scripts
- **Costs**: Tracking, budgets, thresholds
- **Editorial**: DNA application, host selection
- **Quality**: Grammar, readability, consistency

## 🚀 Deployment

### Vercel Deployment

1. Push to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Automatic Daily Generation

The system uses Vercel Cron Jobs for daily automation:

```json
{
  "crons": [{
    "path": "/api/cron/generate",
    "schedule": "0 6 * * *"
  }]
}
```

Runs daily at 6:00 AM UTC.

## 📁 Project Structure

```
superwire/
├── app/                    # Next.js App Router pages
│   ├── components/         # React components
│   └── page.tsx           # Main UI
├── pages/                  # API routes (Pages Router)
│   └── api/
│       ├── episodes.ts    # Legacy podcast generation
│       ├── content/       # Content API endpoints
│       ├── feed.json.ts   # JSON feed
│       ├── rss.ts         # RSS feed
│       └── stats.ts       # Metrics API
├── src/
│   ├── generators/        # Content generation
│   │   ├── article.ts     # Article generator
│   │   ├── oped.ts        # Op-ed generator
│   │   └── brief.ts       # Brief generator
│   └── lib/              # Core utilities
│       ├── openrouter.ts  # AI model routing
│       ├── editorial.ts   # Editorial DNA system
│       ├── hosts.ts       # Host personalities
│       ├── ingestion.ts   # News ingestion
│       └── quality.ts     # Quality checks
├── config/               # Configuration files
│   ├── editorial.yaml    # Editorial values
│   ├── hosts.yaml        # Host personalities
│   └── sources.yaml      # News sources
├── convex/              # Database schema
├── tests/               # Test suites
└── scripts/             # Utility scripts
```

## 🔧 Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

**Convex setup required**
```bash
# Interactive setup required once
npx convex dev
# Select "Create new project"
# Copy credentials to .env.local
```

**Cost overruns**
- Check `/api/stats` for detailed breakdown
- Reduce op-ed generation frequency
- Disable audio generation temporarily
- Use more free tier models

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- OpenRouter for unified AI model access
- ElevenLabs for realistic voice synthesis
- News sources for content feeds
- FFmpeg for audio processing

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/superwire/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/superwire/discussions)
- **Email**: support@superwire.news

---

Built with ❤️ by the Superwire team. Making AI-powered media accessible to everyone.