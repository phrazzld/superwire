# EDITORIAL.md - Configuring Your Editorial Voice

## 🎯 Editorial DNA System

The Editorial DNA system allows you to shape how Superwire filters, prioritizes, and presents news. Think of it as programming the values and perspective of your personal newsroom.

## 📝 Core Configuration Files

### 1. Editorial Values (`config/editorial.yaml`)

```yaml
# Core values that shape story selection (0-10 scale)
values:
  truthSeeking: 10        # Prioritize factual accuracy
  systemicThinking: 9     # Focus on root causes
  humanCentered: 8        # Emphasize human impact
  futureOriented: 9       # Consider long-term implications
  solutionFocused: 7      # Highlight actionable solutions
  nuanceEmbracing: 8      # Avoid oversimplification

# Topics to prioritize (0-10 scale)
topic_priorities:
  technology: 9           # AI, software, hardware
  climate: 8             # Environmental issues
  economy: 7             # Markets, finance, labor
  society: 8             # Social issues, culture
  science: 9             # Research, discoveries
  politics: 5            # Governance, policy
  health: 7              # Medicine, wellness
  education: 6           # Learning, universities

# Perspectives to actively seek
perspectives_to_seek:
  - "Scientists and researchers"
  - "Affected communities"
  - "Future generations"
  - "Global south voices"
  - "Marginalized groups"
  - "Domain experts"

# Perspectives to minimize
perspectives_to_avoid:
  - "Corporate PR statements"
  - "Political spin"
  - "Unverified claims"
  - "Clickbait sources"
  - "Extremist viewpoints"
```

### 2. Host Personalities (`config/hosts.yaml`)

```yaml
hosts:
  - name: Adam
    role: Primary Analyst
    characteristics:
      analytical_depth: 9     # Deep analysis capability
      empathy_level: 5       # Moderate empathy
      energy_level: 6        # Measured delivery
      humor_level: 3         # Serious tone
      curiosity: 8           # High curiosity
    
    topicInterests:
      technology: 10
      science: 9
      economy: 8
      politics: 6
    
    speechPatterns:
      pace: measured
      vocabulary: precise
      transition_phrases:
        - "Let's examine the data"
        - "The evidence suggests"
        - "Upon closer analysis"

  - name: Dallas
    role: Human Interest
    characteristics:
      analytical_depth: 6
      empathy_level: 10      # High empathy
      energy_level: 7
      humor_level: 5
      curiosity: 7
    
    topicInterests:
      society: 10
      health: 9
      education: 8
      culture: 8

  - name: Jordan
    role: Culture & Trends
    characteristics:
      analytical_depth: 5
      empathy_level: 7
      energy_level: 10      # High energy
      humor_level: 8
      curiosity: 9
```

## 🎨 Customization Guide

### Adjusting Editorial Values

#### For Progressive-Leaning Coverage
```yaml
values:
  socialJustice: 10
  equalityFocus: 9
  systemicChange: 9
  environmentFirst: 8
  
topic_priorities:
  climate: 10
  inequality: 9
  laborRights: 8
  humanRights: 9
```

#### For Conservative-Leaning Coverage
```yaml
values:
  tradition: 9
  individualLiberty: 10
  marketFreedom: 9
  nationalSecurity: 8
  
topic_priorities:
  economy: 9
  defense: 8
  business: 9
  family: 8
```

#### For Tech-Focused Coverage
```yaml
values:
  innovation: 10
  disruption: 8
  efficiency: 9
  dataDriver: 9
  
topic_priorities:
  technology: 10
  startups: 9
  ai: 10
  crypto: 7
```

### Creating Custom Host Personalities

#### The Investigator
```yaml
name: Morgan
characteristics:
  analytical_depth: 10
  skepticism: 9
  persistence: 10
speechPatterns:
  transition_phrases:
    - "But here's what they're not telling you"
    - "Following the money reveals"
    - "Digging deeper, we find"
```

#### The Optimist
```yaml
name: Sunny
characteristics:
  empathy_level: 8
  energy_level: 9
  solutionFocus: 10
speechPatterns:
  transition_phrases:
    - "On the bright side"
    - "This breakthrough could mean"
    - "Here's how we can help"
```

## 📊 Importance Scoring Algorithm

### How Stories Are Scored

```javascript
score = (
  valueAlignment * 3.0 +      // How well it matches your values
  topicRelevance * 2.5 +      // How relevant to priority topics
  futureImpact * 2.0 +        // Long-term implications
  novelty * 1.5 +             // New information value
  systemicImportance * 1.8 +  // Systemic vs isolated
  actionability * 1.2         // Can readers act on this?
) / 12.0

// Penalties
if (clickbait) score *= 0.3
if (duplicate) score *= 0.5
if (trivial) score *= 0.4
```

### Minimum Thresholds

```yaml
importance_thresholds:
  minimum_importance_score: 6.0    # Stories below this are filtered
  op_ed_threshold: 7.5            # Topics need this score for op-eds
  featured_threshold: 8.5          # Top story placement

maximum_daily_stories: 30         # Cap on daily content
```

## 🎭 Editorial Angles

### Story Type Mapping

The system automatically detects story types and applies appropriate angles:

```yaml
editorial_angles:
  technology:
    primary: "Innovation impact on society"
    secondary: "Ethical implications"
    avoid: "Hype without substance"
  
  climate:
    primary: "Systemic solutions"
    secondary: "Community adaptation"
    avoid: "Doom without action"
  
  economy:
    primary: "Impact on workers"
    secondary: "Long-term sustainability"
    avoid: "Short-term market noise"
  
  politics:
    primary: "Policy effectiveness"
    secondary: "Democratic implications"
    avoid: "Horse race coverage"
```

### Narrative Tone Configuration

```yaml
narrative_tone:
  default: "analytical_but_accessible"
  
  by_topic:
    technology: "cautiously_optimistic"
    climate: "urgent_but_solution_focused"
    economy: "pragmatic_and_grounded"
    society: "empathetic_and_inclusive"
  
  avoid_tones:
    - "sensationalist"
    - "fear_mongering"
    - "condescending"
    - "partisan_rhetoric"
```

## 🔧 Advanced Configuration

### Special Coverage Rules

```yaml
special_rules:
  always_cover:
    - "Major climate events"
    - "Significant scientific breakthroughs"
    - "Human rights violations"
    - "Systemic inequality issues"
  
  never_cover:
    - "Celebrity gossip"
    - "Clickbait trends"
    - "Unverified conspiracies"
    - "PR puff pieces"
  
  requires_verification:
    - "Breaking news claims"
    - "Statistical assertions"
    - "Corporate announcements"
    - "Political promises"
```

### Source Credibility Weights

```yaml
source_credibility:
  tier_1:  # Most trusted
    - "Reuters"
    - "Associated Press"
    - "BBC"
    weight: 1.0
  
  tier_2:  # Trusted with verification
    - "The Guardian"
    - "New York Times"
    - "Washington Post"
    weight: 0.9
  
  tier_3:  # Requires cross-reference
    - "CNN"
    - "Fox News"
    - "MSNBC"
    weight: 0.7
```

### Time Sensitivity Settings

```yaml
timing:
  breaking_news_window: 2  # Hours to prioritize breaking news
  story_freshness_decay: 0.9  # Daily decay factor
  evergreen_boost: 1.2  # Boost for timeless content
```

## 📈 Testing Your Configuration

### Preview Editorial Filtering

```javascript
// Test your editorial DNA on sample stories
npm run test:editorial -- --preview

// Example output:
// Story: "New AI Model Breaks Records"
// - Value Alignment: 8.5
// - Topic Relevance: 9.0
// - Editorial Score: 8.2
// - Selected: YES
// - Angle: "Innovation impact on society"
```

### Validate Host Consistency

```javascript
// Check if generated content matches host personality
npm run test:hosts -- --validate

// Example output:
// Host: Adam
// - Analytical Depth: ✓ Consistent (8.5/9.0)
// - Vocabulary: ✓ Matches profile
// - Transition Phrases: ✓ Using configured phrases
```

## 🎯 Editorial Strategies

### Strategy 1: Niche Authority
Focus deeply on 2-3 topics to become the authoritative voice:

```yaml
topic_priorities:
  ai_safety: 10
  climate_tech: 10
  biotech: 9
  # Everything else: <5
```

### Strategy 2: Contrarian Perspectives
Challenge mainstream narratives:

```yaml
perspectives_to_seek:
  - "Dissenting experts"
  - "Historical parallels"
  - "Unintended consequences"
  - "Alternative solutions"
```

### Strategy 3: Solutions Journalism
Focus on what's working:

```yaml
values:
  solutionFocused: 10
  actionability: 9
  hopefulness: 8

editorial_angles:
  all:
    primary: "What's working and why"
    secondary: "How to scale success"
```

### Strategy 4: Global Perspectives
Internationalize coverage:

```yaml
perspectives_to_seek:
  - "Global South voices"
  - "Non-Western experts"
  - "Indigenous communities"
  - "International comparisons"
```

## 🔄 Iterative Refinement

### Weekly Tuning Process

1. **Review Generated Content**
```bash
# Analyze past week's editorial decisions
npm run analyze:editorial --days 7
```

2. **Identify Gaps**
- Missing important stories?
- Too much coverage of certain topics?
- Tone inconsistencies?

3. **Adjust Weights**
```yaml
# Increase importance of missed topics
topic_priorities:
  previously_underweight_topic: 8  # Was 5
```

4. **Test Changes**
```bash
# Run generation with new config
npm run test:generation --config config/editorial.yaml
```

5. **Monitor Results**
- Check quality scores
- Review audience feedback
- Measure engagement

## 💡 Best Practices

### DO's
✅ Start with moderate values (5-7) and adjust gradually
✅ Ensure values align with your actual beliefs
✅ Test configuration changes before deploying
✅ Document why you chose specific values
✅ Review and refine monthly

### DON'Ts
❌ Set all values to extremes (0 or 10)
❌ Change multiple values simultaneously
❌ Ignore contradictory values
❌ Copy someone else's configuration blindly
❌ Forget to update host personalities when changing values

## 📚 Examples by Media Type

### The Economist Style
```yaml
values:
  analyticalRigor: 10
  marketFocus: 8
  globalPerspective: 9
  dataDriver: 9

narrative_tone:
  default: "detached_analytical"
```

### NPR Style
```yaml
values:
  humanCentered: 10
  culturalDepth: 9
  publicInterest: 9
  nuanceEmbracing: 8

host_characteristics:
  empathy_level: 9
  curiosity: 10
```

### Vice Style
```yaml
values:
  counterCulture: 9
  youthFocus: 8
  edginess: 8
  authenticity: 9

narrative_tone:
  default: "irreverent_honest"
```

## 🎮 Quick Start Templates

### Template 1: Balanced Generalist
```bash
cp config/templates/balanced.yaml config/editorial.yaml
```

### Template 2: Tech Optimist
```bash
cp config/templates/tech-optimist.yaml config/editorial.yaml
```

### Template 3: Climate Activist
```bash
cp config/templates/climate-focus.yaml config/editorial.yaml
```

### Template 4: Business Professional
```bash
cp config/templates/business.yaml config/editorial.yaml
```

## 📊 Measuring Editorial Success

### Key Metrics

```yaml
editorial_metrics:
  value_alignment:
    target: >80%
    measure: "% of stories matching top 3 values"
  
  perspective_diversity:
    target: >5
    measure: "Unique perspectives per day"
  
  topic_coverage:
    target: >70%
    measure: "% of priority topics covered weekly"
  
  consistency_score:
    target: >85
    measure: "Tone consistency across content"
```

### Monthly Review Questions
1. Does the content reflect your intended values?
2. Are important stories being filtered out?
3. Is the tone consistent across formats?
4. Do the hosts sound distinct but coherent?
5. Are perspectives balanced appropriately?

---

Remember: Your editorial configuration is what makes Superwire uniquely yours. Take time to refine it until it perfectly represents your worldview and information needs.