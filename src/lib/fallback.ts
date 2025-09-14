/**
 * Fallback content generation system for Superwire
 * 
 * Provides emergency content generation when main pipeline fails.
 * Uses multi-tier fallback strategy:
 * 1. Free AI model with minimal prompts
 * 2. Template-based generation with source content
 * 3. Static templates as last resort
 * 
 * Based on patterns from:
 * - article.ts fallback generation patterns
 * - brief.ts static template patterns  
 * - openrouter.ts cost-efficient model routing
 */

import { OpenRouterClient, TaskType } from './openrouter';
import { notifyError } from './notifications';
import { ErrorCategory } from './error-handler';
import { ContentType } from './metrics';

/**
 * Fallback content result interface
 */
export interface FallbackContent {
  title: string;
  content: string;
  excerpt: string;
  wordCount: number;
  generationMethod: 'ai-free' | 'ai-cheap' | 'template-source' | 'template-static';
  generationCost: number;
  sources?: string[];
  generatedAt: Date;
  quality: 'minimal' | 'basic' | 'standard';
}

/**
 * Fallback generation options
 */
export interface FallbackOptions {
  targetLength?: number;
  maxCost?: number;
  includeAI?: boolean;
  contentType?: ContentType;
  emergencyMode?: boolean; // Skip AI entirely for fastest generation
}

/**
 * Source content interface for fallback generation
 */
interface SourceContent {
  title: string;
  content: string;
  source: string;
  url?: string;
  timestamp?: string;
}

/**
 * Default fallback configuration
 */
const DEFAULT_FALLBACK_CONFIG = {
  targetLength: 300,
  maxCost: 0.01, // $0.01 maximum cost
  includeAI: true,
  contentType: ContentType.BRIEF,
  emergencyMode: false
};

/**
 * Static content templates for different scenarios
 */
const STATIC_TEMPLATES = {
  daily_brief: [
    "Today's developments continue to shape our evolving landscape across multiple sectors.",
    "Our coverage tracks important patterns in technology, policy, and social change that affect how we understand current events.",
    "Key areas of focus include emerging trends that deserve continued attention and analysis.",
    "These developments represent the kind of systematic changes that impact broader societal patterns.",
    "The stories we're following highlight the interconnected nature of current events and their longer-term implications.",
    "We will continue monitoring these trends and provide updates as new information becomes available."
  ],
  
  technical_issues: [
    "We're currently experiencing technical difficulties with our content generation system.",
    "Our team is working to restore full service as quickly as possible.",
    "In the meantime, we're providing this brief update to keep our readers informed.",
    "We appreciate your patience as we resolve these issues.",
    "Normal content delivery will resume once our systems are fully operational.",
    "Thank you for your continued support and understanding."
  ],
  
  budget_exhausted: [
    "Today's content generation has reached our daily budget limits.",
    "This constraint helps us maintain sustainable operations while delivering quality content.",
    "We're providing this brief summary of key developments from available sources.",
    "Tomorrow's full content generation will resume with our refreshed daily budget.",
    "We continue to monitor important stories for tomorrow's comprehensive coverage.",
    "Your understanding helps us maintain responsible resource management."
  ]
};

/**
 * Static fallback content generation (most reliable, zero cost)
 */
function generateStaticFallbackContent(
  reason: 'daily_brief' | 'technical_issues' | 'budget_exhausted' = 'daily_brief',
  targetLength: number = 300
): FallbackContent {
  const today = new Date().toLocaleDateString();
  const template = STATIC_TEMPLATES[reason];
  
  // Create content from template with appropriate length
  const sentences = template.slice(0, Math.ceil(targetLength / 50)); // ~50 words per sentence
  const content = sentences.join('\n\n');
  
  const titles = {
    daily_brief: `Daily Brief: ${today}`,
    technical_issues: `Service Update: ${today}`,
    budget_exhausted: `Budget Status Update: ${today}`
  };
  
  const excerpts = {
    daily_brief: `Today's brief covers key developments across major news areas.`,
    technical_issues: `Service update regarding temporary technical difficulties.`,
    budget_exhausted: `Daily budget status update and content delivery information.`
  };

  return {
    title: titles[reason],
    content,
    excerpt: excerpts[reason],
    wordCount: content.split(' ').length,
    generationMethod: 'template-static',
    generationCost: 0,
    generatedAt: new Date(),
    quality: 'minimal'
  };
}

/**
 * Template-based generation with source content (low cost, higher quality)
 */
function generateTemplateWithSources(
  sources: SourceContent[],
  targetLength: number = 300
): FallbackContent {
  const today = new Date().toLocaleDateString();
  const sourceNames = [...new Set(sources.map(s => s.source))];
  const topStories = sources.slice(0, 3);

  const title = `News Update: ${today}`;
  
  let content = `Today's coverage includes ${sources.length} stories from ${sourceNames.join(', ')}.

KEY DEVELOPMENTS:
${topStories.map(story => `• ${story.title}`).join('\n')}

OVERVIEW:
The day's reporting covers developments across multiple sectors. These stories reflect ongoing trends and emerging issues that warrant attention.

${topStories.length > 0 ? 
  `Major focus areas include developments around ${topStories[0].title.toLowerCase()}.` : 
  'Coverage spans various topics of current interest.'}

IMPLICATIONS:
These developments continue to shape the broader landscape and deserve monitoring for their potential long-term effects.

SOURCES:
Coverage based on reporting from ${sourceNames.join(', ')} and other news sources.`;

  // Trim to target length if too long
  const words = content.split(' ');
  if (words.length > targetLength) {
    const trimmed = words.slice(0, targetLength).join(' ');
    content = trimmed + (trimmed.endsWith('.') ? '' : '...');
  }

  return {
    title,
    content,
    excerpt: `Today's update covers ${sources.length} stories highlighting key developments from major sources.`,
    wordCount: content.split(' ').length,
    generationMethod: 'template-source',
    generationCost: 0,
    sources: sourceNames,
    generatedAt: new Date(),
    quality: 'basic'
  };
}

/**
 * AI-based fallback using free model (zero cost, good quality)
 */
async function generateAIFallback(
  sources: SourceContent[],
  targetLength: number = 300,
  maxCost: number = 0.01
): Promise<FallbackContent> {
  try {
    const client = new OpenRouterClient();
    const sourceText = sources.slice(0, 3).map(s => `${s.title} (${s.source})`).join('\n');
    
    const prompt = `Create a brief news summary (${targetLength} words) from these headlines:

${sourceText}

Format as a professional daily brief with:
1. Brief intro mentioning today's key developments
2. 2-3 bullet points for main stories
3. Short conclusion about ongoing trends

Keep it factual, professional, and concise. Focus on the broader patterns and implications.`;

    console.log('🤖 Attempting AI fallback generation with free model...');
    
    const result = await client.completeTask(
      TaskType.SUMMARIZATION,
      prompt,
      {
        modelOverride: 'google/gemini-2.0-flash-thinking-exp:free', // Free model
        maxTokens: Math.min(targetLength * 1.5, 500),
        temperature: 0.3, // Low temperature for reliability
        trackCosts: true
      }
    );

    // Check cost (should be $0 for free model)
    if (result.cost && result.cost > maxCost) {
      console.warn(`⚠️ AI fallback exceeded cost limit: $${result.cost.toFixed(4)}`);
      throw new Error('Cost exceeded for fallback generation');
    }

    const today = new Date().toLocaleDateString();
    const wordCount = (result.content || '').split(' ').length;

    return {
      title: `AI Brief: ${today}`,
      content: result.content || '',
      excerpt: `AI-generated brief covering today's key developments from major sources.`,
      wordCount,
      generationMethod: 'ai-free',
      generationCost: result.cost || 0,
      sources: [...new Set(sources.map(s => s.source))],
      generatedAt: new Date(),
      quality: 'standard'
    };

  } catch (error) {
    console.warn('⚠️ AI fallback generation failed:', error);
    throw error;
  }
}

/**
 * Main fallback content generation function
 * Implements multi-tier fallback strategy
 */
export async function generateFallbackContent(
  sources?: SourceContent[],
  options: FallbackOptions = {}
): Promise<FallbackContent> {
  const config = { ...DEFAULT_FALLBACK_CONFIG, ...options };
  
  console.log(`🆘 Generating fallback content (method: ${config.emergencyMode ? 'emergency' : 'standard'})`);
  
  // Emergency mode: skip AI entirely for fastest generation
  if (config.emergencyMode) {
    console.log('⚡ Emergency mode: using static template');
    return generateStaticFallbackContent('technical_issues', config.targetLength);
  }

  // Tier 1: Try AI with free model (if enabled and sources available)
  if (config.includeAI && sources && sources.length > 0) {
    try {
      console.log('🤖 Tier 1: Attempting AI fallback with free model...');
      const result = await generateAIFallback(sources, config.targetLength, config.maxCost);
      
      console.log(`✅ AI fallback successful: ${result.wordCount} words, $${result.generationCost.toFixed(4)}`);
      return result;
      
    } catch (error) {
      console.warn('⚠️ Tier 1 AI fallback failed, trying Tier 2');
      
      // Log AI failure for monitoring
      await notifyError(
        `AI fallback generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'fallback-generation',
        'generateAIFallback',
        ErrorCategory.API_ERROR
      );
    }
  }

  // Tier 2: Template-based with source content (if sources available)
  if (sources && sources.length > 0) {
    console.log('📝 Tier 2: Using template with source content...');
    const result = generateTemplateWithSources(sources, config.targetLength);
    
    console.log(`✅ Template fallback successful: ${result.wordCount} words`);
    return result;
  }

  // Tier 3: Static template (last resort, always works)
  console.log('📋 Tier 3: Using static template (last resort)...');
  const reason = config.maxCost <= 0 ? 'budget_exhausted' : 'daily_brief';
  const result = generateStaticFallbackContent(reason, config.targetLength);
  
  console.log(`✅ Static fallback successful: ${result.wordCount} words`);
  return result;
}

/**
 * Specialized fallback functions for different scenarios
 */

/**
 * Generate emergency content when systems are down
 */
export async function generateEmergencyContent(
  targetLength: number = 200
): Promise<FallbackContent> {
  return generateFallbackContent(undefined, {
    targetLength,
    emergencyMode: true,
    includeAI: false,
    maxCost: 0
  });
}

/**
 * Generate budget-conscious fallback when costs are too high
 */
export async function generateBudgetFallback(
  sources?: SourceContent[],
  targetLength: number = 300
): Promise<FallbackContent> {
  return generateFallbackContent(sources, {
    targetLength,
    includeAI: false, // Skip AI to avoid costs
    maxCost: 0
  });
}

/**
 * Generate minimal content from RSS feeds only (no processing)
 */
export async function generateMinimalFromFeeds(
  sources: SourceContent[],
  targetLength: number = 250
): Promise<FallbackContent> {
  return generateFallbackContent(sources, {
    targetLength,
    includeAI: false,
    contentType: ContentType.BRIEF,
    maxCost: 0
  });
}

/**
 * Test fallback generation system
 */
export async function testFallbackGeneration(): Promise<boolean> {
  console.log('🧪 Testing fallback generation system...');
  
  try {
    // Test static fallback (should always work)
    const staticResult = await generateFallbackContent(undefined, {
      emergencyMode: true,
      targetLength: 200
    });
    console.log(`✓ Static fallback: ${staticResult.generationMethod} (${staticResult.wordCount} words)`);

    // Test with mock sources
    const mockSources: SourceContent[] = [
      {
        title: 'Tech Innovation Continues to Shape Markets',
        content: 'Recent developments in technology sector...',
        source: 'TechNews'
      },
      {
        title: 'Policy Changes Affect Economic Outlook',
        content: 'New policy announcements have implications...',
        source: 'PolicyWatch'
      }
    ];

    const templateResult = await generateFallbackContent(mockSources, {
      includeAI: false,
      targetLength: 300
    });
    console.log(`✓ Template fallback: ${templateResult.generationMethod} (${templateResult.wordCount} words)`);

    // Test AI fallback (may fail if free model unavailable, that's ok)
    try {
      const aiResult = await generateFallbackContent(mockSources, {
        includeAI: true,
        targetLength: 200,
        maxCost: 0.01
      });
      console.log(`✓ AI fallback: ${aiResult.generationMethod} (${aiResult.wordCount} words, $${aiResult.generationCost.toFixed(4)})`);
    } catch (error) {
      console.log(`⚠️ AI fallback unavailable (expected in test environment): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('✅ Fallback generation tests completed successfully');
    return true;

  } catch (error) {
    console.error('❌ Fallback generation tests failed:', error);
    return false;
  }
}

/**
 * Get fallback content generation statistics
 */
export interface FallbackStats {
  methodUsage: Record<string, number>;
  averageWordCount: number;
  totalGenerations: number;
  costSaved: number; // Estimated cost saved by using fallback vs normal generation
}

let fallbackStats: FallbackStats = {
  methodUsage: {},
  averageWordCount: 0,
  totalGenerations: 0,
  costSaved: 0
};

/**
 * Track fallback usage for analysis
 */
export function trackFallbackUsage(result: FallbackContent, estimatedNormalCost: number = 0.50): void {
  fallbackStats.totalGenerations++;
  fallbackStats.methodUsage[result.generationMethod] = (fallbackStats.methodUsage[result.generationMethod] || 0) + 1;
  
  const totalWords = (fallbackStats.averageWordCount * (fallbackStats.totalGenerations - 1)) + result.wordCount;
  fallbackStats.averageWordCount = totalWords / fallbackStats.totalGenerations;
  
  fallbackStats.costSaved += (estimatedNormalCost - result.generationCost);
  
  console.log(`📊 Fallback usage: ${result.generationMethod} (+$${(estimatedNormalCost - result.generationCost).toFixed(4)} saved)`);
}

/**
 * Get current fallback statistics
 */
export function getFallbackStats(): FallbackStats {
  return { ...fallbackStats };
}