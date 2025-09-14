import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Type definitions for news sources
export interface RateLimit {
  requestsPerMinute: number;
}

export interface NewsSource {
  name: string;
  displayName: string;
  rss: string;
  selector: string;
  enabled: boolean;
  priority: number;
  rateLimit: RateLimit;
  fallbackSelectors?: string[];
  requiresAuth?: boolean;
}

export interface QualityFilters {
  minArticleLength: number;
  maxArticleLength: number;
  requiredElements: string[];
  blockedDomains: string[];
  blockedKeywords: string[];
}

export interface SourceSettings {
  maxArticlesPerSource: number;
  maxConcurrentRequests: number;
  requestTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  userAgent: string;
}

export interface SourcesConfig {
  sources: NewsSource[];
  settings: SourceSettings;
  qualityFilters: QualityFilters;
}

// Cache for parsed configuration
let cachedConfig: SourcesConfig | null = null;

/**
 * Load and parse the sources configuration from YAML
 */
export function loadSourcesConfig(): SourcesConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configPath = path.join(process.cwd(), 'config', 'sources.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    cachedConfig = yaml.load(fileContents) as SourcesConfig;
    
    if (!cachedConfig || !cachedConfig.sources) {
      throw new Error('Invalid sources configuration: missing sources array');
    }

    return cachedConfig;
  } catch (error) {
    console.error('Failed to load sources configuration:', error);
    throw new Error(`Failed to load sources.yaml: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all enabled news sources
 */
export function getEnabledSources(): NewsSource[] {
  const config = loadSourcesConfig();
  return config.sources.filter(source => source.enabled);
}

/**
 * Get sources sorted by priority (lower number = higher priority)
 */
export function getSourcesByPriority(): NewsSource[] {
  const sources = getEnabledSources();
  return sources.sort((a, b) => a.priority - b.priority);
}

/**
 * Get a specific source by name
 */
export function getSourceByName(name: string): NewsSource | undefined {
  const config = loadSourcesConfig();
  return config.sources.find(source => source.name === name);
}

/**
 * Get global ingestion settings
 */
export function getSettings(): SourceSettings {
  const config = loadSourcesConfig();
  return config.settings;
}

/**
 * Get quality filters for content validation
 */
export function getQualityFilters(): QualityFilters {
  const config = loadSourcesConfig();
  return config.qualityFilters;
}

/**
 * Calculate delay needed to respect rate limits
 */
export function calculateRateLimitDelay(source: NewsSource): number {
  const minuteInMs = 60000;
  return Math.ceil(minuteInMs / source.rateLimit.requestsPerMinute);
}

/**
 * Check if a URL is from a blocked domain
 */
export function isBlockedDomain(url: string): boolean {
  const filters = getQualityFilters();
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.toLowerCase();
  
  return filters.blockedDomains.some(blocked => 
    hostname.includes(blocked.toLowerCase())
  );
}

/**
 * Check if content contains blocked keywords
 */
export function containsBlockedKeywords(content: string): boolean {
  const filters = getQualityFilters();
  const lowerContent = content.toLowerCase();
  
  return filters.blockedKeywords.some(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
}

/**
 * Validate article meets quality standards
 */
export function validateArticleQuality(article: {
  content?: string;
  headline?: string;
  pubDate?: string | Date;
}): { valid: boolean; reason?: string } {
  const filters = getQualityFilters();
  
  // Check required elements
  for (const element of filters.requiredElements) {
    if (!article[element as keyof typeof article]) {
      return { valid: false, reason: `Missing required element: ${element}` };
    }
  }
  
  // Check article length
  if (article.content) {
    const wordCount = article.content.split(/\s+/).length;
    
    if (wordCount < filters.minArticleLength) {
      return { valid: false, reason: `Article too short: ${wordCount} words (min: ${filters.minArticleLength})` };
    }
    
    if (wordCount > filters.maxArticleLength) {
      return { valid: false, reason: `Article too long: ${wordCount} words (max: ${filters.maxArticleLength})` };
    }
    
    // Check for blocked keywords
    if (containsBlockedKeywords(article.content)) {
      return { valid: false, reason: 'Contains blocked keywords' };
    }
  }
  
  return { valid: true };
}

/**
 * Reload configuration (useful for development)
 */
export function reloadConfig(): SourcesConfig {
  cachedConfig = null;
  return loadSourcesConfig();
}

// Export the main sources array for convenience
export const sources: NewsSource[] = getEnabledSources();