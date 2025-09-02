import { OpenRouterClient, TaskType } from '../lib/openrouter';
import { IngestedArticle } from '../lib/ingestion';
import { EditorialDNA, loadEditorialDNA, injectEditorialAngle, calculateTopicRelevance } from '../lib/editorial';
import { jaccardSimilarity } from '../lib/text-utils';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

/**
 * Interface for generated article results
 */
export interface GeneratedArticle {
  title: string;
  content: string;
  excerpt: string;
  wordCount: number;
  generationCost: number;
  model: string;
  editorialAngle?: string;
  sourceStory: IngestedArticle;
  generatedAt: Date;
  qualityScore?: number;
}

/**
 * Interface for article generation options
 */
export interface ArticleGenerationOptions {
  targetLength?: number; // Target word count (default: 600)
  editorialDNA?: EditorialDNA;
  openRouterClient?: OpenRouterClient;
  includeEditorialAngle?: boolean;
  focusAreas?: string[]; // Specific aspects to emphasize
  storeInConvex?: boolean; // Whether to automatically store in Convex database
}

/**
 * Store generated article in Convex database
 */
export async function storeArticleInConvex(article: GeneratedArticle): Promise<string | null> {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    
    if (!convexUrl) {
      console.warn('⚠️ NEXT_PUBLIC_CONVEX_URL not configured, skipping article storage');
      return null;
    }

    // Initialize Convex client
    const client = new ConvexHttpClient(convexUrl);

    // Transform GeneratedArticle to Convex format
    const convexArticle = {
      date: article.generatedAt.toISOString().split('T')[0], // Convert to ISO date string
      headline: article.title,
      content: article.content,
      sources: extractSourcesFromStory(article.sourceStory),
      model: article.model,
      costs: {
        inputTokens: 0, // OpenRouter doesn't provide token breakdown yet
        outputTokens: 0, // Will estimate from word count if needed
        totalCost: article.generationCost,
      },
      editorialScore: article.qualityScore,
      tags: createTagsFromArticle(article),
    };

    // Store the article in Convex
    const articleId = await client.mutation(api.functions.storeArticle, convexArticle);
    
    console.log(`✅ Article stored in Convex with ID: ${articleId}`);
    return articleId;

  } catch (error) {
    console.error('❌ Failed to store article in Convex:', error);
    return null;
  }
}

/**
 * Extract source information from IngestedArticle for Convex storage
 */
function extractSourcesFromStory(story: IngestedArticle): string[] {
  const sources: string[] = [];
  
  // Add source name
  if (story.sourceName) sources.push(story.sourceName);
  if (story.source && story.source !== story.sourceName) sources.push(story.source);
  
  // Add URL if available
  if (story.url) sources.push(story.url);
  
  // Fallback to a generic source if none found
  if (sources.length === 0) sources.push('Unknown Source');
  
  return sources;
}

/**
 * Create tags array from article metadata for searchability
 */
function createTagsFromArticle(article: GeneratedArticle): string[] {
  const tags: string[] = [];
  
  // Add editorial angle as tag
  if (article.editorialAngle) {
    tags.push(article.editorialAngle);
  }
  
  // Add source name as tag for filtering
  if (article.sourceStory.sourceName) {
    tags.push(article.sourceStory.sourceName.toLowerCase());
  }
  
  // Add quality indicator
  if (article.qualityScore && article.qualityScore >= 8) {
    tags.push('high-quality');
  } else if (article.qualityScore && article.qualityScore < 5) {
    tags.push('needs-review');
  }
  
  // Add word count category
  if (article.wordCount >= 800) {
    tags.push('long-form');
  } else if (article.wordCount >= 400) {
    tags.push('medium-form');
  } else {
    tags.push('short-form');
  }
  
  return tags;
}

/**
 * Generate a cost-efficient article from a story using Gemini-2.5-flash
 */
export async function generateArticle(
  story: IngestedArticle,
  options: ArticleGenerationOptions = {}
): Promise<GeneratedArticle> {
  const {
    targetLength = 600,
    editorialDNA,
    openRouterClient,
    includeEditorialAngle = true,
    focusAreas = [],
    storeInConvex = false
  } = options;

  // Create OpenRouter client if not provided
  const client = openRouterClient || new OpenRouterClient();
  
  // Load editorial DNA if not provided
  const dna = editorialDNA || loadEditorialDNA();
  
  // Apply editorial angle to the story
  const storyWithAngle = includeEditorialAngle ? 
    injectEditorialAngle(story, dna) : 
    story;

  // Extract key information from the story
  const sourceTitle = story.title || 'Breaking News';
  const sourceContent = story.content || story.title || '';
  const sourceUrl = story.url || '';
  const sourceName = story.sourceName || story.source || 'News Source';
  
  // Create focused content excerpt for generation
  const contentExcerpt = sourceContent.length > 1000 ? 
    sourceContent.substring(0, 1000) + '...' : 
    sourceContent;

  // Build comprehensive system prompt for article generation
  const systemPrompt = buildArticleSystemPrompt(dna, targetLength, focusAreas);
  
  // Build user prompt with story details
  const userPrompt = buildArticleUserPrompt(
    sourceTitle,
    contentExcerpt,
    sourceName,
    sourceUrl,
    storyWithAngle.editorialAngle,
    storyWithAngle.editorialPerspective as string[] | undefined
  );

  try {
    // Use OpenRouter to generate the article using Gemini for cost efficiency
    const response = await client.completeTask(
      TaskType.ARTICLE_GENERATION, // Maps to cost-efficient Gemini model
      userPrompt,
      {
        systemPrompt
      }
    );

    // Extract article content from response
    const articleContent = response.content.trim();
    
    // Parse the structured response
    const parsedArticle = parseGeneratedArticle(articleContent, sourceTitle);
    
    // Calculate actual word count
    const actualWordCount = parsedArticle.content.split(/\s+/).length;
    
    // Calculate quality score based on length adherence and structure
    const qualityScore = calculateArticleQuality(
      parsedArticle,
      targetLength,
      sourceContent
    );

    const generatedArticle: GeneratedArticle = {
      title: parsedArticle.title,
      content: parsedArticle.content,
      excerpt: parsedArticle.excerpt,
      wordCount: actualWordCount,
      generationCost: response.cost || 0,
      model: response.model || 'google/gemini-2.0-flash-thinking-exp:free',
      editorialAngle: typeof storyWithAngle.editorialAngle === 'object' ? storyWithAngle.editorialAngle?.primary : storyWithAngle.editorialAngle,
      sourceStory: story,
      generatedAt: new Date(),
      qualityScore
    };

    // Store in Convex if requested
    if (storeInConvex) {
      const articleId = await storeArticleInConvex(generatedArticle);
      console.log(articleId ? `📝 Article "${generatedArticle.title}" stored in Convex` : '⚠️ Failed to store article in Convex');
    }

    return generatedArticle;
    
  } catch (error) {
    console.error('Failed to generate article:', error);
    
    // Return a fallback article if generation fails
    const fallbackContent = generateFallbackArticle(
      sourceTitle,
      contentExcerpt,
      sourceName,
      targetLength
    );
    
    return {
      title: sourceTitle,
      content: fallbackContent.content,
      excerpt: fallbackContent.excerpt,
      wordCount: fallbackContent.content.split(/\s+/).length,
      generationCost: 0,
      model: 'fallback',
      sourceStory: story,
      generatedAt: new Date(),
      qualityScore: 3.0 // Lower quality for fallback
    };
  }
}

/**
 * Build comprehensive system prompt for article generation
 */
function buildArticleSystemPrompt(
  dna: EditorialDNA,
  targetLength: number,
  focusAreas: string[]
): string {
  const values = dna.editorial_dna.values.join(', ');
  const perspectives = dna.editorial_dna.seek.slice(0, 3).join(', ');
  const avoidances = dna.editorial_dna.avoid.slice(0, 2).join(', ');
  
  return `You are an expert journalist writing for a thoughtful, analytical news publication with a focus on technology, climate solutions, and systemic change.

EDITORIAL VALUES: ${values}

PERSPECTIVES TO SEEK: ${perspectives}

PERSPECTIVES TO AVOID: ${avoidances}

${focusAreas.length > 0 ? `FOCUS AREAS: ${focusAreas.join(', ')}` : ''}

ARTICLE REQUIREMENTS:
1. Target length: ${targetLength} words (±50 words acceptable)
2. Professional journalistic tone with analytical depth
3. Structure: Compelling headline, engaging lead, 3-4 body paragraphs, conclusion
4. Include context and broader implications, not just facts
5. Maintain objectivity while reflecting editorial values
6. Provide actionable insights where appropriate
7. Write for an educated, curious audience

FORMAT YOUR RESPONSE AS:
TITLE: [Compelling, specific headline]

EXCERPT: [2-sentence summary highlighting key insight]

ARTICLE:
[Full article content with proper paragraph breaks]

WRITING GUIDELINES:
- Lead with the most important/surprising aspect
- Use active voice and concrete details
- Include relevant context and background
- Connect to larger patterns or implications
- End with forward-looking perspective
- Avoid jargon unless necessary (then explain it)
- Use specific examples and data when available`;
}

/**
 * Build user prompt with story details
 */
function buildArticleUserPrompt(
  title: string,
  content: string,
  sourceName: string,
  sourceUrl: string,
  editorialAngle?: any,
  editorialPerspectives?: string[]
): string {
  const angleText = editorialAngle ? `\n\nEDITORIAL ANGLE: ${editorialAngle.primary} - ${editorialAngle.description}` : '';
  const perspectiveText = editorialPerspectives && editorialPerspectives.length > 0 ? 
    `\n\nEDITORIAL PERSPECTIVES: ${editorialPerspectives.join(', ')}` : '';

  return `Write a comprehensive article based on this source material:

SOURCE: ${sourceName}
ORIGINAL TITLE: ${title}

SOURCE CONTENT:
${content}

${angleText}${perspectiveText}

Transform this source material into a well-researched, insightful article that goes beyond basic reporting to provide analysis, context, and implications. Focus on what this story means for readers and what they should understand about the broader patterns at play.`;
}

/**
 * Parse the generated article response into structured components
 */
function parseGeneratedArticle(
  response: string,
  fallbackTitle: string
): { title: string; excerpt: string; content: string } {
  const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let title = fallbackTitle;
  let excerpt = '';
  let content = '';
  let currentSection = '';
  
  for (const line of lines) {
    if (line.startsWith('TITLE:')) {
      title = line.replace('TITLE:', '').trim();
      currentSection = 'title';
    } else if (line.startsWith('EXCERPT:')) {
      excerpt = line.replace('EXCERPT:', '').trim();
      currentSection = 'excerpt';
    } else if (line.startsWith('ARTICLE:')) {
      currentSection = 'article';
    } else {
      // Add content to the current section
      if (currentSection === 'excerpt' && !excerpt) {
        excerpt = line;
      } else if (currentSection === 'article' || (!currentSection && content)) {
        content += (content ? '\n\n' : '') + line;
      } else if (!currentSection && !content) {
        // Fallback: treat as article content if no clear structure
        content += (content ? '\n\n' : '') + line;
      }
    }
  }
  
  // Ensure we have an excerpt if none was parsed
  if (!excerpt && content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    excerpt = sentences.slice(0, 2).join('. ').trim() + '.';
  }
  
  return { title, excerpt, content };
}

/**
 * Calculate article quality score based on various factors
 */
function calculateArticleQuality(
  article: { title: string; excerpt: string; content: string },
  targetLength: number,
  sourceContent: string
): number {
  let score = 5.0; // Base score
  
  // Length adherence (±50 words is ideal)
  const actualLength = article.content.split(/\s+/).length;
  const lengthDifference = Math.abs(actualLength - targetLength);
  
  if (lengthDifference <= 50) {
    score += 2.0; // Perfect length
  } else if (lengthDifference <= 100) {
    score += 1.0; // Good length
  } else if (lengthDifference <= 150) {
    score += 0.5; // Acceptable length
  } else {
    score -= 1.0; // Poor length adherence
  }
  
  // Structure quality checks
  if (article.title && article.title.length > 10 && article.title.length < 100) {
    score += 1.0; // Good title length
  }
  
  if (article.excerpt && article.excerpt.length > 50 && article.excerpt.length < 200) {
    score += 0.5; // Good excerpt length
  }
  
  // Content quality indicators
  const paragraphs = article.content.split('\n\n').filter(p => p.trim().length > 0);
  if (paragraphs.length >= 3 && paragraphs.length <= 8) {
    score += 1.0; // Good paragraph structure
  }
  
  // Check for analytical depth (presence of analytical keywords)
  const analyticalKeywords = [
    'analysis', 'implications', 'context', 'significance', 'impact',
    'because', 'however', 'furthermore', 'therefore', 'consequently'
  ];
  
  const analyticalCount = analyticalKeywords.filter(keyword => 
    article.content.toLowerCase().includes(keyword)
  ).length;
  
  if (analyticalCount >= 3) {
    score += 1.0; // Good analytical depth
  } else if (analyticalCount >= 1) {
    score += 0.5; // Some analytical depth
  }
  
  // Avoid placeholder text or repetitive content
  if (article.content.includes('[') && article.content.includes(']')) {
    score -= 2.0; // Contains placeholder text
  }
  
  // Ensure score is within bounds
  return Math.max(0, Math.min(score, 10));
}

/**
 * Generate a fallback article if AI generation fails
 */
function generateFallbackArticle(
  title: string,
  content: string,
  sourceName: string,
  targetLength: number
): { content: string; excerpt: string } {
  const wordTarget = Math.max(200, Math.min(targetLength, 400)); // Conservative fallback length
  
  const fallbackContent = `${title}

According to ${sourceName}, this developing story highlights important aspects that warrant attention from our readers.

${content.substring(0, Math.min(content.length, wordTarget * 4))}

This story represents the kind of systematic change and technological development that affects broader patterns in our society. As these developments continue to unfold, understanding their implications becomes increasingly important for making informed decisions.

The broader context of this story connects to ongoing trends that our publication has been tracking. While the immediate details are important, the longer-term patterns and systemic impacts deserve careful consideration.

We will continue monitoring this story as it develops and provide updates when significant new information becomes available.`;

  const excerpt = `${title} - This developing story from ${sourceName} highlights important systematic changes that deserve attention.`;

  return {
    content: fallbackContent,
    excerpt
  };
}

/**
 * Generate multiple articles in batch for cost efficiency
 */
export async function generateArticlesBatch(
  stories: IngestedArticle[],
  options: ArticleGenerationOptions = {}
): Promise<GeneratedArticle[]> {
  const results: GeneratedArticle[] = [];
  const client = options.openRouterClient || new OpenRouterClient();
  
  // Process stories in batches to manage API rate limits
  const batchSize = 5;
  const batches = [];
  
  for (let i = 0; i < stories.length; i += batchSize) {
    batches.push(stories.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    const batchPromises = batch.map(story => 
      generateArticle(story, { ...options, openRouterClient: client })
    );
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to be respectful of API limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Batch generation failed for batch ${batches.indexOf(batch)}:`, error);
      // Continue with next batch even if one fails
    }
  }
  
  return results;
}

/**
 * Interface for article validation results
 */
export interface ArticleValidationResult {
  isValid: boolean;
  overallScore: number;
  issues: string[];
  warnings: string[];
  validationDetails: {
    lengthCheck: {
      passed: boolean;
      actualLength: number;
      minimumRequired: number;
      score: number;
    };
    placeholderCheck: {
      passed: boolean;
      foundPlaceholders: string[];
      score: number;
    };
    structureCheck: {
      passed: boolean;
      hasTitle: boolean;
      hasContent: boolean;
      paragraphCount: number;
      score: number;
    };
    coherenceCheck: {
      passed: boolean;
      sentenceCount: number;
      avgSentenceLength: number;
      score: number;
    };
  };
  recommendations: string[];
}

/**
 * Validate generated article for minimum quality standards
 */
export function validateArticle(
  text: string,
  options: {
    minimumLength?: number;
    minimumParagraphs?: number;
    checkPlaceholders?: boolean;
    strictMode?: boolean;
  } = {}
): ArticleValidationResult {
  const {
    minimumLength = 200,
    minimumParagraphs = 2,
    checkPlaceholders = true,
    strictMode = false
  } = options;

  if (!text || typeof text !== 'string') {
    return {
      isValid: false,
      overallScore: 0,
      issues: ['Invalid input: text must be a non-empty string'],
      warnings: [],
      validationDetails: {
        lengthCheck: { passed: false, actualLength: 0, minimumRequired: minimumLength, score: 0 },
        placeholderCheck: { passed: false, foundPlaceholders: [], score: 0 },
        structureCheck: { passed: false, hasTitle: false, hasContent: false, paragraphCount: 0, score: 0 },
        coherenceCheck: { passed: false, sentenceCount: 0, avgSentenceLength: 0, score: 0 }
      },
      recommendations: ['Provide valid article text for validation']
    };
  }

  const cleanText = text.trim();
  const issues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // 1. Length Validation
  const words = cleanText.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  const lengthCheck = {
    passed: wordCount >= minimumLength,
    actualLength: wordCount,
    minimumRequired: minimumLength,
    score: Math.min((wordCount / minimumLength) * 10, 10)
  };

  if (!lengthCheck.passed) {
    issues.push(`Article too short: ${wordCount} words (minimum: ${minimumLength})`);
    recommendations.push(`Add more content to reach minimum ${minimumLength} words`);
  } else if (wordCount < minimumLength * 1.2) {
    warnings.push(`Article is near minimum length: ${wordCount} words`);
    recommendations.push('Consider adding more detail or context');
  }

  // 2. Placeholder Text Detection
  const placeholderPatterns = [
    /\[.*?\]/g,                    // [placeholder]
    /\{.*?\}/g,                    // {placeholder}
    /\<.*?\>/g,                    // <placeholder>
    /\bTODO\b/gi,                  // TODO
    /\bFIXME\b/gi,                 // FIXME
    /\bTBD\b/gi,                   // TBD
    /\bTBA\b/gi,                   // TBA
    /Lorem ipsum/gi,               // Lorem ipsum
    /dolor sit amet/gi,            // Common placeholder text
    /consectetur adipiscing/gi,    // More Lorem ipsum
    /\bXXX\b/g,                    // XXX placeholders
    /\b_{2,}\b/g,                  // Multiple underscores
    /\b\.{3,}\b/g,                 // Multiple dots as placeholders
  ];

  const foundPlaceholders: string[] = [];
  let placeholderCount = 0;

  if (checkPlaceholders) {
    placeholderPatterns.forEach(pattern => {
      const matches = cleanText.match(pattern);
      if (matches) {
        foundPlaceholders.push(...matches);
        placeholderCount += matches.length;
      }
    });
  }

  const placeholderCheck = {
    passed: placeholderCount === 0,
    foundPlaceholders: [...new Set(foundPlaceholders)], // Remove duplicates
    score: placeholderCount === 0 ? 10 : Math.max(0, 10 - (placeholderCount * 2))
  };

  if (!placeholderCheck.passed) {
    issues.push(`Found ${placeholderCount} placeholder(s): ${foundPlaceholders.slice(0, 3).join(', ')}${foundPlaceholders.length > 3 ? '...' : ''}`);
    recommendations.push('Replace all placeholder text with actual content');
  }

  // 3. Structure Validation
  const lines = cleanText.split('\n').filter(line => line.trim().length > 0);
  const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // Check for basic structure elements
  const hasTitle = lines.length > 0 && lines[0].length > 10 && lines[0].length < 200;
  const hasContent = cleanText.length > (hasTitle ? lines[0].length : 0) + 50;
  const paragraphCount = paragraphs.length;

  const structureCheck = {
    passed: hasContent && paragraphCount >= minimumParagraphs,
    hasTitle,
    hasContent,
    paragraphCount,
    score: (hasContent ? 5 : 0) + (paragraphCount >= minimumParagraphs ? 5 : Math.max(0, paragraphCount * 2))
  };

  if (!hasContent) {
    issues.push('Article appears to lack substantial content');
    recommendations.push('Add meaningful content to the article body');
  }

  if (paragraphCount < minimumParagraphs) {
    issues.push(`Insufficient paragraph structure: ${paragraphCount} paragraphs (minimum: ${minimumParagraphs})`);
    recommendations.push(`Break content into at least ${minimumParagraphs} coherent paragraphs`);
  }

  if (!hasTitle && strictMode) {
    warnings.push('No clear title detected');
    recommendations.push('Consider adding a clear, descriptive title');
  }

  // 4. Coherence and Readability Check
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const sentenceCount = sentences.length;
  const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;

  // Check for extremely short or long sentences (potential coherence issues)
  const veryShortSentences = sentences.filter(s => s.trim().split(/\s+/).length < 5).length;
  const veryLongSentences = sentences.filter(s => s.trim().split(/\s+/).length > 35).length;

  let coherenceScore = 10;
  if (sentenceCount === 0) coherenceScore = 0;
  else {
    // Penalize extremes in sentence length
    coherenceScore -= veryShortSentences * 0.5;
    coherenceScore -= veryLongSentences * 1;
    
    // Ideal average sentence length is 15-25 words
    if (avgWordsPerSentence < 8 || avgWordsPerSentence > 30) {
      coherenceScore -= 2;
    }
  }

  const coherenceCheck = {
    passed: sentenceCount > 0 && veryShortSentences < sentenceCount * 0.3,
    sentenceCount,
    avgSentenceLength: Math.round(avgWordsPerSentence * 10) / 10,
    score: Math.max(0, coherenceScore)
  };

  if (sentenceCount === 0) {
    issues.push('No clear sentences detected in content');
    recommendations.push('Use proper sentence structure with punctuation');
  } else {
    if (veryShortSentences > sentenceCount * 0.2) {
      warnings.push(`${veryShortSentences} very short sentences detected`);
      recommendations.push('Consider combining short sentences for better flow');
    }
    
    if (veryLongSentences > sentenceCount * 0.1) {
      warnings.push(`${veryLongSentences} very long sentences detected`);
      recommendations.push('Break up long sentences for better readability');
    }

    if (avgWordsPerSentence < 8) {
      warnings.push('Average sentence length is very short');
      recommendations.push('Add more detail and complexity to sentences');
    } else if (avgWordsPerSentence > 30) {
      warnings.push('Average sentence length is very long');
      recommendations.push('Break up long sentences for clarity');
    }
  }

  // Calculate overall score (weighted average)
  const weights = {
    lengthCheck: 3.0,      // Most important
    structureCheck: 2.5,   // Very important
    placeholderCheck: 2.0, // Important for quality
    coherenceCheck: 1.5    // Good to have
  };

  const totalWeightedScore = 
    (lengthCheck.score * weights.lengthCheck) +
    (structureCheck.score * weights.structureCheck) +
    (placeholderCheck.score * weights.placeholderCheck) +
    (coherenceCheck.score * weights.coherenceCheck);

  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const overallScore = Math.round((totalWeightedScore / totalWeight) * 10) / 10;

  // Determine if article is valid (configurable threshold)
  const validationThreshold = strictMode ? 7.0 : 6.0;
  const isValid = overallScore >= validationThreshold && issues.length === 0;

  // Add general recommendations based on overall score
  if (overallScore < 5.0) {
    recommendations.push('Article needs significant improvement before publication');
  } else if (overallScore < 7.0) {
    recommendations.push('Article meets basic standards but could be enhanced');
  } else if (overallScore >= 8.5) {
    recommendations.push('Article meets high quality standards');
  }

  return {
    isValid,
    overallScore,
    issues,
    warnings,
    validationDetails: {
      lengthCheck,
      placeholderCheck,
      structureCheck,
      coherenceCheck
    },
    recommendations: [...new Set(recommendations)] // Remove duplicates
  };
}

/**
 * Quick validation check for minimum article standards
 */
export function quickValidateArticle(text: string, minimumLength: number = 200): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const hasPlaceholders = /\[.*?\]|\{.*?\}|\bTODO\b|\bTBD\b/gi.test(text);
  const hasContent = text.trim().length > 50;
  
  return wordCount >= minimumLength && !hasPlaceholders && hasContent;
}

/**
 * Interface for related story matching results
 */
export interface RelatedStoryMatch {
  story: IngestedArticle;
  similarityScore: number;
  topicRelevanceScore: number;
  combinedScore: number;
  matchReason: string;
}

/**
 * Interface for enhanced article with related content
 */
export interface EnhancedArticle extends GeneratedArticle {
  relatedStories: RelatedStoryMatch[];
  hasRelatedSection: boolean;
}

/**
 * Enhance article with related stories section
 */
export function enhanceWithContext(
  article: GeneratedArticle,
  relatedStories: IngestedArticle[],
  options: {
    maxRelatedStories?: number;
    minSimilarityThreshold?: number;
    includeTopicRelevance?: boolean;
    editorialDNA?: EditorialDNA;
  } = {}
): EnhancedArticle {
  const {
    maxRelatedStories = 3,
    minSimilarityThreshold = 0.15, // Lower than deduplication threshold (0.8)
    includeTopicRelevance = true,
    editorialDNA
  } = options;

  if (!article.content || relatedStories.length === 0) {
    return {
      ...article,
      relatedStories: [],
      hasRelatedSection: false
    };
  }

  // Load editorial DNA if not provided
  const dna = editorialDNA || loadEditorialDNA();

  // Find related stories using similarity and topic relevance
  const relatedMatches = findRelatedStories(
    article,
    relatedStories,
    minSimilarityThreshold,
    includeTopicRelevance,
    dna
  );

  // Select top matches
  const topMatches = relatedMatches
    .slice(0, Math.min(maxRelatedStories, relatedMatches.length));

  if (topMatches.length === 0) {
    return {
      ...article,
      relatedStories: [],
      hasRelatedSection: false
    };
  }

  // Format related section
  const relatedSection = formatRelatedSection(topMatches);

  // Enhance article content with related section
  const enhancedContent = article.content + '\n\n' + relatedSection;

  return {
    ...article,
    content: enhancedContent,
    wordCount: enhancedContent.split(/\s+/).length,
    relatedStories: topMatches,
    hasRelatedSection: true
  };
}

/**
 * Find related stories using similarity and topic relevance scoring
 */
function findRelatedStories(
  article: GeneratedArticle,
  candidateStories: IngestedArticle[],
  minSimilarityThreshold: number,
  includeTopicRelevance: boolean,
  editorialDNA: EditorialDNA
): RelatedStoryMatch[] {
  const articleText = `${article.title} ${article.content}`.toLowerCase();
  const matches: RelatedStoryMatch[] = [];

  for (const story of candidateStories) {
    // Skip if story is too similar (likely the source story or duplicate)
    const storyText = `${story.title || ''} ${story.content || ''}`.toLowerCase();
    const similarity = jaccardSimilarity(articleText, storyText);
    
    // Skip if too similar (likely duplicate) or too dissimilar
    if (similarity > 0.7 || similarity < minSimilarityThreshold) {
      continue;
    }

    // Calculate topic relevance if enabled
    let topicRelevanceScore = 0;
    if (includeTopicRelevance) {
      topicRelevanceScore = calculateTopicRelevance(story, editorialDNA.editorial_dna.priorities) / 10;
    }

    // Combined scoring: 60% similarity, 40% topic relevance
    const combinedScore = includeTopicRelevance ? 
      (similarity * 0.6) + (topicRelevanceScore * 0.4) :
      similarity;

    // Determine match reason
    const matchReason = getMatchReason(similarity, topicRelevanceScore, includeTopicRelevance);

    matches.push({
      story,
      similarityScore: Math.round(similarity * 1000) / 1000,
      topicRelevanceScore: Math.round(topicRelevanceScore * 1000) / 1000,
      combinedScore: Math.round(combinedScore * 1000) / 1000,
      matchReason
    });
  }

  // Sort by combined score (descending)
  return matches.sort((a, b) => b.combinedScore - a.combinedScore);
}

/**
 * Determine the reason for story matching
 */
function getMatchReason(
  similarity: number,
  topicRelevance: number,
  includeTopicRelevance: boolean
): string {
  if (!includeTopicRelevance) {
    return similarity > 0.3 ? 'High content similarity' : 'Content similarity';
  }

  if (similarity > 0.4 && topicRelevance > 0.5) {
    return 'Similar content and high topic relevance';
  } else if (similarity > 0.4) {
    return 'High content similarity';
  } else if (topicRelevance > 0.7) {
    return 'High topic relevance';
  } else if (topicRelevance > 0.4) {
    return 'Related topic coverage';
  } else {
    return 'Content similarity';
  }
}

/**
 * Format the related stories section
 */
function formatRelatedSection(matches: RelatedStoryMatch[]): string {
  if (matches.length === 0) return '';

  const relatedLines = ['## Related Stories\n'];

  matches.forEach((match, index) => {
    const story = match.story;
    const title = story.title || 'Related Article';
    const source = story.sourceName || story.source || 'News Source';
    
    // Create a brief description from the story content or use title
    let description = '';
    if (story.content) {
      // Extract first meaningful sentence (avoid very short fragments)
      const sentences = story.content.split(/[.!?]+/).filter(s => s.trim().length > 30);
      description = sentences[0]?.trim() || title;
      
      // Limit description length
      if (description.length > 150) {
        description = description.substring(0, 147) + '...';
      }
    } else {
      description = title;
    }

    // Format the related story entry
    relatedLines.push(
      `**${index + 1}. ${title}** *(${source})*  \n${description}\n`
    );
  });

  return relatedLines.join('\n');
}

/**
 * Find related stories from the same source for additional context
 */
export function findRelatedFromSameSource(
  article: GeneratedArticle,
  sourceStories: IngestedArticle[],
  maxStories: number = 2
): RelatedStoryMatch[] {
  if (!article.sourceStory || sourceStories.length === 0) return [];

  const sourceUrl = article.sourceStory.url;
  const sourceName = article.sourceStory.sourceName || article.sourceStory.source;

  // Filter stories from the same source
  const sameSourceStories = sourceStories.filter(story => 
    story.sourceName === sourceName || story.source === sourceName
  );

  if (sameSourceStories.length === 0) return [];

  // Use standard related story finding but with same-source stories
  const dna = loadEditorialDNA();
  return findRelatedStories(
    article,
    sameSourceStories,
    0.1, // Lower threshold for same-source stories
    true,
    dna
  ).slice(0, maxStories);
}

/**
 * Bulk enhance multiple articles with context
 */
export async function enhanceArticlesBatch(
  articles: GeneratedArticle[],
  allStories: IngestedArticle[],
  options: {
    maxRelatedStories?: number;
    minSimilarityThreshold?: number;
    includeTopicRelevance?: boolean;
    editorialDNA?: EditorialDNA;
  } = {}
): Promise<EnhancedArticle[]> {
  const results: EnhancedArticle[] = [];

  for (const article of articles) {
    // For each article, use all other stories as potential related content
    const candidateStories = allStories.filter(story => {
      // Exclude the source story if it matches
      if (article.sourceStory && story.url === article.sourceStory.url) {
        return false;
      }
      return true;
    });

    const enhancedArticle = enhanceWithContext(article, candidateStories, options);
    results.push(enhancedArticle);

    // Small delay to prevent overwhelming processing
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}