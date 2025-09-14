# OPERATIONS.md - Superwire Daily Operations Guide

## 📅 Daily Generation Process

### Automatic Schedule

The system runs automatically via Vercel Cron Jobs:
- **Time**: 6:00 AM UTC daily
- **Duration**: ~90 seconds total
- **Cost**: ~$2.10 per day (35% of $6 budget)
- **Live URL**: https://superwire-knzom9ptl-moomooskycow.vercel.app

### Generation Pipeline Stages

```mermaid
graph LR
    A[6:00 AM Start] --> B[News Ingestion]
    B --> C[Editorial Filtering]
    C --> D[Article Generation]
    D --> E[Op-Ed Generation]
    E --> F[Brief Generation]
    F --> G[Script Generation]
    G --> H[Audio Synthesis]
    H --> I[Storage Upload]
    I --> J[6:15 AM Complete]
```

### Stage Details

#### 1. News Ingestion (2-3 minutes)
```
- Fetches RSS feeds from 5 sources
- Scrapes full article content
- Targets 100+ articles
- Deduplicates similar stories
- Stores in rawContent table
```

#### 2. Editorial Filtering (30 seconds)
```
- Applies editorial DNA scoring
- Filters by importance threshold (>6.0)
- Ranks by editorial priorities
- Selects top 30-40 stories
- Adds editorial angles
```

#### 3. Article Generation (3-4 minutes)
```
- Generates 5 articles using GPT-5/Gemini 2.5
- 500-800 words each
- Batch processing (5 concurrent)
- Quality validation
- Cost: ~$0.50 total
```

#### 4. Op-Ed Generation (2-3 minutes)
```
- Selects 2 controversial topics
- Generates with GPT-5
- 1000+ words each
- Host personality integration (Adam, Dallas, Jordan)
- Cost: ~$1.00 total
```

#### 5. Brief Generation (1 minute)
```
- Synthesizes day's coverage
- 500 word executive summary
- 3-5 bullet points per story
- Uses Claude 3.5 Sonnet
- Cost: ~$0.05
```

#### 6. Script Generation (2 minutes)
```
- Creates podcast script
- Multi-host dialogue
- 20 minute target duration
- GPT-4o powered
- Cost: ~$1.00
```

#### 7. Audio Synthesis (3-4 minutes)
```
- OpenAI TTS (85% cheaper than ElevenLabs)
- 3 different host voices (Adam, Dallas, Jordan)
- FFmpeg processing
- Normalization to -16 LUFS
- Cost: ~$0.50
```

#### 8. Storage Upload (1 minute)
```
- Uploads to Vercel Blob Storage
- CDN-backed with Cloudflare fallback
- Updates episode metadata in Convex
- Generates public URLs
- Updates RSS feeds
```

## 🔍 Monitoring

### Health Checks

#### API Status Endpoint
```bash
curl https://superwire-knzom9ptl-moomooskycow.vercel.app/api/stats
```

Response shows:
- Daily costs breakdown
- Generation status
- Model usage statistics
- Error rates
- Budget warnings

#### Generation Status
```bash
curl https://superwire-knzom9ptl-moomooskycow.vercel.app/api/cron/generate \
  -H "Authorization: Bearer $CRON_SECRET"
```

Returns current generation progress or starts new generation.

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Daily Cost | <$6.00 | >$5.00 |
| Generation Time | <15 min | >20 min |
| Success Rate | >95% | <90% |
| Article Count | 20 | <15 |
| Error Rate | <2% | >5% |

### Log Locations

- **Vercel Functions**: Dashboard → Functions → Logs
- **Cost Tracking**: `costs.json` in root
- **Generation Metrics**: `generation-metrics.json`
- **Error Logs**: Vercel dashboard or custom logging service

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Generation Fails to Start

**Symptoms**: No content at expected time
**Check**:
```bash
# Verify cron job is configured
cat vercel.json | grep crons

# Check last run status
curl https://superwire-knzom9ptl-moomooskycow.vercel.app/api/stats
```

**Solutions**:
- Verify CRON_SECRET is set in Vercel
- Check Vercel cron job logs
- Manually trigger: `curl -X POST /api/cron/generate`

#### 2. Cost Overruns

**Symptoms**: Daily costs exceed $6
**Check**:
```bash
# Get detailed cost breakdown
curl https://superwire-knzom9ptl-moomooskycow.vercel.app/api/stats | jq '.models'
```

**Solutions**:
- Reduce op-ed count to 1/day
- Disable audio generation temporarily
- Switch to cheaper models in `src/lib/openrouter.ts`
- Check for retry loops in logs

#### 3. Content Quality Issues

**Symptoms**: Poor readability, inconsistent tone
**Check**:
```javascript
// Run quality checks manually
import { checkContentQuality } from './src/lib/quality';
const result = checkContentQuality(articleText);
console.log(result.metrics);
```

**Solutions**:
- Adjust editorial DNA weights
- Increase quality thresholds
- Review host personality settings
- Check source quality

#### 4. Audio Generation Failures

**Symptoms**: Missing podcast episodes
**Check**:
```bash
# Check OpenAI API status
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

**Solutions**:
- Verify OpenAI API key
- Check OpenAI API status and quota
- Ensure FFmpeg is installed
- Review audio cache directory permissions

#### 5. Database Connection Issues

**Symptoms**: Content not storing
**Check**:
```bash
# Test Convex connection
npx convex run functions:testConnection
```

**Solutions**:
- Run `npx convex dev` to reconnect
- Verify CONVEX_DEPLOYMENT in env
- Check Convex dashboard for errors
- Fall back to Firebase if needed

### Emergency Procedures

#### Manual Content Generation
```bash
# Generate articles only
curl -X POST https://superwire.news/api/generate/articles \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Generate brief only
curl -X POST https://superwire.news/api/generate/brief \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### Rollback Procedure
```bash
# Revert to previous deployment
vercel rollback

# Or specific version
vercel rollback [deployment-url]
```

#### Budget Emergency Stop
```javascript
// In src/lib/monitor.ts, adjust threshold
export const EMERGENCY_STOP_THRESHOLD = 4.0; // Lower from 6.0
```

## 📊 Performance Optimization

### Speed Improvements

1. **Parallel Processing**
```javascript
// Good - Parallel generation
const results = await Promise.all([
  generateArticle(story1),
  generateArticle(story2),
  generateArticle(story3)
]);

// Bad - Sequential
const r1 = await generateArticle(story1);
const r2 = await generateArticle(story2);
```

2. **Batch API Calls**
```javascript
// Process in batches of 5
const batches = chunk(stories, 5);
for (const batch of batches) {
  await Promise.all(batch.map(generateArticle));
}
```

3. **Cache Reusable Content**
- Intro/outro audio segments
- Common editorial angles
- Host personality templates

### Cost Optimization

1. **Model Selection**
```javascript
// Task-based routing
const MODEL_ROUTER = {
  ARTICLE_GENERATION: 'google/gemini-2.0-flash-thinking-exp-1219:free',
  CREATIVE_WRITING: 'openai/gpt-5',
  SUMMARIZATION: 'google/gemini-2.5-flash',
  OP_ED: 'openai/gpt-5-mini'
};
```

2. **Token Optimization**
- Limit max tokens per request
- Use concise prompts
- Remove redundant context

3. **Audio Optimization**
- Cache intro/outro segments
- Use lower quality for drafts
- Batch voice synthesis requests

## 🔐 Security Procedures

### API Key Rotation

Quarterly rotation schedule:
1. Generate new API keys
2. Update in Vercel dashboard
3. Test with manual generation
4. Remove old keys after verification

### Access Control

```javascript
// Verify bearer token for all admin endpoints
if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Backup Procedures

Daily backups include:
- Generated content (Convex/Firebase)
- Configuration files (Git)
- Cost tracking data
- Generation metrics

## 📈 Scaling Considerations

### Handling Increased Load

When scaling to multiple editions or languages:

1. **Database Sharding**
```javascript
// Partition by date or edition
const partition = `content_${date}_${edition}`;
```

2. **Queue Management**
```javascript
// Use job queue for generation
await queue.add('generate-article', { story, priority: 1 });
```

3. **CDN Configuration**
- Audio files → Cloudflare CDN
- Static assets → Vercel Edge Network
- API responses → Cache headers

### Multi-Edition Setup

For running multiple editorial perspectives:
```yaml
# config/editions.yaml
editions:
  progressive:
    values: { socialJustice: 10, equality: 9 }
  conservative:
    values: { tradition: 9, liberty: 10 }
  centrist:
    values: { balance: 10, pragmatism: 9 }
```

## 📝 Maintenance Schedule

### Daily
- Monitor generation completion
- Check cost tracking
- Review error logs

### Weekly
- Analyze content quality metrics
- Review cost trends
- Update news source configurations

### Monthly
- Full system backup
- Performance analysis
- Editorial DNA tuning
- Host personality adjustments

### Quarterly
- API key rotation
- Dependency updates
- Security audit
- Cost optimization review

## 🆘 Support Contacts

### Escalation Path

1. **Level 1**: Check this documentation
2. **Level 2**: Review logs in Vercel dashboard
3. **Level 3**: GitHub Issues
4. **Level 4**: Emergency contact

### Useful Commands

```bash
# Check system status
npm run status

# Run diagnostics
npm run diagnose

# Generate test content
npm run test:generation

# Validate configuration
npm run validate:config

# Emergency stop
npm run emergency:stop
```

## 📚 Additional Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [OpenRouter API Reference](https://openrouter.ai/docs)
- [ElevenLabs API Guide](https://docs.elevenlabs.io/api-reference)
- [Convex Documentation](https://docs.convex.dev)
- [FFmpeg Audio Processing](https://ffmpeg.org/ffmpeg-filters.html#audio)

---

Last Updated: 2025-09-11
Version: 2.0.0