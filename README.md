# Superwire 🎙️

> AI-powered news podcast generator that creates dynamic audio episodes from current headlines

Superwire is an automated news podcast system that combines AI content generation with text-to-speech synthesis to produce daily news episodes. It fetches current headlines, generates engaging scripts with distinct host personalities, and produces high-quality audio podcasts ready for distribution.

## 🌟 Features

- **Automated Daily Generation**: Fully automated pipeline from news ingestion to audio production
- **Multiple Content Formats**: Articles, op-eds, podcasts, video scripts, and more
- **AI Host Personalities**: Three distinct hosts (Adam, Dallas, Jordan) with unique perspectives
- **Cost-Optimized**: Uses OpenAI TTS (12x cheaper than ElevenLabs) with intelligent model routing
- **Editorial DNA System**: Sophisticated content filtering based on importance and relevance
- **Production-Ready Audio**: Professional audio processing with crossfades and normalization

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Next.js 13+ (App Router), React 18, TypeScript, Tailwind CSS
- **AI Services**: 
  - OpenRouter (GPT-4, Claude, Gemini) for content generation
  - OpenAI TTS for voice synthesis (primary)
  - ElevenLabs TTS (fallback option)
- **Storage**: Vercel Blob Storage (CDN-backed audio hosting)
- **Database**: Convex (episode metadata and content storage)
- **Audio Processing**: FFmpeg for stitching and audio enhancement
- **Deployment**: Vercel with Edge Functions

### System Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  News APIs  │────▶│   Ingestion  │────▶│  Editorial  │
└─────────────┘     └──────────────┘     │    Filter   │
                                          └─────────────┘
                                                 │
                                                 ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Vercel Blob │◀────│     Audio    │◀────│     AI      │
│   Storage   │     │  Processing  │     │ Generation  │
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   Frontend   │
                    │   (Next.js)  │
                    └──────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js 22+ and Yarn
- FFmpeg installed locally (for audio processing)
- API keys for required services (see Environment Setup)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/superwire.git
   cd superwire
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure required API keys in `.env.local`**
   ```env
   # Required API Keys
   OPENROUTER_API_KEY=sk-or-v1-xxx        # AI content generation
   OPENAI_API_KEY=sk-proj-xxx             # Text-to-speech
   NEWS_API_KEY=xxx                       # News ingestion
   BLOB_READ_WRITE_TOKEN=vercel_blob_xxx  # Storage
   
   # Convex Database
   CONVEX_DEPLOYMENT=prod:xxx
   NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
   ```

5. **Set up Convex database**
   ```bash
   npx convex dev
   # Follow the interactive setup
   # Update .env.local with provided URLs
   ```

6. **Run development server**
   ```bash
   yarn dev
   ```

7. **Access the application**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
superwire/
├── app/                    # Next.js 13+ App Router
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   └── page.tsx          # Main application page
├── pages/
│   └── api/              # API routes
│       └── episodes.ts   # Episode generation endpoint
├── src/
│   └── lib/              # Core business logic
│       ├── ingestion.ts  # News fetching
│       ├── generation.ts # AI content generation
│       ├── openrouter.ts # AI service integration
│       ├── openai-tts.ts # Voice synthesis
│       └── vercel-blob.ts # Storage operations
├── config/               # YAML configuration files
│   ├── editorial.yaml   # Editorial DNA settings
│   ├── hosts.yaml      # Host personalities
│   └── sources.yaml    # News sources
├── tests/               # Jest test suites
└── scripts/            # Utility scripts
```

## 🎯 Key Features Explained

### Editorial DNA System
The system uses sophisticated filtering to select newsworthy content based on:
- Importance scoring (breaking news, major events)
- Topic relevance (politics, technology, culture)
- Geographic significance (local vs global impact)
- Temporal relevance (trending topics)

### Host Personalities
Three AI hosts with distinct perspectives:
- **Adam**: Analytical, focuses on facts and data
- **Dallas**: Empathetic, emphasizes human impact
- **Jordan**: Energetic, covers culture and social issues

### Cost Optimization
- Uses OpenAI TTS ($15/1M chars) vs ElevenLabs ($165/1M chars)
- Intelligent model routing via OpenRouter
- Daily budget limit of $6 with automatic cutoffs
- Comprehensive cost tracking and reporting

## 🧪 Testing

Run the test suite:
```bash
yarn test                # Run all tests
yarn test:watch         # Watch mode
yarn test:coverage      # Coverage report
```

Test files include:
- `tests/ingestion.test.ts` - News fetching validation
- `tests/generation.test.ts` - Content generation tests
- `tests/costs.test.ts` - Cost calculation verification
- `tests/editorial.test.ts` - Editorial filtering tests
- `tests/storage.test.ts` - Vercel Blob operations

## 📊 Daily Operations

### Manual Episode Generation
```bash
# Generate a test episode
yarn tsx scripts/test-episode-tts.ts

# Run full pipeline
curl -X POST http://localhost:3000/api/episodes
```

### Monitoring
- Cost tracking: Check `costs.json` for daily spending
- Episode history: View generated episodes in Vercel Blob dashboard
- Error logs: Monitor Vercel Functions logs for issues

## 🚢 Deployment

### Deploy to Vercel
1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

### Production Checklist
- [ ] All environment variables configured
- [ ] Vercel Blob storage connected
- [ ] Convex database initialized
- [ ] Cost alerts configured
- [ ] Error tracking enabled

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT and TTS APIs
- News API for headline aggregation
- Vercel for hosting and blob storage
- Convex for real-time database
- The open-source community

## 📞 Support

For issues and questions:
- Open an issue on [GitHub](https://github.com/yourusername/superwire/issues)
- Check existing issues for solutions
- Review the [OPERATIONS.md](OPERATIONS.md) for troubleshooting

---

Built with ❤️ by the Superwire team