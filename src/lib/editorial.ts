import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { IngestedArticle } from './ingestion';

// Type definitions for Editorial DNA configuration
export interface EditorialValues {
  values: string[];
  influences: {
    thinkers: string[];
    publications: string[];
    styles: string[];
  };
  priorities: Record<string, number>;
  avoid: string[];
  seek: string[];
}

export interface ImportanceWeights {
  value_alignment: number;
  topic_relevance: number;
  future_impact: number;
  novelty_factor: number;
  systemic_relevance: number;
  actionability: number;
  geographic_proximity: number;
  temporal_relevance: number;
  clickbait_penalty: number;
  redundancy_penalty: number;
  triviality_penalty: number;
  speculation_penalty: number;
}

export interface Thresholds {
  minimum_importance_score: number;
  maximum_daily_stories: number;
  minimum_source_diversity: number;
  fact_check_confidence: number;
}

export interface ToneConfiguration {
  default_style: string;
  complexity_level: string;
  humor_threshold: number;
  topic_tones: Record<string, string>;
}

export interface EditorialAngle {
  primary: string;
  secondary: string;
  avoid: string;
}

export interface EditorialAngles {
  breaking_news: EditorialAngle;
  scientific_discovery: EditorialAngle;
  political_development: EditorialAngle;
  technology_announcement: EditorialAngle;
  economic_news: EditorialAngle;
  social_trend: EditorialAngle;
}

export interface SpecialRules {
  always_cover: string[];
  never_cover: string[];
  requires_verification: string[];
}

export interface OutputPreferences {
  summary_style: string;
  quote_selection: string;
  data_presentation: string;
  conclusion_style: string;
}

export interface TimingConfiguration {
  daily_generation: string;
  breaking_threshold: number;
  weekend_adjustment: number;
}

export interface ExperimentalFeatures {
  predictive_modeling: boolean;
  contrarian_corner: boolean;
  connection_mapping: boolean;
  solution_spotlight: boolean;
  long_term_tracking: boolean;
}

export interface EditorialDNA {
  editorial_dna: EditorialValues;
  importance_weights: ImportanceWeights;
  thresholds: Thresholds;
  tone: ToneConfiguration;
  editorial_angles: EditorialAngles;
  source_credibility: Record<string, number>;
  special_rules: SpecialRules;
  output_preferences: OutputPreferences;
  timing: TimingConfiguration;
  experimental: ExperimentalFeatures;
}

// Cache for parsed configuration
let cachedEditorialDNA: EditorialDNA | null = null;

/**
 * Load and parse the editorial DNA configuration from YAML
 */
export function loadEditorialDNA(): EditorialDNA {
  if (cachedEditorialDNA) {
    return cachedEditorialDNA;
  }

  try {
    const configPath = path.join(process.cwd(), 'config', 'editorial.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    cachedEditorialDNA = yaml.load(fileContents) as EditorialDNA;
    
    if (!cachedEditorialDNA || !cachedEditorialDNA.editorial_dna) {
      throw new Error('Invalid editorial configuration: missing editorial_dna');
    }

    return cachedEditorialDNA;
  } catch (error) {
    console.error('Failed to load editorial configuration:', error);
    throw new Error(`Failed to load editorial.yaml: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get core editorial values
 */
export function getEditorialValues(): string[] {
  const config = loadEditorialDNA();
  return config.editorial_dna.values;
}

/**
 * Get topic priorities
 */
export function getTopicPriorities(): Record<string, number> {
  const config = loadEditorialDNA();
  return config.editorial_dna.priorities;
}

/**
 * Get importance scoring weights
 */
export function getImportanceWeights(): ImportanceWeights {
  const config = loadEditorialDNA();
  return config.importance_weights;
}

/**
 * Get editorial thresholds
 */
export function getThresholds(): Thresholds {
  const config = loadEditorialDNA();
  return config.thresholds;
}

/**
 * Get perspectives to seek
 */
export function getPerspectivesToSeek(): string[] {
  const config = loadEditorialDNA();
  return config.editorial_dna.seek;
}

/**
 * Get perspectives to avoid
 */
export function getPerspectivesToAvoid(): string[] {
  const config = loadEditorialDNA();
  return config.editorial_dna.avoid;
}

/**
 * Calculate alignment score between story and editorial values
 */
export function calculateValueAlignment(story: IngestedArticle, values: string[]): number {
  let score = 0;
  const content = (story.content || '').toLowerCase();
  const title = (story.title || '').toLowerCase();
  const combined = `${title} ${content}`;
  
  // Simple keyword matching for now - could be enhanced with embeddings
  const valueKeywords: Record<string, string[]> = {
    intellectual_honesty: ['truth', 'evidence', 'fact', 'research', 'study', 'data', 'accurate'],
    technological_progress: ['innovation', 'technology', 'breakthrough', 'advance', 'development', 'solution'],
    human_flourishing: ['wellbeing', 'health', 'education', 'quality of life', 'prosperity', 'opportunity'],
    systems_thinking: ['systemic', 'interconnected', 'complex', 'ecosystem', 'network', 'infrastructure'],
    constructive_skepticism: ['question', 'investigate', 'analyze', 'critique', 'examine', 'challenge'],
  };
  
  for (const value of values) {
    const keywords = valueKeywords[value] || [];
    const matchCount = keywords.filter(keyword => combined.includes(keyword)).length;
    if (matchCount > 0) {
      score += Math.min(matchCount / keywords.length, 1) * (10 / values.length);
    }
  }
  
  return Math.min(score, 10);
}

/**
 * Calculate topic relevance score
 */
export function calculateTopicRelevance(story: IngestedArticle, priorities: Record<string, number>): number {
  const content = (story.content || '').toLowerCase();
  const title = (story.title || '').toLowerCase();
  const combined = `${title} ${content}`;
  
  let maxScore = 0;
  
  // Topic keywords mapping
  const topicKeywords: Record<string, string[]> = {
    climate_technology: ['climate', 'carbon', 'renewable', 'solar', 'wind', 'energy', 'emissions'],
    artificial_intelligence: ['ai', 'artificial intelligence', 'machine learning', 'neural', 'gpt', 'llm'],
    scientific_breakthroughs: ['discovery', 'research', 'breakthrough', 'scientist', 'study', 'finding'],
    geopolitics: ['government', 'policy', 'international', 'diplomatic', 'sanctions', 'treaty'],
    space_exploration: ['space', 'nasa', 'spacecraft', 'asteroid', 'mars', 'rocket', 'satellite'],
    biotech_advances: ['biotech', 'gene', 'crispr', 'vaccine', 'therapy', 'medicine', 'drug'],
    economic_systems: ['economy', 'inflation', 'market', 'trade', 'gdp', 'finance', 'bank'],
    cultural_evolution: ['culture', 'social', 'movement', 'generation', 'trend', 'society'],
    energy_transitions: ['energy', 'nuclear', 'fusion', 'battery', 'grid', 'power'],
    education_innovation: ['education', 'learning', 'school', 'university', 'student', 'teaching'],
  };
  
  for (const [topic, priority] of Object.entries(priorities)) {
    const keywords = topicKeywords[topic] || [topic.replace(/_/g, ' ')];
    const matchCount = keywords.filter(keyword => combined.includes(keyword)).length;
    if (matchCount > 0) {
      const relevance = Math.min(matchCount / keywords.length, 1) * priority;
      maxScore = Math.max(maxScore, relevance);
    }
  }
  
  return maxScore;
}

/**
 * Assess future impact of a story
 */
export function assessFutureImpact(story: IngestedArticle): number {
  const content = (story.content || '').toLowerCase();
  
  // Keywords indicating future impact
  const futureKeywords = [
    'will', 'future', 'predict', 'forecast', 'expect', 'upcoming',
    'next year', 'by 2030', 'long-term', 'consequence', 'impact',
    'transform', 'disrupt', 'change', 'evolution', 'trend'
  ];
  
  const matchCount = futureKeywords.filter(keyword => content.includes(keyword)).length;
  return Math.min((matchCount / 5), 1) * 10; // Scale to 0-10
}

/**
 * Calculate novelty of a story
 */
export function calculateNovelty(story: IngestedArticle): number {
  const content = (story.content || '').toLowerCase();
  
  // Keywords indicating novelty
  const noveltyKeywords = [
    'first', 'new', 'novel', 'unprecedented', 'breakthrough',
    'discovery', 'invented', 'revolutionary', 'never before',
    'unique', 'exclusive', 'revealed'
  ];
  
  const matchCount = noveltyKeywords.filter(keyword => content.includes(keyword)).length;
  return Math.min((matchCount / 3), 1) * 10; // Scale to 0-10
}

/**
 * Assess systemic importance
 */
export function assessSystemicImportance(story: IngestedArticle): number {
  const content = (story.content || '').toLowerCase();
  
  // Keywords indicating systemic importance
  const systemicKeywords = [
    'system', 'infrastructure', 'global', 'widespread', 'industry',
    'sector', 'economy', 'society', 'ecosystem', 'network',
    'platform', 'standard', 'regulation', 'policy'
  ];
  
  const matchCount = systemicKeywords.filter(keyword => content.includes(keyword)).length;
  return Math.min((matchCount / 4), 1) * 10; // Scale to 0-10
}

/**
 * Assess actionability for audience
 */
export function assessActionability(story: IngestedArticle): number {
  const content = (story.content || '').toLowerCase();
  
  // Keywords indicating actionability
  const actionKeywords = [
    'how to', 'guide', 'tips', 'advice', 'recommend',
    'should', 'can', 'tool', 'resource', 'available',
    'apply', 'use', 'implement', 'action'
  ];
  
  const matchCount = actionKeywords.filter(keyword => content.includes(keyword)).length;
  return Math.min((matchCount / 3), 1) * 10; // Scale to 0-10
}

/**
 * Detect clickbait content
 */
export function detectClickbait(story: IngestedArticle): number {
  const title = (story.title || '').toLowerCase();
  const content = (story.content || '').toLowerCase();
  
  // Clickbait indicators
  const clickbaitPatterns = [
    'you won\'t believe', 'shocking', 'mind-blowing', 'this one trick',
    'doctors hate', 'number [0-9] will shock', 'what happened next',
    'gone wrong', 'gone viral', 'breaks the internet', 'insane'
  ];
  
  let score = 0;
  for (const pattern of clickbaitPatterns) {
    if (title.includes(pattern)) score += 2;
    if (content.includes(pattern)) score += 0.5;
  }
  
  return Math.min(score, 10); // Cap at 10
}

/**
 * Calculate overall story importance score
 */
export function calculateStoryImportance(story: IngestedArticle, editorialDNA?: EditorialDNA): number {
  const dna = editorialDNA || loadEditorialDNA();
  const weights = dna.importance_weights;
  
  // Calculate individual scores
  const scores = {
    valueAlignment: calculateValueAlignment(story, dna.editorial_dna.values) * weights.value_alignment,
    topicRelevance: calculateTopicRelevance(story, dna.editorial_dna.priorities) * weights.topic_relevance,
    futureImpact: assessFutureImpact(story) * weights.future_impact,
    noveltyFactor: calculateNovelty(story) * weights.novelty_factor,
    systemicRelevance: assessSystemicImportance(story) * weights.systemic_relevance,
    actionability: assessActionability(story) * weights.actionability,
    clickbaitPenalty: detectClickbait(story) * weights.clickbait_penalty,
  };
  
  // Sum all scores (clickbait penalty is already negative)
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  
  // Ensure score is non-negative
  return Math.max(0, totalScore);
}

/**
 * Apply editorial filter to stories
 */
export function applyEditorialFilter(
  stories: IngestedArticle[],
  editorialDNA?: EditorialDNA
): IngestedArticle[] {
  const dna = editorialDNA || loadEditorialDNA();
  const thresholds = dna.thresholds;
  
  // Score all stories
  const scoredStories = stories.map(story => ({
    story,
    score: calculateStoryImportance(story, dna)
  }));
  
  // Filter by minimum score
  const filtered = scoredStories
    .filter(item => item.score >= thresholds.minimum_importance_score)
    .sort((a, b) => b.score - a.score)
    .slice(0, thresholds.maximum_daily_stories)
    .map(item => ({
      ...item.story,
      editorialScore: item.score
    }));
  
  return filtered;
}

/**
 * Get editorial angle for a story type
 */
export function getEditorialAngle(storyType: string): EditorialAngle | undefined {
  const config = loadEditorialDNA();
  const angles = config.editorial_angles;
  
  // Map story to angle type
  const angleKey = storyType.toLowerCase().replace(/\s+/g, '_') as keyof EditorialAngles;
  return angles[angleKey];
}

/**
 * Inject editorial angle into a story
 */
export function injectEditorialAngle(
  story: IngestedArticle,
  editorialDNA?: EditorialDNA
): IngestedArticle {
  const dna = editorialDNA || loadEditorialDNA();
  
  // Determine story type based on content
  let storyType = 'breaking_news'; // default
  const content = (story.content || '').toLowerCase();
  
  if (content.includes('research') || content.includes('study') || content.includes('discovery')) {
    storyType = 'scientific_discovery';
  } else if (content.includes('government') || content.includes('policy') || content.includes('election')) {
    storyType = 'political_development';
  } else if (content.includes('technology') || content.includes('startup') || content.includes('innovation')) {
    storyType = 'technology_announcement';
  } else if (content.includes('economy') || content.includes('market') || content.includes('inflation')) {
    storyType = 'economic_news';
  } else if (content.includes('trend') || content.includes('culture') || content.includes('social')) {
    storyType = 'social_trend';
  }
  
  const angle = getEditorialAngle(storyType);
  const perspectives = dna.editorial_dna.seek.filter(perspective => {
    // Simple matching - could be enhanced
    return Math.random() > 0.7; // Randomly select some perspectives for variety
  });
  
  return {
    ...story,
    editorialAngle: angle,
    editorialPerspective: perspectives
  };
}

/**
 * Check if a story should always be covered
 */
export function shouldAlwaysCover(story: IngestedArticle): boolean {
  const config = loadEditorialDNA();
  const rules = config.special_rules.always_cover;
  
  const content = (story.content || '').toLowerCase();
  const title = (story.title || '').toLowerCase();
  const combined = `${title} ${content}`;
  
  return rules.some(rule => {
    const ruleKeywords = rule.toLowerCase().replace(/_/g, ' ').split(' ');
    return ruleKeywords.every(keyword => combined.includes(keyword));
  });
}

/**
 * Check if a story should never be covered
 */
export function shouldNeverCover(story: IngestedArticle): boolean {
  const config = loadEditorialDNA();
  const rules = config.special_rules.never_cover;
  
  const content = (story.content || '').toLowerCase();
  const title = (story.title || '').toLowerCase();
  const combined = `${title} ${content}`;
  
  return rules.some(rule => {
    const ruleKeywords = rule.toLowerCase().replace(/_/g, ' ').split(' ');
    return ruleKeywords.some(keyword => combined.includes(keyword));
  });
}

/**
 * Check if a story requires verification
 */
export function requiresVerification(story: IngestedArticle): boolean {
  const config = loadEditorialDNA();
  const rules = config.special_rules.requires_verification;
  
  const content = (story.content || '').toLowerCase();
  const title = (story.title || '').toLowerCase();
  const combined = `${title} ${content}`;
  
  return rules.some(rule => {
    const ruleKeywords = rule.toLowerCase().replace(/_/g, ' ').split(' ');
    return ruleKeywords.some(keyword => combined.includes(keyword));
  });
}

/**
 * Get source credibility weight
 */
export function getSourceCredibility(sourceName: string): number {
  const config = loadEditorialDNA();
  const credibility = config.source_credibility;
  
  // Map common source names to credibility categories
  const sourceMapping: Record<string, string> = {
    'reuters': 'established_media',
    'ap': 'established_media',
    'bbc': 'established_media',
    'guardian': 'established_media',
    'nyt': 'established_media',
    'twitter': 'social_media',
    'facebook': 'social_media',
  };
  
  const category = sourceMapping[sourceName.toLowerCase()] || 'established_media';
  return credibility[category] || 0.5;
}

/**
 * Reload configuration (useful for development)
 */
export function reloadEditorialDNA(): EditorialDNA {
  cachedEditorialDNA = null;
  return loadEditorialDNA();
}