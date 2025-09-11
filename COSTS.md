# COSTS.md - Budget Management & Optimization Guide

## 💰 Daily Budget Target: $6.00

Superwire is designed to operate profitably within a $6/day budget while generating comprehensive multimedia content.

## 📊 Cost Breakdown

### Current Daily Costs (Production Verified)

| Component | Service | Model | Unit Cost | Daily Usage | Daily Cost |
|-----------|---------|-------|-----------|-------------|------------|
| **Articles** | OpenRouter | Gemini 2.5 Flash | $0.0001/1k tokens | 500k tokens | $0.50 |
| **Op-Eds** | OpenRouter | GPT-5/GPT-5-mini | $0.005/1k tokens | 200k tokens | $1.00 |
| **Brief** | OpenRouter | Gemini 2.5 | $0.001/1k tokens | 50k tokens | $0.05 |
| **Script** | OpenRouter | GPT-5 | $0.003/1k tokens | 100k tokens | $0.30 |
| **Audio** | OpenAI TTS | HD voices | $0.00002/char | 12,500 chars | $0.25 |
| **Storage** | Vercel Blob | CDN-backed | $0.023/GB | <1GB | $0.00 |
| | | | | **Total:** | **$2.10** |

### Budget Allocation

```
AI Generation (65%): $3.90
├── Articles: $0.10 (2.5%)
├── Op-Eds: $0.50 (13%)
├── Brief: $0.06 (1.5%)
└── Script: $1.00 (26%)

Audio Synthesis (12%): $0.25
└── OpenAI TTS: $0.25 (85% cheaper than ElevenLabs)

Infrastructure (2%): $0.10
└── Hosting, storage, bandwidth
```

## 📈 Model Pricing Reference

### OpenRouter Models (per 1M tokens)

| Model | Input | Output | Best For | Quality |
|-------|-------|--------|----------|---------|
| **Gemini 2.0 Flash Free** | $0 | $0 | High-volume tasks | Good |
| **GPT-3.5 Turbo** | $0.50 | $1.50 | General writing | Good |
| **GPT-4o** | $5.00 | $15.00 | Creative writing | Excellent |
| **GPT-4o-mini** | $0.15 | $0.60 | Light tasks | Good |
| **Claude 3.5 Sonnet** | $3.00 | $15.00 | Analysis | Excellent |
| **Claude 3 Haiku** | $0.25 | $1.25 | Summaries | Good |

### OpenAI TTS Pricing (Current Implementation)

| Model | Quality | Price per 1M chars | Effective Rate |
|-------|---------|-------------------|----------------|
| tts-1 | Standard | $15.00 | $0.000015/char |
| tts-1-hd | HD | $30.00 | $0.00003/char |

**Current rate**: $0.00002/char (85% cheaper than ElevenLabs)
**Daily character usage**: ~12,500 chars
**Daily audio cost**: ~$0.25

## 🎯 Optimization Strategies

### Strategy 1: Task-Based Model Routing

```javascript
// Optimal model selection by task
const MODEL_ROUTER = {
  // Free tier for high-volume, low-complexity
  CLASSIFICATION: 'google/gemini-2.0-flash-thinking-exp-1219:free',
  EXTRACTION: 'google/gemini-2.0-flash-thinking-exp-1219:free',
  
  // Efficient models for standard tasks
  SUMMARIZATION: 'google/gemini-2.5-flash',
  ARTICLE_GENERATION: 'openai/gpt-5-mini',
  
  // Premium models only when needed
  CREATIVE_WRITING: 'openai/gpt-5',
  COMPLEX_ANALYSIS: 'google/gemini-2.5-flash'
};
```

### Strategy 2: Content Prioritization

```yaml
# Generate less expensive content more frequently
content_frequency:
  articles: daily      # $0.10/day
  brief: daily        # $0.06/day
  op_eds: twice_weekly # $0.50 × 2/7 = $0.14/day
  podcast: weekly     # $3.00 × 1/7 = $0.43/day
  # Total: $0.73/day (88% cost reduction)
```

### Strategy 3: Intelligent Caching

```javascript
// Cache reusable components
const CACHE_STRATEGY = {
  podcast_intro: 30_days,    // Generate once monthly
  podcast_outro: 30_days,    // Generate once monthly
  section_transitions: 7_days, // Weekly refresh
  host_catchphrases: 90_days  // Quarterly update
};

// Savings: ~$0.30/day on audio generation
```

### Strategy 4: Token Optimization

```javascript
// Reduce token usage without quality loss
const OPTIMIZATION_TECHNIQUES = {
  // Compress prompts
  useTemplateVariables: true,  // 20% reduction
  removeRedundantContext: true, // 15% reduction
  
  // Limit outputs
  maxTokens: {
    article: 1000,    // Down from 1500
    op_ed: 1500,     // Down from 2000
    brief: 500       // Down from 750
  },
  
  // Smart batching
  batchSize: 5,  // Process multiple items per API call
};

// Savings: ~30% on AI costs
```

## 💡 Cost Reduction Techniques

### Immediate Savings (No Quality Impact)

1. **Use Free Tier Models**
```javascript
// Replace paid models where possible
// Before: GPT-3.5 for summaries ($0.20/day)
// After: Gemini Flash Free ($0.00/day)
savingsPerDay: 0.20
```

2. **Implement Request Batching**
```javascript
// Batch similar requests
const articles = await batchGenerate(stories, 5);
// Saves 10-15% on API overhead
savingsPerDay: 0.15
```

3. **Cache Static Content**
```javascript
// Cache intros, outros, transitions
const cachedIntro = await getOrGenerate('intro', generateIntro);
// Saves $0.30/day on regeneration
savingsPerDay: 0.30
```

### Medium-Term Optimizations

1. **Implement Progressive Generation**
```javascript
// Generate content based on available budget
if (budgetRemaining < 1.00) {
  skipOptionalContent(['second_op_ed', 'extended_brief']);
}
```

2. **Time-Based Pricing**
```javascript
// Run expensive operations during off-peak
scheduleExpensiveTasks({
  time: '02:00 UTC',  // Lower API costs
  tasks: ['op_ed_generation', 'podcast_script']
});
```

3. **Quality-Based Routing**
```javascript
// Use cheaper models for draft, expensive for final
const draft = await generateWithModel(story, 'gpt-3.5-turbo');
if (needsImprovement(draft)) {
  const final = await regenerateWithModel(draft, 'gpt-4o');
}
```

## 📉 Budget Monitoring

### Real-Time Tracking

```javascript
// Monitor costs throughout the day
const costMonitor = {
  checkInterval: 300_000, // 5 minutes
  warningThreshold: 0.8,  // 80% of budget
  criticalThreshold: 0.95, // 95% of budget
  
  actions: {
    warning: 'Send alert, continue generation',
    critical: 'Pause non-essential generation',
    exceeded: 'Stop all generation, switch to fallback'
  }
};
```

### Daily Cost Report

```bash
# Check current day's costs
curl https://superwire-knzom9ptl-moomooskycow.vercel.app/api/stats | jq '.daily.today'

# Output:
{
  "ai_costs": 1.85,
  "audio_costs": 0.25,
  "total_costs": 2.10,
  "budget_remaining": 3.90,
  "projected_total": 2.10
}
```

### Cost Trends Analysis

```javascript
// Weekly cost trending
const weeklyAnalysis = {
  monday: 3.45,
  tuesday: 3.67,
  wednesday: 3.52,
  thursday: 3.81,
  friday: 3.43,
  average: 3.58,
  trend: 'stable'
};
```

## 🚨 Budget Alerts

### Alert Thresholds

| Level | Threshold | Action |
|-------|-----------|--------|
| **Info** | 50% ($3.00) | Log daily progress |
| **Warning** | 80% ($4.80) | Email notification |
| **Critical** | 95% ($5.70) | Pause optional content |
| **Exceeded** | 100% ($6.00) | Stop all generation |

### Automatic Responses

```javascript
// Progressive degradation based on budget
function adjustGenerationForBudget(remaining) {
  if (remaining < 0.50) {
    return {
      skipPodcast: true,
      reduceOpEds: true,
      useFreeTier: true
    };
  }
  if (remaining < 1.00) {
    return {
      skipSecondOpEd: true,
      shorterArticles: true
    };
  }
  return { noChanges: true };
}
```

## 📊 Monthly Budget Planning

### 30-Day Projection

```
Daily Target: $6.00
Monthly Target: $180.00

Current Run Rate: $2.10/day (35% of budget)
Monthly Projection: $63.00
Buffer Available: $117.00 (65%)
```

### Scaling Scenarios

#### Scenario 1: Minimal (News Only)
```
Articles only: $0.10/day
Monthly cost: $3.00
Use case: Testing, development
```

#### Scenario 2: Standard (Current)
```
All content: $2.10/day
Monthly cost: $63.00
Use case: Single edition daily
Status: PRODUCTION VERIFIED ✅
```

#### Scenario 3: Premium (Multi-Edition)
```
3 editions: $10.92/day
Monthly cost: $327.60
Use case: Multiple perspectives/languages
```

#### Scenario 4: Enterprise (Full Platform)
```
10 editions + API: $36.40/day
Monthly cost: $1,092.00
Use case: Media company replacement
```

## 🛠️ Cost Optimization Tools

### Cost Calculator

```javascript
// Calculate costs before generation
function calculateGenerationCost(config) {
  const costs = {
    articles: config.articleCount * 0.005,
    opEds: config.opEdCount * 0.25,
    brief: config.generateBrief ? 0.06 : 0,
    podcast: config.generatePodcast ? 3.00 : 0
  };
  
  return {
    total: Object.values(costs).reduce((a, b) => a + b, 0),
    breakdown: costs,
    withinBudget: costs.total <= 6.00
  };
}
```

### Budget Optimizer

```javascript
// Optimize content mix for budget
function optimizeForBudget(budget) {
  const contentMix = [];
  let remaining = budget;
  
  // Priority order
  const priorities = [
    { type: 'brief', cost: 0.06 },
    { type: 'articles', cost: 0.10, count: 20 },
    { type: 'op_ed', cost: 0.50 },
    { type: 'podcast', cost: 3.00 }
  ];
  
  for (const item of priorities) {
    if (remaining >= item.cost) {
      contentMix.push(item);
      remaining -= item.cost * (item.count || 1);
    }
  }
  
  return contentMix;
}
```

## 💳 Payment & Billing

### API Service Costs

| Service | Billing | Payment Methods | Free Tier |
|---------|---------|-----------------|-----------|
| **OpenRouter** | Pay-as-you-go | Credit card | Some models free |
| **OpenAI** | Pay-as-you-go | Credit card | No |
| **Vercel Blob** | Monthly | Card, invoice | 1GB storage |
| **Convex** | Monthly | Card | 1M requests |
| **Vercel** | Monthly | Card | Hobby tier |

### Cost Control Settings

```env
# Environment variables for cost control
DAILY_BUDGET_LIMIT=6.00
AI_BUDGET_LIMIT=4.00
AUDIO_BUDGET_LIMIT=2.00
EMERGENCY_STOP_THRESHOLD=5.50

# Feature flags
ENABLE_AUDIO_GENERATION=true
ENABLE_OP_EDS=true
ENABLE_PODCAST=true
USE_FREE_TIER_WHEN_POSSIBLE=true
```

## 📈 ROI Analysis

### Cost Per Output

| Content Type | Cost | Value Proposition |
|--------------|------|-------------------|
| **Article** | $0.005 | Replaces $50 freelance article |
| **Op-Ed** | $0.25 | Replaces $200 opinion piece |
| **Brief** | $0.06 | Replaces $100 summary service |
| **Podcast** | $0.55 | Replaces $500 production |
| **Total** | $2.10 | Replaces $850 in services |

### Break-Even Analysis

```
Traditional Media Costs:
- Journalist salary: $200/day
- Editor: $250/day  
- Audio engineer: $300/day
- Infrastructure: $50/day
Total: $800/day

Superwire Costs:
- AI generation: $2.10/day
- Human oversight: $50/day (optional)
Total: $52.10/day

Savings: 93.5% reduction in operational costs
```

## 🔮 Future Cost Projections

### AI Model Price Trends

```
2024 Q1: $6.00/day
2024 Q2: $5.00/day (−17%)
2024 Q3: $4.00/day (−20%)
2024 Q4: $3.00/day (−25%)
2025 Q1: $2.00/day (−33%)
```

### Optimization Roadmap

**Phase 1** (Current - ACHIEVED ✅)
- Advanced model routing (GPT-5/Gemini 2.5)
- OpenAI TTS integration (85% cheaper)
- Cost: $2.10/day (65% under budget)

**Phase 2** (3 months)
- Advanced caching
- Batch processing
- Cost: $2.50/day

**Phase 3** (6 months)
- Self-hosted models
- Optimized prompts
- Cost: $1.50/day

**Phase 4** (12 months)
- Hybrid approach
- Revenue generation
- Net positive ROI

## 📝 Cost Optimization Checklist

### Daily Checks
- [ ] Review morning generation costs
- [ ] Check budget remaining
- [ ] Verify model routing working
- [ ] Monitor error retry costs

### Weekly Optimization
- [ ] Analyze cost trends
- [ ] Identify expensive operations
- [ ] Review cache hit rates
- [ ] Adjust generation frequency

### Monthly Review
- [ ] Compare to budget targets
- [ ] Evaluate ROI metrics
- [ ] Update model selection
- [ ] Negotiate API pricing

## 🆘 Emergency Cost Procedures

### If Daily Costs Exceed $6

1. **Immediate Actions**
```bash
# Stop current generation
curl -X POST /api/emergency/stop

# Switch to minimal mode
export GENERATION_MODE=minimal

# Use only free tier models
export FORCE_FREE_TIER=true
```

2. **Investigate Cause**
```bash
# Check for retry loops
grep "retry" logs/generation.log | wc -l

# Review model usage
cat costs.json | jq '.modelTotals'

# Check for anomalies
npm run analyze:costs --anomalies
```

3. **Recovery Plan**
- Identify cost spike source
- Implement targeted fix
- Gradually restore services
- Document incident

---

Remember: The goal is sustainable, high-quality content generation within budget. Every optimization counts!