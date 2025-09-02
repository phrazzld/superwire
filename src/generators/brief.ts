import { OpenRouterClient, TaskType } from '../lib/openrouter';
import { IngestedArticle } from '../lib/ingestion';
import { EditorialDNA, loadEditorialDNA } from '../lib/editorial';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

/**
 * Interface for generated daily brief results
 */
export interface GeneratedBrief {
  title: string;
  content: string;
  excerpt: string;
  wordCount: number;
  generationCost: number;
  model: string;
  sourceStories: IngestedArticle[];
  generatedAt: Date;
  qualityScore?: number;
  keyInsights: string[];
  topicBreakdown: { topic: string; count: number }[];
}

/**
 * Interface for daily brief generation options
 */
export interface BriefGenerationOptions {
  targetLength?: number; // Target word count (default: 500)
  editorialDNA?: EditorialDNA;
  openRouterClient?: OpenRouterClient;
  storeInConvex?: boolean;
  maxTopicsToHighlight?: number;
  includeSourceStats?: boolean;
}

/**
 * Generate a daily brief summarizing the day's coverage
 */
export async function generateDailyBrief(
  allContent: IngestedArticle[],
  options: BriefGenerationOptions = {}
): Promise<GeneratedBrief> {
  const {
    targetLength = 500,
    editorialDNA,
    openRouterClient,
    storeInConvex = false,
    maxTopicsToHighlight = 5,
    includeSourceStats = true
  } = options;

  if (!allContent || allContent.length === 0) {
    throw new Error('Cannot generate daily brief: no content provided');
  }

  // Create OpenRouter client if not provided
  const client = openRouterClient || new OpenRouterClient();
  
  // Load editorial DNA
  const dna = editorialDNA || loadEditorialDNA();
  
  // Extract key insights and synthesize content
  const keyInsights = extractKeyPoints(allContent);
  const topicBreakdown = analyzeTopicBreakdown(allContent, maxTopicsToHighlight);
  const synthesizedContext = synthesizeDailyContent(allContent);
  
  // Build system and user prompts
  const systemPrompt = buildBriefSystemPrompt(dna, targetLength, includeSourceStats);
  const userPrompt = buildBriefUserPrompt(synthesizedContext, allContent, keyInsights, topicBreakdown);

  try {
    // Use OpenRouter with Claude 3.5 Sonnet for summarization
    const response = await client.completeTask(
      TaskType.SUMMARIZATION, // Maps to Claude 3.5 Sonnet for cost efficiency
      userPrompt,
      {
        systemPrompt,
        temperature: 0.3, // Lower temperature for factual summarization
        maxTokens: Math.round(targetLength * 1.2), // Allow slight overage
      }
    );

    // Extract brief content from response
    const briefContent = response.content.trim();
    
    // Parse the structured response
    const parsedBrief = parseGeneratedBrief(briefContent, `Daily Brief: ${new Date().toLocaleDateString()}`);
    
    // Calculate actual word count
    const actualWordCount = parsedBrief.content.split(/\s+/).length;
    
    // Calculate quality score
    const qualityScore = calculateBriefQuality(
      parsedBrief,
      targetLength,
      allContent,
      keyInsights
    );

    const generatedBrief: GeneratedBrief = {
      title: parsedBrief.title,
      content: parsedBrief.content,
      excerpt: parsedBrief.excerpt,
      wordCount: actualWordCount,
      generationCost: response.cost || 0,
      model: response.model || 'anthropic/claude-3.5-sonnet',
      sourceStories: allContent,
      generatedAt: new Date(),
      qualityScore,
      keyInsights,
      topicBreakdown
    };

    // Store in Convex if requested
    if (storeInConvex) {
      const briefId = await storeBriefInConvex(generatedBrief);
      console.log(briefId ? `📄 Daily Brief stored in Convex` : '⚠️ Failed to store brief in Convex');
    }

    console.log(`📄 Generated Daily Brief: ${actualWordCount} words from ${allContent.length} stories`);
    return generatedBrief;
    
  } catch (error) {
    console.error('Failed to generate daily brief:', error);
    
    // Return a fallback brief if generation fails
    const fallbackContent = generateFallbackBrief(allContent, targetLength, keyInsights);
    
    return {
      title: fallbackContent.title,
      content: fallbackContent.content,
      excerpt: fallbackContent.excerpt,
      wordCount: fallbackContent.content.split(/\s+/).length,
      generationCost: 0,
      model: 'fallback',
      sourceStories: allContent,
      generatedAt: new Date(),
      qualityScore: 4.0, // Lower quality for fallback
      keyInsights,
      topicBreakdown
    };
  }
}

/**
 * Extract 3-5 key points from the day's major stories
 */
export function extractKeyPoints(content: IngestedArticle[], maxPoints: number = 5): string[] {
  if (!content || content.length === 0) return [];
  
  // Sort stories by importance (if available) or title length as proxy
  const sortedStories = [...content].sort((a, b) => {
    // Use editorial score if available, otherwise length of content
    const scoreA = (a as any).editorialScore || a.content?.length || a.title?.length || 0;
    const scoreB = (b as any).editorialScore || b.content?.length || b.title?.length || 0;
    return scoreB - scoreA;
  });
  
  const keyPoints: string[] = [];
  
  // Extract key points from top stories
  sortedStories.slice(0, maxPoints).forEach((story, index) => {
    if (story.title) {
      // Create bullet point from title and first sentence of content
      const firstSentence = story.content?.split(/[.!?]/)[0]?.trim() || '';
      const point = firstSentence.length > 20 && firstSentence.length < 200 
        ? `${story.title}: ${firstSentence}.`
        : story.title;
      
      keyPoints.push(point);
    }
  });
  
  return keyPoints.slice(0, maxPoints);
}

/**
 * Generate a 200-word executive summary for the brief opener
 */
export function generateExecutiveSummary(stories: IngestedArticle[], maxLength: number = 200): string {
  if (!stories || stories.length === 0) {
    return "No stories available for today's summary.";
  }
  
  const totalStories = stories.length;
  const sources = [...new Set(stories.map(s => s.sourceName || s.source).filter(Boolean))];
  
  // Identify major themes
  const topicCounts = analyzeTopicBreakdown(stories, 3);
  const majorTopics = topicCounts.map(t => t.topic).join(', ');
  
  // Create executive summary
  let summary = `Today's coverage spans ${totalStories} stories from ${sources.length} sources, `;
  
  if (majorTopics) {
    summary += `with major focus on ${majorTopics}. `;
  }
  
  // Add key developments
  const keyStory = stories[0];
  if (keyStory?.title) {
    summary += `Key developments include ${keyStory.title.toLowerCase()}`;
    
    if (stories.length > 1) {
      const secondStory = stories[1];
      if (secondStory?.title) {
        summary += ` and ${secondStory.title.toLowerCase()}`;
      }
    }
    summary += '. ';
  }
  
  summary += `These stories reflect ongoing trends that warrant attention for their potential implications.`;
  
  // Truncate if too long
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + '...';
  }
  
  return summary;
}

/**
 * Analyze topic breakdown from content
 */
function analyzeTopicBreakdown(content: IngestedArticle[], maxTopics: number): { topic: string; count: number }[] {
  const topicKeywords: { [key: string]: string[] } = {
    'Technology': ['ai', 'artificial intelligence', 'tech', 'digital', 'software', 'data', 'cyber'],
    'Politics': ['government', 'election', 'policy', 'congress', 'senate', 'political', 'vote'],
    'Economy': ['economic', 'market', 'business', 'financial', 'trade', 'inflation', 'gdp'],
    'Health': ['health', 'medical', 'hospital', 'disease', 'treatment', 'vaccine', 'care'],
    'Climate': ['climate', 'environment', 'renewable', 'emissions', 'weather', 'green'],
    'International': ['global', 'international', 'world', 'foreign', 'country', 'nation'],
    'Social': ['social', 'community', 'people', 'society', 'cultural', 'rights']
  };
  
  const topicCounts: { [key: string]: number } = {};
  
  // Initialize topic counts
  Object.keys(topicKeywords).forEach(topic => {
    topicCounts[topic] = 0;
  });
  
  // Count topic mentions in content
  content.forEach(story => {
    const text = `${story.title || ''} ${story.content || ''}`.toLowerCase();
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      topicCounts[topic] += matches;
    });
  });
  
  // Convert to array and sort by count
  const topicArray = Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxTopics);
    
  return topicArray;
}

/**
 * Synthesize all daily content into coherent context for brief generation
 */
function synthesizeDailyContent(content: IngestedArticle[]): string {
  let synthesis = `DAILY CONTENT SYNTHESIS (${content.length} stories):\n\n`;
  
  // Group by source for better organization
  const sourceGroups: { [key: string]: IngestedArticle[] } = {};
  content.forEach(story => {
    const source = story.sourceName || story.source || 'Unknown';
    if (!sourceGroups[source]) {
      sourceGroups[source] = [];
    }
    sourceGroups[source].push(story);
  });
  
  // Add source breakdown
  synthesis += `SOURCE BREAKDOWN:\n`;
  Object.entries(sourceGroups).forEach(([source, stories]) => {
    synthesis += `- ${source}: ${stories.length} stories\n`;
  });
  synthesis += `\n`;
  
  // Add story summaries (limit to preserve token usage)
  synthesis += `STORY SUMMARIES:\n`;
  content.slice(0, 20).forEach((story, index) => { // Limit to 20 stories for token efficiency
    synthesis += `${index + 1}. "${story.title || 'Untitled'}" (${story.sourceName || 'Unknown'})\n`;
    const preview = story.content?.substring(0, 150) || 'No content available';
    synthesis += `   ${preview}...\n\n`;
  });
  
  if (content.length > 20) {
    synthesis += `... and ${content.length - 20} additional stories\n`;
  }
  
  return synthesis;
}

/**
 * Build system prompt for daily brief generation
 */
function buildBriefSystemPrompt(
  dna: EditorialDNA,
  targetLength: number,
  includeSourceStats: boolean
): string {
  const values = dna.editorial_dna.values.join(', ');
  const perspectives = dna.editorial_dna.seek.slice(0, 3).join(', ');
  
  return `You are an expert news editor writing a daily brief that synthesizes the day's most important developments into a concise, actionable summary for busy readers.

EDITORIAL VALUES: ${values}

PERSPECTIVES TO EMPHASIZE: ${perspectives}

DAILY BRIEF REQUIREMENTS:
1. Target length: ${targetLength} words (concise yet comprehensive)
2. Executive summary style - focus on what matters most
3. Synthesize multiple stories into coherent narrative themes
4. Highlight key insights and implications readers need to know
5. Present information in scannable, digestible format
6. Connect dots between related developments
7. Forward-looking perspective on what these stories mean
${includeSourceStats ? '8. Include brief source attribution where relevant' : ''}

STRUCTURE YOUR RESPONSE AS:
TITLE: [Compelling daily brief headline reflecting the day's major theme]

EXCERPT: [2-sentence summary of the day's most important developments]

CONTENT:
[Daily brief organized as:
- Opening paragraph: Key theme and major developments
- 2-3 bullet sections covering main topic areas
- Each section: brief context + key developments + why it matters
- Closing paragraph: Forward-looking synthesis and implications]

WRITING STYLE:
- Clear, direct, executive summary tone
- Bullet points for key developments within sections
- Emphasis on "what this means" rather than just "what happened"
- Professional but accessible language
- Focus on actionability and implications`;
}

/**
 * Build user prompt with synthesized daily content
 */
function buildBriefUserPrompt(
  synthesizedContext: string,
  stories: IngestedArticle[],
  keyInsights: string[],
  topicBreakdown: { topic: string; count: number }[]
): string {
  const storyCount = stories.length;
  const sources = [...new Set(stories.map(s => s.sourceName || s.source).filter(Boolean))];
  const majorTopics = topicBreakdown.slice(0, 3).map(t => `${t.topic} (${t.count})`).join(', ');

  return `Create a daily brief from today's ${storyCount} stories across ${sources.length} sources.

MAJOR TOPICS: ${majorTopics}

KEY INSIGHTS TO HIGHLIGHT:
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

${synthesizedContext}

Your task is to synthesize this content into a daily brief that:
1. Identifies the 2-3 most important themes of the day
2. Explains why these developments matter to readers
3. Connects related stories into coherent narratives
4. Provides actionable insights about implications and next steps
5. Serves as an executive summary for busy professionals

Focus on synthesis over summary - help readers understand not just what happened, but what it means and why they should care.`;
}

/**
 * Parse the generated brief response into structured components
 */
function parseGeneratedBrief(
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
    } else if (line.startsWith('CONTENT:')) {
      currentSection = 'content';
    } else {
      // Add content to the current section
      if (currentSection === 'excerpt' && !excerpt) {
        excerpt = line;
      } else if (currentSection === 'content' || (!currentSection && content)) {
        content += (content ? '\n\n' : '') + line;
      } else if (!currentSection && !content) {
        // Fallback: treat as content if no clear structure
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
 * Calculate brief quality score based on various factors
 */
function calculateBriefQuality(
  brief: { title: string; excerpt: string; content: string },
  targetLength: number,
  sourceStories: IngestedArticle[],
  keyInsights: string[]
): number {
  let score = 5.0; // Base score
  
  // Length adherence (more flexible for briefs)
  const actualLength = brief.content.split(/\s+/).length;
  const lengthDifference = Math.abs(actualLength - targetLength);
  
  if (lengthDifference <= 75) {
    score += 2.0; // Perfect length for brief
  } else if (lengthDifference <= 150) {
    score += 1.5; // Good length
  } else if (lengthDifference <= 200) {
    score += 1.0; // Acceptable length
  }
  
  // Structure quality checks
  if (brief.title && brief.title.length > 15 && brief.title.length < 100) {
    score += 1.0; // Good title length for daily brief
  }
  
  if (brief.excerpt && brief.excerpt.length > 60 && brief.excerpt.length < 200) {
    score += 0.5; // Good excerpt length
  }
  
  // Content quality indicators for daily briefs
  const paragraphs = brief.content.split('\n\n').filter(p => p.trim().length > 0);
  if (paragraphs.length >= 3 && paragraphs.length <= 7) {
    score += 1.0; // Good paragraph structure for brief
  }
  
  // Check for synthesis and insight indicators
  const synthesisKeywords = [
    'implications', 'means that', 'suggests', 'indicates', 'reveals',
    'pattern', 'trend', 'development', 'theme', 'broader',
    'connects', 'related', 'overall', 'key insight', 'important'
  ];
  
  const synthesisCount = synthesisKeywords.filter(keyword => 
    brief.content.toLowerCase().includes(keyword)
  ).length;
  
  if (synthesisCount >= 5) {
    score += 1.5; // Strong synthesis
  } else if (synthesisCount >= 3) {
    score += 1.0; // Good synthesis
  }
  
  // Check for actionability indicators
  const actionabilityKeywords = [
    'what this means', 'implications', 'next steps', 'to watch',
    'important because', 'why this matters', 'going forward'
  ];
  
  const actionabilityCount = actionabilityKeywords.filter(keyword =>
    brief.content.toLowerCase().includes(keyword)
  ).length;
  
  if (actionabilityCount >= 2) {
    score += 1.0; // Good actionability
  }
  
  // Penalty for placeholder text
  if (brief.content.includes('[') && brief.content.includes(']')) {
    score -= 2.0; // Contains placeholder text
  }
  
  // Ensure score is within bounds
  return Math.max(0, Math.min(score, 10));
}

/**
 * Generate a fallback brief if AI generation fails
 */
function generateFallbackBrief(
  stories: IngestedArticle[],
  targetLength: number,
  keyInsights: string[]
): { title: string; content: string; excerpt: string } {
  const today = new Date().toLocaleDateString();
  const storyCount = stories.length;
  const sources = [...new Set(stories.map(s => s.sourceName || s.source).filter(Boolean))];
  
  const fallbackTitle = `Daily Brief: ${today}`;
  
  const fallbackContent = `Today's coverage includes ${storyCount} stories from ${sources.join(', ')} and other sources.

KEY DEVELOPMENTS:
${keyInsights.slice(0, 3).map(insight => `• ${insight}`).join('\n')}

OVERVIEW:
The day's reporting covers a range of important developments across multiple sectors. These stories reflect ongoing trends and emerging issues that deserve attention.

${stories.length > 0 && stories[0].title ? 
  `Major focus areas include developments around ${stories[0].title.toLowerCase()}.` : 
  'Coverage spans various topics of current interest.'}

IMPLICATIONS:
These developments continue to shape the broader landscape and warrant monitoring for their potential long-term effects on policy, markets, and society.

This brief synthesizes the key points from today's coverage to help readers stay informed on the most important developments.`;

  const fallbackExcerpt = `Today's brief covers ${storyCount} stories highlighting key developments across major news sources.`;
  
  return {
    title: fallbackTitle,
    content: fallbackContent,
    excerpt: fallbackExcerpt
  };
}

/**
 * Store generated brief in Convex database (using articles table with BRIEF prefix)
 */
export async function storeBriefInConvex(brief: GeneratedBrief): Promise<string | null> {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    
    if (!convexUrl) {
      console.warn('⚠️ NEXT_PUBLIC_CONVEX_URL not configured, skipping brief storage');
      return null;
    }

    // Initialize Convex client
    const client = new ConvexHttpClient(convexUrl);

    // Transform GeneratedBrief to Convex articles format
    const convexArticle = {
      date: brief.generatedAt.toISOString().split('T')[0],
      headline: `[BRIEF] ${brief.title}`,
      content: `${brief.excerpt}\n\n${brief.content}`,
      sources: extractSourcesFromBrief(brief),
      model: brief.model,
      costs: {
        inputTokens: 0, // OpenRouter doesn't provide token breakdown yet
        outputTokens: 0,
        totalCost: brief.generationCost,
      },
      editorialScore: brief.qualityScore,
      tags: createTagsFromBrief(brief),
    };

    // Store the brief in Convex
    const articleId = await client.mutation(api.functions.storeArticle, convexArticle);
    
    console.log(`✅ Daily Brief stored in Convex with ID: ${articleId}`);
    return articleId;

  } catch (error) {
    console.error('❌ Failed to store brief in Convex:', error);
    return null;
  }
}

/**
 * Extract source information from GeneratedBrief for Convex storage
 */
function extractSourcesFromBrief(brief: GeneratedBrief): string[] {
  const sources: Set<string> = new Set();
  
  // Add all source stories
  brief.sourceStories.forEach(story => {
    if (story.sourceName) sources.add(story.sourceName);
    if (story.source && story.source !== story.sourceName) sources.add(story.source);
  });
  
  // Add brief type as source indicator
  sources.add('Daily Brief Synthesis');
  
  // Fallback if no sources
  if (sources.size === 1) sources.add('Multiple Sources');
  
  return [...sources];
}

/**
 * Create tags array from brief metadata for searchability
 */
function createTagsFromBrief(brief: GeneratedBrief): string[] {
  const tags: string[] = [];
  
  // Add brief identifier
  tags.push('daily-brief', 'synthesis');
  
  // Add date-based tags
  const date = new Date(brief.generatedAt);
  tags.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  
  // Add quality indicator
  if (brief.qualityScore && brief.qualityScore >= 8) {
    tags.push('high-quality');
  } else if (brief.qualityScore && brief.qualityScore < 5) {
    tags.push('needs-review');
  }
  
  // Add length category
  if (brief.wordCount >= 600) {
    tags.push('comprehensive-brief');
  } else if (brief.wordCount >= 400) {
    tags.push('standard-brief');
  } else {
    tags.push('short-brief');
  }
  
  // Add source count indicator
  const sourceCount = [...new Set(brief.sourceStories.map(s => s.sourceName || s.source))].length;
  if (sourceCount >= 5) {
    tags.push('multi-source');
  }
  
  // Add top topics as tags
  brief.topicBreakdown.slice(0, 3).forEach(topic => {
    tags.push(topic.topic.toLowerCase().replace(/\s+/g, '-'));
  });
  
  return tags;
}

/**
 * Format brief output for structured display
 */
export function formatBrief(
  summary: string,
  bulletPoints: string[],
  quickTakes: string[]
): string {
  let formattedBrief = `${summary}\n\n`;
  
  if (bulletPoints.length > 0) {
    formattedBrief += `KEY POINTS:\n`;
    bulletPoints.forEach(point => {
      formattedBrief += `• ${point}\n`;
    });
    formattedBrief += `\n`;
  }
  
  if (quickTakes.length > 0) {
    formattedBrief += `QUICK TAKES:\n`;
    quickTakes.forEach(take => {
      formattedBrief += `→ ${take}\n`;
    });
  }
  
  return formattedBrief.trim();
}

/**
 * Quick validation check for minimum brief standards
 */
export function quickValidateBrief(text: string, minimumLength: number = 300): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const hasPlaceholders = /\[.*?\]|\{.*?\}|\bTODO\b|\bTBD\b/gi.test(text);
  const hasSynthesis = /\b(implications|means|suggests|reveals|pattern|trend)\b/gi.test(text);
  const hasContent = text.trim().length > 200;
  
  return wordCount >= minimumLength && !hasPlaceholders && hasContent && hasSynthesis;
}