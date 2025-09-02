import { OpenRouterClient, TaskType, logOpEdCostAnalysis, shouldLimitOpEdGeneration } from '../lib/openrouter';
import { IngestedArticle } from '../lib/ingestion';
import { EditorialDNA, loadEditorialDNA, injectEditorialAngle, calculateStoryImportance } from '../lib/editorial';
import { Host } from '../lib/hosts';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

/**
 * Interface for generated op-ed results
 */
export interface GeneratedOpEd {
  title: string;
  content: string;
  excerpt: string;
  wordCount: number;
  generationCost: number;
  model: string;
  editorialAngle?: string;
  sourceStories: IngestedArticle[];
  generatedAt: Date;
  qualityScore?: number;
  opinionType: 'analysis' | 'commentary' | 'editorial' | 'perspective';
  hostPersonality: string;
  thesis?: string; // Main argument of the op-ed
}

/**
 * Interface for op-ed generation options
 */
export interface OpEdGenerationOptions {
  targetLength?: number; // Target word count (default: 1000)
  editorialDNA?: EditorialDNA;
  openRouterClient?: OpenRouterClient;
  opinionType?: 'analysis' | 'commentary' | 'editorial' | 'perspective';
  storeInConvex?: boolean;
  includeEditorialAngle?: boolean;
  focusAreas?: string[];
}

/**
 * Interface for op-ed topic selection scoring
 */
export interface OpEdTopicScore {
  story: IngestedArticle;
  opinionScore: number;
  controversyScore: number;
  synthesisScore: number;
  combinedScore: number;
  selectionReason: string;
}

/**
 * Select the most controversial and important topics for op-ed generation
 */
export function selectOpEdTopics(
  stories: IngestedArticle[], 
  limit: number = 2,
  editorialDNA?: EditorialDNA
): IngestedArticle[] {
  if (stories.length === 0) return [];
  if (stories.length <= limit) return stories;

  const dna = editorialDNA || loadEditorialDNA();
  
  // Score each story for op-ed worthiness
  const opEdScored: OpEdTopicScore[] = stories.map(story => {
    const opinionScore = calculateOpinionWorthiness(story, dna);
    const controversyScore = calculateControversyPotential(story);
    const synthesisScore = calculateSynthesisPotential(story, stories);
    
    // Weighted combination: controversy (40%) + synthesis (40%) + opinion (20%)
    const combinedScore = (controversyScore * 0.4) + (synthesisScore * 0.4) + (opinionScore * 0.2);
    
    return {
      story,
      opinionScore,
      controversyScore,
      synthesisScore,
      combinedScore,
      selectionReason: generateSelectionReason(opinionScore, controversyScore, synthesisScore)
    };
  });
  
  // Filter stories that meet minimum op-ed threshold and rank by combined score
  const selectedTopics = opEdScored
    .filter(item => item.opinionScore >= 6.0) // Minimum opinion worthiness threshold
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, limit)
    .map(item => ({
      ...item.story,
      editorialScore: item.opinionScore,
      controversyLevel: item.controversyScore,
      synthesisLevel: item.synthesisScore,
      opEdSelectionReason: item.selectionReason
    }));

  console.log(`📊 Selected ${selectedTopics.length} op-ed topics from ${stories.length} candidates`);
  
  return selectedTopics;
}

/**
 * Calculate how suitable a story is for opinion writing
 */
function calculateOpinionWorthiness(story: IngestedArticle, dna: EditorialDNA): number {
  // Start with existing editorial importance score
  let score = calculateStoryImportance(story, dna);
  
  // Boost score for opinion-friendly characteristics
  const content = (story.content || story.title || '').toLowerCase();
  
  // Opinion opportunity indicators
  const opinionKeywords = [
    'should', 'must', 'need to', 'ought', 'require', 'demand',
    'policy', 'regulation', 'government', 'leadership', 'decision',
    'future', 'trend', 'impact', 'consequence', 'implication',
    'debate', 'controversy', 'discuss', 'question', 'challenge'
  ];
  
  const opinionKeywordCount = opinionKeywords.filter(keyword => 
    content.includes(keyword)
  ).length;
  
  // Boost for opinion-rich content
  score += Math.min(opinionKeywordCount * 0.5, 3.0);
  
  // Boost for systemic/policy stories (better for op-eds)
  if (content.includes('policy') || content.includes('regulation') || 
      content.includes('system') || content.includes('government')) {
    score += 2.0;
  }
  
  // Slight penalty for breaking news (better for reporting than opinion)
  if (content.includes('breaking') || content.includes('just announced') ||
      content.includes('developing')) {
    score -= 1.0;
  }
  
  return Math.max(0, Math.min(score, 10));
}

/**
 * Calculate how controversial or debate-worthy a story is
 */
function calculateControversyPotential(story: IngestedArticle): number {
  let score = 5.0; // Base controversy score
  
  const content = (story.content || story.title || '').toLowerCase();
  
  // High controversy indicators
  const controversyKeywords = [
    'controversial', 'debate', 'divided', 'opposing', 'critics', 'supporters',
    'backlash', 'protest', 'opposition', 'resistance', 'dispute', 'conflict',
    'unprecedented', 'revolutionary', 'disruptive', 'challenge', 'threat',
    'ban', 'restrict', 'limit', 'prohibit', 'regulate', 'control'
  ];
  
  const controversyCount = controversyKeywords.filter(keyword => 
    content.includes(keyword)
  ).length;
  
  score += Math.min(controversyCount * 0.7, 4.0);
  
  // Systemic change indicators (high controversy potential)
  const systemicKeywords = [
    'system', 'infrastructure', 'fundamental', 'transform', 'overhaul',
    'reform', 'revolution', 'paradigm', 'shift', 'change'
  ];
  
  const systemicCount = systemicKeywords.filter(keyword => 
    content.includes(keyword)
  ).length;
  
  score += Math.min(systemicCount * 0.8, 3.0);
  
  // Technology disruption (often controversial)
  if (content.includes('ai') || content.includes('artificial intelligence') ||
      content.includes('automation') || content.includes('blockchain') ||
      content.includes('crypto')) {
    score += 1.5;
  }
  
  // Climate/environment (highly debatable topics)
  if (content.includes('climate') || content.includes('environment') ||
      content.includes('renewable') || content.includes('fossil')) {
    score += 1.0;
  }
  
  // Reduce score for simple announcements or earnings reports
  if (content.includes('announces') || content.includes('earnings') ||
      content.includes('results') || content.includes('appointed')) {
    score -= 2.0;
  }
  
  return Math.max(0, Math.min(score, 10));
}

/**
 * Calculate how well a story connects to broader patterns for synthesis
 */
function calculateSynthesisPotential(story: IngestedArticle, allStories: IngestedArticle[]): number {
  let score = 5.0; // Base synthesis score
  
  const content = (story.content || story.title || '').toLowerCase();
  
  // Look for thematic connections to other stories
  const thematicMatches = allStories.filter(otherStory => {
    if (otherStory === story) return false;
    
    const otherContent = (otherStory.content || otherStory.title || '').toLowerCase();
    
    // Check for shared themes
    const sharedKeywords = extractKeywords(content).filter(keyword =>
      extractKeywords(otherContent).includes(keyword)
    );
    
    return sharedKeywords.length >= 2; // At least 2 shared meaningful keywords
  });
  
  // Boost for stories with thematic connections
  score += Math.min(thematicMatches.length * 1.5, 4.0);
  
  // Boost for stories about trends or patterns (good for synthesis)
  const trendKeywords = [
    'trend', 'pattern', 'shift', 'movement', 'wave', 'rise', 'growth',
    'increase', 'surge', 'adoption', 'widespread', 'global', 'worldwide'
  ];
  
  const trendCount = trendKeywords.filter(keyword => content.includes(keyword)).length;
  score += Math.min(trendCount * 0.8, 3.0);
  
  // Boost for second-order effects and implications
  const synthesisKeywords = [
    'implication', 'consequence', 'result', 'effect', 'impact', 'outcome',
    'leads to', 'causes', 'results in', 'means that', 'suggests'
  ];
  
  const synthesisCount = synthesisKeywords.filter(keyword => content.includes(keyword)).length;
  score += Math.min(synthesisCount * 0.6, 2.0);
  
  // Slight penalty for very time-sensitive news (harder to synthesize)
  if (content.includes('today') || content.includes('this morning') ||
      content.includes('just now') || content.includes('minutes ago')) {
    score -= 1.0;
  }
  
  return Math.max(0, Math.min(score, 10));
}

/**
 * Extract meaningful keywords from content for thematic matching
 */
function extractKeywords(content: string): string[] {
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 4); // Filter out short words
  
  // Remove common stop words
  const stopWords = ['this', 'that', 'with', 'have', 'will', 'from', 'they', 
                     'been', 'were', 'said', 'each', 'which', 'their', 'time'];
  
  return words.filter(word => !stopWords.includes(word));
}

/**
 * Generate a human-readable reason for why a story was selected
 */
function generateSelectionReason(opinionScore: number, controversyScore: number, synthesisScore: number): string {
  const reasons: string[] = [];
  
  if (controversyScore >= 8.0) {
    reasons.push('highly controversial topic');
  } else if (controversyScore >= 6.5) {
    reasons.push('debate-worthy subject');
  }
  
  if (synthesisScore >= 8.0) {
    reasons.push('excellent synthesis potential');
  } else if (synthesisScore >= 6.5) {
    reasons.push('good thematic connections');
  }
  
  if (opinionScore >= 8.5) {
    reasons.push('strong opinion opportunity');
  } else if (opinionScore >= 7.0) {
    reasons.push('opinion-friendly content');
  }
  
  if (reasons.length === 0) {
    return 'balanced selection criteria';
  }
  
  return reasons.join(', ');
}

/**
 * Generate a creative op-ed from multiple stories using GPT-4o
 */
export async function generateOpEd(
  stories: IngestedArticle[],
  host: Host,
  editorialDNA: EditorialDNA,
  options: OpEdGenerationOptions = {}
): Promise<GeneratedOpEd> {
  const {
    targetLength = 1000,
    openRouterClient,
    opinionType = 'commentary',
    storeInConvex = false,
    includeEditorialAngle = true,
    focusAreas = []
  } = options;

  if (stories.length === 0) {
    throw new Error('Cannot generate op-ed: no stories provided');
  }

  // Check budget constraints before generation
  const costLimits = await shouldLimitOpEdGeneration();
  if (costLimits.shouldLimit && costLimits.maxOpEdsAllowed === 0) {
    throw new Error(`Op-ed generation blocked: ${costLimits.reason}`);
  }
  
  if (costLimits.shouldLimit && costLimits.maxOpEdsAllowed < 2) {
    console.warn(`⚠️ Op-ed generation limited: ${costLimits.reason}. Only ${costLimits.maxOpEdsAllowed} op-eds allowed today.`);
  }

  // Create OpenRouter client if not provided
  const client = openRouterClient || new OpenRouterClient();
  
  // Load editorial DNA
  const dna = editorialDNA || loadEditorialDNA();
  
  // Apply editorial angles to stories
  const storiesWithAngles = stories.map(story => 
    includeEditorialAngle ? injectEditorialAngle(story, dna) : story
  );

  // Synthesize stories into coherent narrative
  const synthesizedContext = synthesizeStories(storiesWithAngles);
  
  // Build comprehensive system prompt incorporating host personality
  const systemPrompt = buildOpEdSystemPrompt(dna, host, targetLength, opinionType, focusAreas);
  
  // Build user prompt with synthesized content
  const userPrompt = buildOpEdUserPrompt(synthesizedContext, storiesWithAngles, opinionType);

  try {
    // Use OpenRouter with GPT-4o for creative synthesis
    const response = await client.completeTask(
      TaskType.CREATIVE_WRITING, // Maps to GPT-4o for creative content
      userPrompt,
      {
        systemPrompt,
        temperature: 0.8, // Higher creativity for op-eds
        maxTokens: Math.round(targetLength * 1.5), // Allow for longer creative content
      }
    );

    // Extract op-ed content from response
    const opEdContent = response.content.trim();
    
    // Parse the structured response
    const parsedOpEd = parseGeneratedOpEd(opEdContent, `Op-Ed: ${stories[0].title || 'Analysis'}`);
    
    // Calculate actual word count
    const actualWordCount = parsedOpEd.content.split(/\s+/).length;
    
    // Extract thesis from content
    const thesis = extractThesis(parsedOpEd.content);
    
    // Calculate quality score
    const qualityScore = calculateOpEdQuality(
      parsedOpEd,
      targetLength,
      storiesWithAngles,
      host
    );

    const generatedOpEd: GeneratedOpEd = {
      title: parsedOpEd.title,
      content: parsedOpEd.content,
      excerpt: parsedOpEd.excerpt,
      wordCount: actualWordCount,
      generationCost: response.cost || 0,
      model: response.model || 'openai/gpt-4o',
      editorialAngle: (typeof storiesWithAngles[0]?.editorialAngle === 'object' && storiesWithAngles[0]?.editorialAngle !== null) ? storiesWithAngles[0]?.editorialAngle.primary : storiesWithAngles[0]?.editorialAngle,
      sourceStories: stories,
      generatedAt: new Date(),
      qualityScore,
      opinionType,
      hostPersonality: host.name,
      thesis
    };

    // Store in Convex if requested
    if (storeInConvex) {
      const opEdId = await storeOpEdInConvex(generatedOpEd);
      console.log(opEdId ? `📝 Op-Ed "${generatedOpEd.title}" stored in Convex` : '⚠️ Failed to store op-ed in Convex');
    }

    // Log cost analysis after generation
    await logOpEdCostAnalysis();

    return generatedOpEd;
    
  } catch (error) {
    console.error('Failed to generate op-ed:', error);
    
    // Return a fallback op-ed if generation fails
    const fallbackContent = generateFallbackOpEd(
      stories,
      host,
      targetLength,
      opinionType
    );
    
    return {
      title: fallbackContent.title,
      content: fallbackContent.content,
      excerpt: fallbackContent.excerpt,
      wordCount: fallbackContent.content.split(/\s+/).length,
      generationCost: 0,
      model: 'fallback',
      sourceStories: stories,
      generatedAt: new Date(),
      qualityScore: 4.0, // Lower quality for fallback
      opinionType,
      hostPersonality: host.name,
      thesis: fallbackContent.thesis
    };
  }
}

/**
 * Synthesize multiple stories into coherent narrative context
 */
function synthesizeStories(stories: IngestedArticle[]): string {
  if (stories.length === 1) {
    return `Primary story: ${stories[0].title}\n${stories[0].content || ''}`;
  }

  // Extract common themes and connections between stories
  const themes: string[] = [];
  const connections: string[] = [];
  
  stories.forEach((story, index) => {
    if (story.editorialAngle) {
      const angleText = typeof story.editorialAngle === 'object' ? story.editorialAngle.primary : story.editorialAngle;
      themes.push(`Story ${index + 1}: ${angleText}`);
    }
    
    // Look for connections between stories
    if (index > 0) {
      const prevStory = stories[index - 1];
      if (story.sourceName === prevStory.sourceName) {
        connections.push(`Stories ${index} and ${index + 1} from same source (${story.sourceName})`);
      }
      // Could add more sophisticated connection detection here
    }
  });

  let synthesis = `SYNTHESIS OF ${stories.length} STORIES:\n\n`;
  
  // Add thematic overview
  if (themes.length > 0) {
    synthesis += `THEMATIC OVERVIEW:\n${themes.join('\n')}\n\n`;
  }
  
  // Add connections if found
  if (connections.length > 0) {
    synthesis += `STORY CONNECTIONS:\n${connections.join('\n')}\n\n`;
  }
  
  // Add individual story summaries
  synthesis += `STORY DETAILS:\n`;
  stories.forEach((story, index) => {
    synthesis += `\n${index + 1}. ${story.title || 'Untitled'} (${story.sourceName || story.source || 'Unknown'})\n`;
    synthesis += `${story.content?.substring(0, 300) || 'No content available'}...\n`;
  });
  
  return synthesis;
}

/**
 * Build comprehensive system prompt for op-ed generation
 */
function buildOpEdSystemPrompt(
  dna: EditorialDNA,
  host: Host,
  targetLength: number,
  opinionType: string,
  focusAreas: string[]
): string {
  const values = dna.editorial_dna.values.join(', ');
  const perspectives = dna.editorial_dna.seek.slice(0, 3).join(', ');
  const avoidances = dna.editorial_dna.avoid.slice(0, 2).join(', ');
  
  return `You are ${host.name}, ${host.role || 'columnist'}, writing a ${opinionType} piece that synthesizes multiple news stories into a cohesive opinion piece.

EDITORIAL VALUES: ${values}

PERSPECTIVES TO SEEK: ${perspectives}

PERSPECTIVES TO AVOID: ${avoidances}

YOUR PERSONALITY PROFILE:
- Primary Focus: ${host.characteristics.primary_focus}
- Analytical Depth: ${host.characteristics.analytical_depth}/10
- Empathy Level: ${host.characteristics.empathy_level}/10
- Energy Level: ${host.characteristics.energy_level}/10
- Writing Voice: ${host.speech_patterns.vocabulary} vocabulary, ${host.speech_patterns.pace} pace
- Key Interests: ${host.topics_of_interest ? Object.keys(host.topics_of_interest).slice(0, 3).join(', ') : 'varied topics'}

${focusAreas.length > 0 ? `FOCUS AREAS: ${focusAreas.join(', ')}` : ''}

OP-ED REQUIREMENTS:
1. Target length: ${targetLength} words (±100 words acceptable)
2. Synthesize multiple stories into a unified argument with clear thesis
3. Present your personal perspective while maintaining journalistic integrity
4. Include evidence from the source stories to support your argument
5. Connect to broader implications and systemic patterns
6. Write in your distinctive voice and style
7. End with actionable insights or forward-looking analysis
8. Use ${host.speech_patterns.vocabulary} language appropriate to your personality

STRUCTURE YOUR RESPONSE AS:
TITLE: [Compelling opinion headline that reflects your perspective]

EXCERPT: [2-sentence summary of your main argument and conclusion]

CONTENT:
[Full op-ed with:
- Opening that establishes your thesis
- 2-3 body sections with evidence and analysis
- Personal insights that only you would provide
- Conclusion with forward-looking perspective or call to action]

WRITING STYLE GUIDELINES:
- Match your analytical depth level (${host.characteristics.analytical_depth}/10)
- Incorporate your ${host.speech_patterns.pace} pacing
- Use transition phrases like: ${host.speech_patterns.transition_phrases?.slice(0, 3).join(', ') || 'however, furthermore, consequently'}
- Maintain your ${host.characteristics.empathy_level}/10 empathy level in tone
- Balance personal opinion with factual grounding`;
}

/**
 * Build user prompt with synthesized story content
 */
function buildOpEdUserPrompt(
  synthesizedContext: string,
  stories: IngestedArticle[],
  opinionType: string
): string {
  const storyTitles = stories.map(s => s.title || 'Untitled').join(', ');
  const sources = [...new Set(stories.map(s => s.sourceName || s.source || 'Unknown'))].join(', ');

  return `Write a ${opinionType} piece based on these ${stories.length} related stories:

SOURCE STORIES: ${storyTitles}
NEWS SOURCES: ${sources}

${synthesizedContext}

Your task is to synthesize these stories into a cohesive opinion piece that:
1. Identifies the common thread or broader pattern these stories represent
2. Presents your unique perspective on what these developments mean
3. Argues for a specific viewpoint or interpretation
4. Connects to larger societal, technological, or systemic implications
5. Offers readers actionable insights or a new way of thinking about these issues

Remember to write in your distinctive voice and bring your personal expertise and perspective to bear on these stories. Your readers should come away with both a clear understanding of your position and valuable insights they couldn't get elsewhere.`;
}

/**
 * Parse the generated op-ed response into structured components
 */
function parseGeneratedOpEd(
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
 * Extract the main thesis from op-ed content
 */
function extractThesis(content: string): string {
  // Look for thesis indicators in the first few paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
  const firstParagraphs = paragraphs.slice(0, 2).join(' ');
  
  // Simple heuristic: look for strong opinion indicators
  const thesisIndicators = [
    /I believe that .+?\./i,
    /The truth is .+?\./i,
    /What we're seeing is .+?\./i,
    /The real issue is .+?\./i,
    /This represents .+?\./i,
    /We must understand that .+?\./i
  ];
  
  for (const indicator of thesisIndicators) {
    const match = firstParagraphs.match(indicator);
    if (match) {
      return match[0].replace(/^(I believe that|The truth is|What we're seeing is|The real issue is|This represents|We must understand that)\s*/i, '').replace(/\.$/, '');
    }
  }
  
  // Fallback: return first sentence of first paragraph
  const firstSentence = paragraphs[0]?.split(/[.!?]+/)[0];
  return firstSentence?.trim() + '.' || 'Synthesis of current events and their implications';
}

/**
 * Calculate op-ed quality score based on various factors
 */
function calculateOpEdQuality(
  opEd: { title: string; excerpt: string; content: string },
  targetLength: number,
  sourceStories: IngestedArticle[],
  host: Host
): number {
  let score = 5.0; // Base score
  
  // Length adherence (more flexible for op-eds)
  const actualLength = opEd.content.split(/\s+/).length;
  const lengthDifference = Math.abs(actualLength - targetLength);
  
  if (lengthDifference <= 100) {
    score += 2.0; // Perfect length
  } else if (lengthDifference <= 200) {
    score += 1.5; // Good length
  } else if (lengthDifference <= 300) {
    score += 1.0; // Acceptable length
  } else {
    score -= 0.5; // Poor length adherence (more forgiving than articles)
  }
  
  // Structure quality checks
  if (opEd.title && opEd.title.length > 15 && opEd.title.length < 120) {
    score += 1.0; // Good title length for op-eds
  }
  
  if (opEd.excerpt && opEd.excerpt.length > 80 && opEd.excerpt.length < 250) {
    score += 0.5; // Good excerpt length
  }
  
  // Content quality indicators for opinion pieces
  const paragraphs = opEd.content.split('\n\n').filter(p => p.trim().length > 0);
  if (paragraphs.length >= 4 && paragraphs.length <= 10) {
    score += 1.0; // Good paragraph structure for op-eds
  }
  
  // Check for opinion strength and thesis clarity
  const opinionKeywords = [
    'believe', 'argue', 'assert', 'contend', 'maintain',
    'must', 'should', 'need to', 'essential', 'crucial',
    'however', 'nevertheless', 'furthermore', 'consequently',
    'my view', 'in my opinion', 'I think', 'perspective'
  ];
  
  const opinionCount = opinionKeywords.filter(keyword => 
    opEd.content.toLowerCase().includes(keyword)
  ).length;
  
  if (opinionCount >= 5) {
    score += 1.5; // Strong opinion voice
  } else if (opinionCount >= 3) {
    score += 1.0; // Good opinion voice
  } else if (opinionCount >= 1) {
    score += 0.5; // Some opinion voice
  }
  
  // Check for multi-story synthesis
  if (sourceStories.length > 1) {
    // Look for references to multiple stories or sources
    const sourceNames = sourceStories.map(s => s.sourceName || s.source || '').filter(Boolean);
    const sourceReferences = sourceNames.filter(source => 
      opEd.content.includes(source) || opEd.content.includes(source.toLowerCase())
    ).length;
    
    if (sourceReferences >= 2) {
      score += 1.0; // Good synthesis of multiple sources
    } else if (sourceReferences >= 1) {
      score += 0.5; // Some source integration
    }
  }
  
  // Host personality integration check
  if (host.speech_patterns.vocabulary === 'academic' && 
      (opEd.content.includes('furthermore') || opEd.content.includes('consequently'))) {
    score += 0.5; // Good personality match
  } else if (host.speech_patterns.vocabulary === 'accessible' && 
             !(/\b(furthermore|consequently|notwithstanding)\b/.test(opEd.content))) {
    score += 0.5; // Good personality match
  }
  
  // Avoid placeholder text or generic content
  if (opEd.content.includes('[') && opEd.content.includes(']')) {
    score -= 2.0; // Contains placeholder text
  }
  
  if (opEd.content.includes('In conclusion') || opEd.content.includes('To sum up')) {
    score -= 0.5; // Generic conclusion indicators
  }
  
  // Ensure score is within bounds
  return Math.max(0, Math.min(score, 10));
}

/**
 * Generate a fallback op-ed if AI generation fails
 */
function generateFallbackOpEd(
  stories: IngestedArticle[],
  host: Host,
  targetLength: number,
  opinionType: string
): { title: string; content: string; excerpt: string; thesis: string } {
  const primaryStory = stories[0];
  const storyCount = stories.length;
  
  const fallbackTitle = `${host.name}: ${opinionType === 'analysis' ? 'Analysis' : 'Commentary'} on ${primaryStory.title || 'Current Events'}`;
  
  const fallbackContent = `As ${host.name}, I've been following the recent developments in ${primaryStory.title || 'these important stories'}, and I believe there are crucial insights we need to consider.

${storyCount > 1 ? `Looking at these ${storyCount} related stories, ` : 'This story '}reveals important patterns about how our society is evolving. The implications go beyond the immediate headlines.

According to ${primaryStory.sourceName || 'reports'}, ${primaryStory.content?.substring(0, 200) || 'these developments highlight significant changes in our world'}. This represents more than just news—it's a window into larger systemic trends that will shape our future.

From my perspective as ${host.role || 'a columnist'}, what strikes me most is how this connects to broader patterns we've been tracking. The ${host.characteristics.primary_focus} aspects of this story deserve particular attention from readers who want to understand what's really happening.

${storyCount > 1 ? `The convergence of these ${storyCount} stories isn't coincidental. ` : ''}We're witnessing the kind of fundamental shift that requires us to reconsider our assumptions and prepare for what comes next.

As we move forward, the key insight is that these developments will continue to accelerate. Those who understand the underlying patterns will be better positioned to navigate the changes ahead.

This is the kind of analysis that helps us see beyond today's headlines to understand tomorrow's reality.`;

  const fallbackExcerpt = `${host.name} examines the deeper implications of recent developments and what they mean for our collective future.`;
  
  const fallbackThesis = `These recent developments represent fundamental shifts that require us to reconsider our assumptions and prepare for accelerating change`;

  return {
    title: fallbackTitle,
    content: fallbackContent,
    excerpt: fallbackExcerpt,
    thesis: fallbackThesis
  };
}

/**
 * Store generated op-ed in Convex database (using articles table for now)
 */
export async function storeOpEdInConvex(opEd: GeneratedOpEd): Promise<string | null> {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    
    if (!convexUrl) {
      console.warn('⚠️ NEXT_PUBLIC_CONVEX_URL not configured, skipping op-ed storage');
      return null;
    }

    // Initialize Convex client
    const client = new ConvexHttpClient(convexUrl);

    // Transform GeneratedOpEd to Convex articles format
    const convexArticle = {
      date: opEd.generatedAt.toISOString().split('T')[0],
      headline: `[OP-ED] ${opEd.title}`,
      content: `${opEd.excerpt}\n\n${opEd.content}`,
      sources: extractSourcesFromOpEd(opEd),
      model: opEd.model,
      costs: {
        inputTokens: 0, // OpenRouter doesn't provide token breakdown yet
        outputTokens: 0,
        totalCost: opEd.generationCost,
      },
      editorialScore: opEd.qualityScore,
      tags: createTagsFromOpEd(opEd),
    };

    // Store the op-ed in Convex
    const articleId = await client.mutation(api.functions.storeArticle, convexArticle);
    
    console.log(`✅ Op-Ed stored in Convex with ID: ${articleId}`);
    return articleId;

  } catch (error) {
    console.error('❌ Failed to store op-ed in Convex:', error);
    return null;
  }
}

/**
 * Extract source information from GeneratedOpEd for Convex storage
 */
function extractSourcesFromOpEd(opEd: GeneratedOpEd): string[] {
  const sources: string[] = [];
  
  // Add all source stories
  opEd.sourceStories.forEach(story => {
    if (story.sourceName) sources.push(story.sourceName);
    if (story.source && story.source !== story.sourceName) sources.push(story.source);
    if (story.url) sources.push(story.url);
  });
  
  // Add host as a source
  sources.push(`Host: ${opEd.hostPersonality}`);
  
  // Fallback if no sources
  if (sources.length === 1) sources.push('Multiple Sources'); // Only host was added
  
  return [...new Set(sources)]; // Remove duplicates
}

/**
 * Create tags array from op-ed metadata for searchability
 */
function createTagsFromOpEd(opEd: GeneratedOpEd): string[] {
  const tags: string[] = [];
  
  // Add op-ed identifier
  tags.push('op-ed', opEd.opinionType);
  
  // Add host name
  tags.push(opEd.hostPersonality.toLowerCase());
  
  // Add editorial angle as tag
  if (opEd.editorialAngle) {
    tags.push(opEd.editorialAngle);
  }
  
  // Add quality indicator
  if (opEd.qualityScore && opEd.qualityScore >= 8) {
    tags.push('high-quality');
  } else if (opEd.qualityScore && opEd.qualityScore < 5) {
    tags.push('needs-review');
  }
  
  // Add length category
  if (opEd.wordCount >= 1200) {
    tags.push('long-form');
  } else if (opEd.wordCount >= 800) {
    tags.push('medium-form');
  } else {
    tags.push('short-form');
  }
  
  // Add multi-story synthesis indicator
  if (opEd.sourceStories.length > 1) {
    tags.push('synthesis', 'multi-source');
  }
  
  return tags;
}

/**
 * Interface for op-ed validation results
 */
export interface OpEdValidationResult {
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
    thesisCheck: {
      passed: boolean;
      hasThesis: boolean;
      thesisStrength: number;
      detectedThesis?: string;
      score: number;
    };
    argumentCheck: {
      passed: boolean;
      argumentCount: number;
      evidencePresent: boolean;
      supportingPoints: string[];
      score: number;
    };
    synthesisCheck: {
      passed: boolean;
      synthesisQuality: number;
      coherentNarrative: boolean;
      transitionQuality: number;
      score: number;
    };
    perspectiveCheck: {
      passed: boolean;
      opinionStrength: number;
      personalVoice: boolean;
      voiceIndicators: string[];
      score: number;
    };
    callToActionCheck: {
      passed: boolean;
      hasCallToAction: boolean;
      actionSpecific: boolean;
      detectedActions: string[];
      score: number;
    };
    structureCheck: {
      passed: boolean;
      hasTitle: boolean;
      hasContent: boolean;
      paragraphCount: number;
      score: number;
    };
    placeholderCheck: {
      passed: boolean;
      foundPlaceholders: string[];
      score: number;
    };
  };
  recommendations: string[];
}

/**
 * Validate op-ed content ensuring clear position, supporting evidence, and conclusion
 */
export function validateOpEd(
  text: string,
  options: {
    minimumLength?: number;
    minimumArguments?: number;
    strictMode?: boolean;
    requireCallToAction?: boolean;
  } = {}
): OpEdValidationResult {
  const {
    minimumLength = 800, // Op-eds are typically longer than articles
    minimumArguments = 2,
    strictMode = false,
    requireCallToAction = true
  } = options;

  if (!text || typeof text !== 'string') {
    return createEmptyValidationResult(minimumLength, 'Invalid input: text must be a non-empty string');
  }

  const cleanText = text.trim();
  const issues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // 1. Length Validation
  const lengthCheck = validateOpEdLength(cleanText, minimumLength);
  if (!lengthCheck.passed) {
    issues.push(`Op-ed too short: ${lengthCheck.actualLength} words (minimum: ${minimumLength})`);
    recommendations.push(`Expand content to reach minimum ${minimumLength} words for substantial op-ed`);
  }

  // 2. Thesis Detection and Validation
  const thesisCheck = validateOpEdThesis(cleanText);
  if (!thesisCheck.passed) {
    issues.push('No clear thesis or argumentative position detected');
    recommendations.push('Start with a strong, clear thesis statement that presents your main argument');
  } else if (thesisCheck.thesisStrength < 7.0) {
    warnings.push('Thesis could be stronger and more specific');
    recommendations.push('Strengthen your thesis with more specific claims or stronger language');
  }

  // 3. Argument Structure Validation
  const argumentCheck = validateOpEdArguments(cleanText, minimumArguments);
  if (!argumentCheck.passed) {
    issues.push(`Insufficient supporting arguments: found ${argumentCheck.argumentCount}, need ${minimumArguments}`);
    recommendations.push(`Add ${minimumArguments - argumentCheck.argumentCount} more supporting arguments with evidence`);
  }
  if (!argumentCheck.evidencePresent) {
    issues.push('Supporting evidence is weak or missing');
    recommendations.push('Include specific examples, data, or citations to support your arguments');
  }

  // 4. Synthesis and Narrative Coherence
  const synthesisCheck = validateOpEdSynthesis(cleanText);
  if (!synthesisCheck.passed) {
    warnings.push('Arguments could be better connected in a unified narrative');
    recommendations.push('Add transitions and connections between your supporting points');
  }

  // 5. Personal Perspective and Opinion Voice
  const perspectiveCheck = validateOpEdPerspective(cleanText);
  if (!perspectiveCheck.passed) {
    issues.push('Op-ed lacks strong personal perspective or opinion voice');
    recommendations.push('Use stronger opinion language: "I believe," "we must," "the evidence shows"');
  } else if (perspectiveCheck.opinionStrength < 6.0) {
    warnings.push('Opinion voice could be stronger for better engagement');
    recommendations.push('Take a clearer stance and express your viewpoint more assertively');
  }

  // 6. Call-to-Action Validation
  const callToActionCheck = validateOpEdCallToAction(cleanText, requireCallToAction);
  if (requireCallToAction && !callToActionCheck.passed) {
    issues.push('Missing or weak call-to-action in conclusion');
    recommendations.push('End with specific actions readers should take or ways of thinking they should adopt');
  }

  // 7. Basic Structure Validation
  const structureCheck = validateOpEdStructure(cleanText);
  if (!structureCheck.passed) {
    if (!structureCheck.hasContent) {
      issues.push('Op-ed appears to lack substantial content');
      recommendations.push('Add meaningful content to the op-ed body');
    }
    if (structureCheck.paragraphCount < 4) {
      issues.push(`Insufficient paragraph structure: ${structureCheck.paragraphCount} paragraphs (minimum: 4 for op-eds)`);
      recommendations.push('Break content into at least 4 coherent paragraphs: intro, arguments, synthesis, conclusion');
    }
  }

  // 8. Placeholder Text Detection
  const placeholderCheck = validateOpEdPlaceholders(cleanText);
  if (!placeholderCheck.passed) {
    issues.push(`Found ${placeholderCheck.foundPlaceholders.length} placeholder(s): ${placeholderCheck.foundPlaceholders.slice(0, 3).join(', ')}`);
    recommendations.push('Replace all placeholder text with actual content');
  }

  // Calculate overall score with op-ed specific weights
  const weights = {
    thesisCheck: 3.5,        // Most critical for op-eds
    argumentCheck: 3.0,      // Supporting evidence essential
    synthesisCheck: 2.5,     // Narrative coherence
    perspectiveCheck: 2.5,   // Opinion voice strength
    callToActionCheck: 2.0,  // Actionable conclusion
    lengthCheck: 2.0,        // Length adherence
    structureCheck: 1.5,     // Basic structure
    placeholderCheck: 2.0    // Quality control
  };

  const totalWeightedScore = 
    (lengthCheck.score * weights.lengthCheck) +
    (thesisCheck.score * weights.thesisCheck) +
    (argumentCheck.score * weights.argumentCheck) +
    (synthesisCheck.score * weights.synthesisCheck) +
    (perspectiveCheck.score * weights.perspectiveCheck) +
    (callToActionCheck.score * weights.callToActionCheck) +
    (structureCheck.score * weights.structureCheck) +
    (placeholderCheck.score * weights.placeholderCheck);

  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const overallScore = Math.round((totalWeightedScore / totalWeight) * 10) / 10;

  // Determine if op-ed is valid (higher threshold than articles)
  const validationThreshold = strictMode ? 7.5 : 6.5;
  const isValid = overallScore >= validationThreshold && issues.length === 0;

  // Add general recommendations based on overall score
  if (overallScore < 5.0) {
    recommendations.push('Op-ed needs significant improvement before publication');
  } else if (overallScore < 7.0) {
    recommendations.push('Op-ed meets basic standards but could be enhanced for stronger impact');
  } else if (overallScore >= 8.5) {
    recommendations.push('Op-ed meets high quality standards for publication');
  }

  return {
    isValid,
    overallScore,
    issues,
    warnings,
    validationDetails: {
      lengthCheck,
      thesisCheck,
      argumentCheck,
      synthesisCheck,
      perspectiveCheck,
      callToActionCheck,
      structureCheck,
      placeholderCheck
    },
    recommendations: [...new Set(recommendations)] // Remove duplicates
  };
}

/**
 * Validate op-ed length requirements
 */
function validateOpEdLength(text: string, minimumLength: number): { passed: boolean; actualLength: number; minimumRequired: number; score: number } {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  return {
    passed: wordCount >= minimumLength,
    actualLength: wordCount,
    minimumRequired: minimumLength,
    score: Math.min((wordCount / minimumLength) * 10, 10)
  };
}

/**
 * Validate thesis presence and strength
 */
function validateOpEdThesis(text: string): { passed: boolean; hasThesis: boolean; thesisStrength: number; detectedThesis?: string; score: number } {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  const firstTwoParagraphs = paragraphs.slice(0, 2).join(' ');
  
  // Strong thesis indicators
  const strongThesisPatterns = [
    /I believe that .+?\./gi,
    /The truth is .+?\./gi,
    /What we're seeing is .+?\./gi,
    /The real issue is .+?\./gi,
    /This represents .+?\./gi,
    /We must understand that .+?\./gi,
    /It's clear that .+?\./gi,
    /The evidence shows .+?\./gi,
    /What's most important is .+?\./gi,
    /The key insight is .+?\./gi
  ];

  // Moderate thesis indicators
  const moderateThesisPatterns = [
    /should .+? because/gi,
    /must .+? in order/gi,
    /need to .+? before/gi,
    /requires .+? to achieve/gi,
    /demands .+? from/gi
  ];

  // Argumentative keywords that suggest thesis
  const argumentativeKeywords = [
    'argue', 'assert', 'contend', 'maintain', 'claim',
    'believe', 'must', 'should', 'need to', 'essential',
    'crucial', 'imperative', 'require', 'demand'
  ];

  let thesisStrength = 0;
  let detectedThesis: string | undefined;
  
  // Check for strong thesis patterns
  for (const pattern of strongThesisPatterns) {
    const matches = firstTwoParagraphs.match(pattern);
    if (matches) {
      thesisStrength = Math.max(thesisStrength, 9.0);
      detectedThesis = matches[0];
      break;
    }
  }
  
  // Check for moderate thesis patterns
  if (thesisStrength < 7.0) {
    for (const pattern of moderateThesisPatterns) {
      const matches = firstTwoParagraphs.match(pattern);
      if (matches) {
        thesisStrength = Math.max(thesisStrength, 7.0);
        detectedThesis = matches[0];
        break;
      }
    }
  }
  
  // Check for argumentative keywords
  const keywordCount = argumentativeKeywords.filter(keyword =>
    firstTwoParagraphs.toLowerCase().includes(keyword)
  ).length;
  
  thesisStrength = Math.max(thesisStrength, Math.min(keywordCount * 1.5, 6.0));
  
  const hasThesis = thesisStrength >= 5.0;
  const passed = hasThesis && thesisStrength >= 6.0;
  
  return {
    passed,
    hasThesis,
    thesisStrength,
    detectedThesis,
    score: Math.min(thesisStrength, 10)
  };
}

/**
 * Validate argument structure and evidence
 */
function validateOpEdArguments(text: string, minimumArguments: number): {
  passed: boolean;
  argumentCount: number;
  evidencePresent: boolean;
  supportingPoints: string[];
  score: number;
} {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  
  // Look for argument markers
  const argumentMarkers = [
    /first[,\s]/gi, /second[,\s]/gi, /third[,\s]/gi,
    /firstly[,\s]/gi, /secondly[,\s]/gi, /thirdly[,\s]/gi,
    /furthermore[,\s]/gi, /moreover[,\s]/gi, /additionally[,\s]/gi,
    /in addition[,\s]/gi, /what's more[,\s]/gi,
    /consider[,\s]/gi, /for example[,\s]/gi, /for instance[,\s]/gi
  ];
  
  const supportingPoints: string[] = [];
  let argumentCount = 0;
  
  paragraphs.forEach(paragraph => {
    const hasArgumentMarker = argumentMarkers.some(marker => marker.test(paragraph));
    if (hasArgumentMarker || paragraph.length > 200) { // Substantial paragraphs likely contain arguments
      argumentCount++;
      // Extract first sentence as supporting point
      const firstSentence = paragraph.split(/[.!?]/)[0];
      if (firstSentence.length > 30) {
        supportingPoints.push(firstSentence.trim() + '.');
      }
    }
  });
  
  // Look for evidence indicators
  const evidenceKeywords = [
    'according to', 'research shows', 'studies indicate', 'data reveals',
    'evidence suggests', 'statistics show', 'reports indicate',
    'analysis reveals', 'findings demonstrate', 'surveys show',
    'examples include', 'for instance', 'such as', 'including',
    'cite', 'source', 'reference', 'study', 'report'
  ];
  
  const evidenceCount = evidenceKeywords.filter(keyword =>
    text.toLowerCase().includes(keyword)
  ).length;
  
  const evidencePresent = evidenceCount >= 2;
  const passed = argumentCount >= minimumArguments && evidencePresent;
  
  // Score based on argument count and evidence quality
  let score = Math.min((argumentCount / minimumArguments) * 6, 6);
  if (evidencePresent) score += 4;
  
  return {
    passed,
    argumentCount,
    evidencePresent,
    supportingPoints: supportingPoints.slice(0, 5), // Limit to 5 points
    score: Math.min(score, 10)
  };
}

/**
 * Validate synthesis and narrative coherence
 */
function validateOpEdSynthesis(text: string): {
  passed: boolean;
  synthesisQuality: number;
  coherentNarrative: boolean;
  transitionQuality: number;
  score: number;
} {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  
  // Look for synthesis keywords
  const synthesisKeywords = [
    'together', 'combined', 'collectively', 'overall', 'in summary',
    'taken together', 'when considered', 'the pattern', 'the trend',
    'this demonstrates', 'this shows', 'this reveals', 'this suggests',
    'the connection', 'the link', 'the relationship'
  ];
  
  const synthesisCount = synthesisKeywords.filter(keyword =>
    text.toLowerCase().includes(keyword)
  ).length;
  
  // Look for transition words/phrases
  const transitionWords = [
    'however', 'furthermore', 'moreover', 'additionally', 'nevertheless',
    'consequently', 'therefore', 'thus', 'as a result', 'meanwhile',
    'on the other hand', 'in contrast', 'similarly', 'likewise'
  ];
  
  const transitionCount = transitionWords.filter(word =>
    text.toLowerCase().includes(word)
  ).length;
  
  // Check for narrative flow (paragraph connections)
  let narrativeConnections = 0;
  for (let i = 1; i < paragraphs.length; i++) {
    const prevParagraph = paragraphs[i - 1].toLowerCase();
    const currentParagraph = paragraphs[i].toLowerCase();
    
    // Simple check for thematic continuity
    const sharedWords = prevParagraph.split(/\s+/)
      .filter(word => word.length > 4)
      .filter(word => currentParagraph.includes(word));
      
    if (sharedWords.length >= 2) {
      narrativeConnections++;
    }
  }
  
  const synthesisQuality = Math.min(synthesisCount * 1.5, 10);
  const transitionQuality = Math.min(transitionCount * 1.2, 10);
  const coherentNarrative = narrativeConnections >= paragraphs.length * 0.4;
  
  const passed = synthesisQuality >= 5.0 && transitionQuality >= 5.0;
  const score = (synthesisQuality * 0.4) + (transitionQuality * 0.4) + (coherentNarrative ? 2.0 : 0);
  
  return {
    passed,
    synthesisQuality,
    coherentNarrative,
    transitionQuality,
    score: Math.min(score, 10)
  };
}

/**
 * Validate personal perspective and opinion voice
 */
function validateOpEdPerspective(text: string): {
  passed: boolean;
  opinionStrength: number;
  personalVoice: boolean;
  voiceIndicators: string[];
  score: number;
} {
  const content = text.toLowerCase();
  
  // Strong opinion indicators
  const strongOpinionWords = [
    'I believe', 'I argue', 'I contend', 'I maintain', 'I assert',
    'my view', 'my perspective', 'my opinion', 'I think',
    'we must', 'we should', 'we need to', 'it is essential',
    'it is crucial', 'it is imperative', 'we cannot ignore'
  ];
  
  // Moderate opinion indicators
  const moderateOpinionWords = [
    'should', 'must', 'need to', 'ought to', 'require',
    'essential', 'crucial', 'important', 'necessary',
    'believe', 'think', 'feel', 'consider', 'suggest'
  ];
  
  const strongOpinionCount = strongOpinionWords.filter(phrase =>
    content.includes(phrase)
  ).length;
  
  const moderateOpinionCount = moderateOpinionWords.filter(word =>
    content.includes(word)
  ).length;
  
  const voiceIndicators: string[] = [];
  
  // Collect voice indicators found in text
  strongOpinionWords.forEach(phrase => {
    if (content.includes(phrase)) {
      voiceIndicators.push(phrase);
    }
  });
  
  const opinionStrength = Math.min(
    (strongOpinionCount * 2.0) + (moderateOpinionCount * 0.5),
    10
  );
  
  const personalVoice = strongOpinionCount >= 1 || moderateOpinionCount >= 3;
  const passed = personalVoice && opinionStrength >= 5.0;
  
  return {
    passed,
    opinionStrength,
    personalVoice,
    voiceIndicators: voiceIndicators.slice(0, 5), // Limit to 5 indicators
    score: Math.min(opinionStrength, 10)
  };
}

/**
 * Validate call-to-action presence and quality
 */
function validateOpEdCallToAction(text: string, required: boolean): {
  passed: boolean;
  hasCallToAction: boolean;
  actionSpecific: boolean;
  detectedActions: string[];
  score: number;
} {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  const lastTwoParagraphs = paragraphs.slice(-2).join(' ').toLowerCase();
  
  // Call-to-action indicators
  const callToActionPatterns = [
    /we must .+?\./gi,
    /we should .+?\./gi,
    /we need to .+?\./gi,
    /it's time to .+?\./gi,
    /the solution is .+?\./gi,
    /what we can do .+?\./gi,
    /here's what .+?\./gi,
    /the next step .+?\./gi,
    /moving forward .+?\./gi,
    /to address this .+?\./gi
  ];
  
  // Action verbs
  const actionVerbs = [
    'act', 'implement', 'adopt', 'change', 'reform', 'transform',
    'demand', 'advocate', 'support', 'oppose', 'vote', 'contact',
    'pressure', 'organize', 'mobilize', 'educate', 'inform'
  ];
  
  const detectedActions: string[] = [];
  let hasCallToAction = false;
  
  // Check for call-to-action patterns
  callToActionPatterns.forEach(pattern => {
    const matches = lastTwoParagraphs.match(pattern);
    if (matches) {
      hasCallToAction = true;
      detectedActions.push(matches[0]);
    }
  });
  
  // Check for action verbs in conclusion
  const actionVerbCount = actionVerbs.filter(verb =>
    lastTwoParagraphs.includes(verb)
  ).length;
  
  if (actionVerbCount >= 2) {
    hasCallToAction = true;
  }
  
  const actionSpecific = detectedActions.length > 0 || actionVerbCount >= 2;
  const passed = required ? hasCallToAction && actionSpecific : true;
  
  let score = hasCallToAction ? 7 : 3;
  if (actionSpecific) score += 3;
  
  return {
    passed,
    hasCallToAction,
    actionSpecific,
    detectedActions: detectedActions.slice(0, 3), // Limit to 3 actions
    score: Math.min(score, 10)
  };
}

/**
 * Validate basic op-ed structure
 */
function validateOpEdStructure(text: string): {
  passed: boolean;
  hasTitle: boolean;
  hasContent: boolean;
  paragraphCount: number;
  score: number;
} {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  const hasTitle = lines.length > 0 && lines[0].length > 15 && lines[0].length < 150;
  const hasContent = text.length > (hasTitle ? lines[0].length : 0) + 200;
  const paragraphCount = paragraphs.length;
  
  const passed = hasContent && paragraphCount >= 4; // Op-eds need more structure than articles
  
  let score = 0;
  if (hasContent) score += 5;
  if (paragraphCount >= 4) score += 5;
  if (hasTitle) score += 2;
  
  return {
    passed,
    hasTitle,
    hasContent,
    paragraphCount,
    score: Math.min(score, 10)
  };
}

/**
 * Validate placeholder text detection
 */
function validateOpEdPlaceholders(text: string): {
  passed: boolean;
  foundPlaceholders: string[];
  score: number;
} {
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
    /\bXXX\b/g,                    // XXX placeholders
    /\b_{2,}\b/g,                  // Multiple underscores
    /\b\.{3,}\b/g,                 // Multiple dots as placeholders
  ];

  const foundPlaceholders: string[] = [];

  placeholderPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      foundPlaceholders.push(...matches);
    }
  });

  const passed = foundPlaceholders.length === 0;
  const score = passed ? 10 : Math.max(0, 10 - (foundPlaceholders.length * 2));

  return {
    passed,
    foundPlaceholders: [...new Set(foundPlaceholders)], // Remove duplicates
    score
  };
}

/**
 * Create empty validation result for error cases
 */
function createEmptyValidationResult(minimumLength: number, errorMessage: string): OpEdValidationResult {
  return {
    isValid: false,
    overallScore: 0,
    issues: [errorMessage],
    warnings: [],
    validationDetails: {
      lengthCheck: { passed: false, actualLength: 0, minimumRequired: minimumLength, score: 0 },
      thesisCheck: { passed: false, hasThesis: false, thesisStrength: 0, score: 0 },
      argumentCheck: { passed: false, argumentCount: 0, evidencePresent: false, supportingPoints: [], score: 0 },
      synthesisCheck: { passed: false, synthesisQuality: 0, coherentNarrative: false, transitionQuality: 0, score: 0 },
      perspectiveCheck: { passed: false, opinionStrength: 0, personalVoice: false, voiceIndicators: [], score: 0 },
      callToActionCheck: { passed: false, hasCallToAction: false, actionSpecific: false, detectedActions: [], score: 0 },
      structureCheck: { passed: false, hasTitle: false, hasContent: false, paragraphCount: 0, score: 0 },
      placeholderCheck: { passed: false, foundPlaceholders: [], score: 0 }
    },
    recommendations: ['Provide valid op-ed text for validation']
  };
}

/**
 * Quick validation check for minimum op-ed standards
 */
export function quickValidateOpEd(text: string, minimumLength: number = 800): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const hasPlaceholders = /\[.*?\]|\{.*?\}|\bTODO\b|\bTBD\b/gi.test(text);
  const hasOpinionVoice = /\b(believe|should|must|argue|contend)\b/gi.test(text);
  const hasContent = text.trim().length > 200;
  
  return wordCount >= minimumLength && !hasPlaceholders && hasContent && hasOpinionVoice;
}