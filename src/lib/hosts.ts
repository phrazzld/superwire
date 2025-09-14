import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { IngestedArticle } from './ingestion';
import { EditorialDNA } from './editorial';
import { OpenRouterClient, TaskType } from './openrouter';

/**
 * Host personality and configuration types
 */
export interface HostCharacteristics {
  primary_focus: string;
  analytical_depth: number;
  empathy_level: number;
  energy_level: number;
  humor_frequency: number;
  optimism_level: number;
  spontaneity: number;
  skepticism_level?: number;
  irreverence_level?: number;
  risk_taking?: number;
  creativity?: number;
  compassion?: number;
  emotional_range: string;
  humor_style: string;
}

export interface SpeechPatterns {
  pace: string;
  vocabulary: string;
  sentence_structure: string;
  transition_phrases: string[];
}

export interface Host {
  name: string;
  voice_id: string;
  role: string;
  tagline: string;
  characteristics: HostCharacteristics;
  topics_of_interest: Record<string, number>;
  perspectives: string[];
  speech_patterns: SpeechPatterns;
  interaction_style: Record<string, string>;
  avoids?: string[];
  bridges?: string[];
  special_abilities?: string[];
}

export interface RotationRules {
  minimum_participation: number;
  maximum_participation: number;
  variety_threshold: number;
}

export interface PairingPreference {
  synergy: string;
  best_for: string[];
  dynamic: string;
}

export interface HostsConfig {
  hosts: Record<string, Host>;
  rotation_rules: RotationRules;
  pairing_preferences: Record<string, PairingPreference>;
}

export interface HostMatch {
  host: Host;
  score: number;
  matchedTopics: string[];
  reasoning: string;
}

// Cache for parsed configuration
let cachedConfig: HostsConfig | null = null;

/**
 * Load and parse the hosts configuration from YAML
 */
export function loadHostsConfig(): HostsConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configPath = path.join(process.cwd(), 'config', 'hosts.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    cachedConfig = yaml.load(fileContents) as HostsConfig;
    
    if (!cachedConfig || !cachedConfig.hosts) {
      throw new Error('Invalid hosts configuration: missing hosts object');
    }

    return cachedConfig;
  } catch (error) {
    console.error('Failed to load hosts configuration:', error);
    throw new Error(`Failed to load hosts.yaml: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all hosts as an array
 */
export function getHosts(): Host[] {
  const config = loadHostsConfig();
  return Object.values(config.hosts);
}

/**
 * Get a specific host by name
 */
export function getHostByName(name: string): Host | undefined {
  const config = loadHostsConfig();
  const hostKey = name.toLowerCase();
  return config.hosts[hostKey];
}

/**
 * Detect story type based on content - follows pattern from editorial.ts
 */
export function detectStoryType(story: IngestedArticle): string {
  const content = (story.content || '').toLowerCase();
  const title = (story.title || '').toLowerCase();
  const combined = `${title} ${content}`;
  
  // Story type detection with keywords
  if (combined.includes('research') || combined.includes('study') || combined.includes('discovery') || combined.includes('scientist')) {
    return 'scientific_research';
  } else if (combined.includes('government') || combined.includes('policy') || combined.includes('election') || combined.includes('political')) {
    return 'geopolitical_strategy';
  } else if (combined.includes('technology') || combined.includes('startup') || combined.includes('innovation') || combined.includes('ai') || combined.includes('tech')) {
    return 'technological_advancement';
  } else if (combined.includes('economy') || combined.includes('market') || combined.includes('inflation') || combined.includes('economic') || combined.includes('finance')) {
    return 'economic_indicators';
  } else if (combined.includes('culture') || combined.includes('social') || combined.includes('movement') || combined.includes('community') || combined.includes('rights')) {
    return 'cultural_evolution';
  } else if (combined.includes('climate') || combined.includes('environment') || combined.includes('renewable') || combined.includes('carbon')) {
    return 'climate_data';
  } else if (combined.includes('health') || combined.includes('medical') || combined.includes('healthcare') || combined.includes('mental')) {
    return 'healthcare';
  } else if (combined.includes('education') || combined.includes('school') || combined.includes('university') || combined.includes('student')) {
    return 'education';
  }
  
  return 'general_news'; // default
}

/**
 * Calculate topic relevance score for a story against host interests
 */
export function calculateHostTopicScore(story: IngestedArticle, host: Host): number {
  const content = (story.content || '').toLowerCase();
  const title = (story.title || '').toLowerCase();
  const combined = `${title} ${content}`;
  
  let maxScore = 0;
  const matchedTopics: string[] = [];
  
  // Topic keywords mapping - matches host topics_of_interest structure
  const topicKeywords: Record<string, string[]> = {
    technological_advancement: ['technology', 'tech', 'ai', 'artificial intelligence', 'innovation', 'startup', 'digital', 'software'],
    economic_indicators: ['economy', 'economic', 'market', 'inflation', 'gdp', 'finance', 'financial', 'trade', 'business'],
    scientific_research: ['research', 'study', 'discovery', 'scientist', 'science', 'breakthrough', 'experiment', 'finding'],
    geopolitical_strategy: ['government', 'political', 'policy', 'international', 'diplomatic', 'strategy', 'security', 'defense'],
    systems_analysis: ['system', 'infrastructure', 'network', 'platform', 'framework', 'architecture'],
    climate_data: ['climate', 'environment', 'carbon', 'renewable', 'solar', 'wind', 'energy', 'emissions', 'sustainability'],
    market_dynamics: ['market', 'trading', 'investment', 'stocks', 'financial', 'capital', 'assets'],
    social_justice: ['justice', 'rights', 'equality', 'discrimination', 'protest', 'activism', 'civil rights'],
    community_impacts: ['community', 'local', 'neighborhood', 'residents', 'families', 'impact', 'effect'],
    human_interest_stories: ['human', 'personal', 'story', 'individual', 'family', 'life', 'experience'],
    cultural_movements: ['culture', 'cultural', 'movement', 'trend', 'society', 'social change'],
    healthcare: ['health', 'medical', 'healthcare', 'hospital', 'doctor', 'medicine', 'treatment'],
    education: ['education', 'school', 'university', 'student', 'learning', 'teaching'],
    cultural_evolution: ['culture', 'cultural', 'evolution', 'generation', 'youth', 'trends', 'social'],
    human_rights: ['human rights', 'rights', 'freedom', 'liberty', 'dignity', 'oppression'],
    tech_culture: ['tech culture', 'silicon valley', 'startup culture', 'developer', 'programming'],
    social_movements: ['movement', 'protest', 'activism', 'organizing', 'campaign', 'advocacy'],
    digital_culture: ['digital', 'online', 'internet', 'social media', 'viral', 'meme'],
    emerging_communities: ['emerging', 'new community', 'subculture', 'underground', 'alternative']
  };
  
  for (const [topic, interest] of Object.entries(host.topics_of_interest)) {
    const keywords = topicKeywords[topic] || [topic.replace(/_/g, ' ')];
    const matchCount = keywords.filter(keyword => combined.includes(keyword)).length;
    
    if (matchCount > 0 && interest > 0) {
      const relevance = Math.min(matchCount / keywords.length, 1) * interest;
      if (relevance > maxScore) {
        maxScore = relevance;
      }
      if (relevance > 3) { // Only track significant matches
        matchedTopics.push(topic);
      }
    }
  }
  
  return maxScore;
}

/**
 * Calculate personality compatibility with story type
 */
export function calculatePersonalityScore(story: IngestedArticle, host: Host): number {
  const storyType = detectStoryType(story);
  const characteristics = host.characteristics;
  
  let personalityScore = 5; // base score
  
  // Adjust based on story type and host characteristics
  switch (storyType) {
    case 'scientific_research':
      personalityScore += characteristics.analytical_depth * 0.3;
      personalityScore += (10 - characteristics.spontaneity) * 0.1; // prefer structured approach
      break;
      
    case 'cultural_evolution':
    case 'social_movements':
      personalityScore += characteristics.empathy_level * 0.3;
      personalityScore += characteristics.energy_level * 0.2;
      personalityScore += (characteristics.creativity ?? 0) * 0.2;
      break;
      
    case 'economic_indicators':
      personalityScore += characteristics.analytical_depth * 0.4;
      personalityScore += (characteristics.skepticism_level || 5) * 0.2;
      break;
      
    case 'geopolitical_strategy':
      personalityScore += characteristics.analytical_depth * 0.3;
      personalityScore += (characteristics.skepticism_level || 5) * 0.2;
      personalityScore += characteristics.energy_level * 0.1;
      break;
      
    case 'healthcare':
    case 'human_interest_stories':
      personalityScore += characteristics.empathy_level * 0.4;
      personalityScore += (characteristics.compassion || 5) * 0.3;
      break;
      
    case 'technological_advancement':
      personalityScore += characteristics.analytical_depth * 0.2;
      personalityScore += characteristics.energy_level * 0.2;
      personalityScore += (characteristics.creativity || 5) * 0.2;
      break;
  }
  
  return Math.min(personalityScore, 10);
}

/**
 * Check if host should avoid this story based on their avoids list
 */
export function shouldHostAvoid(story: IngestedArticle, host: Host): boolean {
  if (!host.avoids || host.avoids.length === 0) return false;
  
  const content = (story.content || '').toLowerCase();
  const title = (story.title || '').toLowerCase();
  const combined = `${title} ${content}`;
  
  return host.avoids.some(avoid => {
    const avoidKeywords = avoid.replace(/_/g, ' ').split(' ');
    return avoidKeywords.some(keyword => combined.includes(keyword));
  });
}

/**
 * Select the best host for a given story based on topic interests and personality fit
 */
export function selectHostForStory(story: IngestedArticle, hosts?: Host[]): HostMatch {
  const availableHosts = hosts || getHosts();
  const matches: HostMatch[] = [];
  
  for (const host of availableHosts) {
    // Skip if host should avoid this type of content
    if (shouldHostAvoid(story, host)) {
      continue;
    }
    
    // Calculate topic relevance score
    const topicScore = calculateHostTopicScore(story, host);
    
    // Calculate personality compatibility score
    const personalityScore = calculatePersonalityScore(story, host);
    
    // Combined score (topic interest weighted more heavily)
    const totalScore = (topicScore * 0.7) + (personalityScore * 0.3);
    
    // Find matched topics for reasoning
    const matchedTopics: string[] = [];
    for (const [topic, interest] of Object.entries(host.topics_of_interest)) {
      if (interest >= 7) { // High interest topics
        const content = (story.content || '').toLowerCase();
        const title = (story.title || '').toLowerCase();
        const combined = `${title} ${content}`;
        const topicWords = topic.replace(/_/g, ' ');
        if (combined.includes(topicWords) || combined.includes(topic)) {
          matchedTopics.push(topic);
        }
      }
    }
    
    const reasoning = `Topic relevance: ${topicScore.toFixed(1)}/10, Personality fit: ${personalityScore.toFixed(1)}/10`;
    
    matches.push({
      host,
      score: totalScore,
      matchedTopics,
      reasoning
    });
  }
  
  // Sort by score and return the best match
  matches.sort((a, b) => b.score - a.score);
  
  // If no good matches, return the most versatile host (highest average topic interest)
  if (matches.length === 0 || matches[0].score < 2) {
    const fallbackHost = availableHosts.reduce((best, current) => {
      const currentAvg = Object.values(current.topics_of_interest).reduce((sum, val) => sum + val, 0) / Object.keys(current.topics_of_interest).length;
      const bestAvg = Object.values(best.topics_of_interest).reduce((sum, val) => sum + val, 0) / Object.keys(best.topics_of_interest).length;
      return currentAvg > bestAvg ? current : best;
    });
    
    return {
      host: fallbackHost,
      score: 2,
      matchedTopics: ['fallback_selection'],
      reasoning: 'Fallback selection - most versatile host'
    };
  }
  
  return matches[0];
}

/**
 * Select multiple hosts for a story (for dialogue/discussion segments)
 */
export function selectHostsForStory(story: IngestedArticle, count: number = 2, hosts?: Host[]): HostMatch[] {
  const availableHosts = hosts || getHosts();
  const matches: HostMatch[] = [];
  
  for (const host of availableHosts) {
    if (shouldHostAvoid(story, host)) continue;
    
    const topicScore = calculateHostTopicScore(story, host);
    const personalityScore = calculatePersonalityScore(story, host);
    const totalScore = (topicScore * 0.7) + (personalityScore * 0.3);
    
    const matchedTopics: string[] = [];
    for (const [topic, interest] of Object.entries(host.topics_of_interest)) {
      if (interest >= 6) {
        const content = (story.content || '').toLowerCase();
        const title = (story.title || '').toLowerCase();
        const combined = `${title} ${content}`;
        const topicWords = topic.replace(/_/g, ' ');
        if (combined.includes(topicWords)) {
          matchedTopics.push(topic);
        }
      }
    }
    
    matches.push({
      host,
      score: totalScore,
      matchedTopics,
      reasoning: `Topic: ${topicScore.toFixed(1)}, Personality: ${personalityScore.toFixed(1)}`
    });
  }
  
  // Sort by score and return top matches
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, Math.min(count, matches.length));
}

/**
 * Get host pairing preference for two hosts
 */
export function getHostPairingPreference(host1: Host, host2: Host): PairingPreference | undefined {
  const config = loadHostsConfig();
  const pairKey1 = `${host1.name.toLowerCase()}_${host2.name.toLowerCase()}`;
  const pairKey2 = `${host2.name.toLowerCase()}_${host1.name.toLowerCase()}`;
  
  return config.pairing_preferences[pairKey1] || config.pairing_preferences[pairKey2];
}

/**
 * Interface for dialogue generation results
 */
export interface HostDialogue {
  dialogue: string;
  host1Name: string;
  host2Name: string;
  storyTitle: string;
  interactionType: string;
  wordCount: number;
}

/**
 * Interface for multi-host discussion results
 */
export interface HostDiscussion {
  discussion: string;
  hostNames: string[];
  storyTitle: string;
  interactionType: string;
  wordCount: number;
  participantCount: number;
  averageTurnsPerHost: number;
  complexityLevel: number;
}

/**
 * Interface for discussion generation options
 */
export interface DiscussionOptions {
  discussionLength?: number;        // Target word count (default: 500-600)
  includeDebate?: boolean;          // Allow disagreement/tension (default: false)
  focusAreas?: string[];            // Specific aspects to emphasize
  allowInterruptions?: boolean;     // Enable natural interruptions (default: true)
  targetTurns?: number;             // Speaking turns per host (default: 3-4)
  balanceParticipation?: boolean;   // Ensure equal speaking time (default: true)
  editorialDNA?: EditorialDNA;      // Editorial perspective integration
  openRouterClient?: OpenRouterClient;
  complexityThreshold?: number;     // Minimum story complexity for detailed discussion
}

/**
 * Generate back-and-forth dialogue between two hosts discussing a story
 */
export async function generateHostDialogue(
  story: IngestedArticle,
  host1: Host,
  host2: Host,
  openRouterClient?: OpenRouterClient
): Promise<HostDialogue> {
  // Create OpenRouter client if not provided
  const client = openRouterClient || new OpenRouterClient();
  
  // Get pairing preference to understand their dynamic
  const pairingPref = getHostPairingPreference(host1, host2);
  const interactionDynamic = pairingPref?.dynamic || 'collaborative_discussion';
  
  // Extract story key points for focused discussion
  const storyTitle = story.title || 'Breaking News';
  const storyContent = story.content || story.title || '';
  const storyExcerpt = storyContent.substring(0, 500) + (storyContent.length > 500 ? '...' : '');
  
  // Build comprehensive system prompt incorporating both host personalities
  const systemPrompt = `You are generating a natural dialogue between two news podcast hosts discussing a current story.

HOST PROFILES:

${host1.name.toUpperCase()}:
- Role: ${host1.role}
- Primary Focus: ${host1.characteristics.primary_focus}
- Analytical Depth: ${host1.characteristics.analytical_depth}/10
- Empathy Level: ${host1.characteristics.empathy_level}/10
- Energy Level: ${host1.characteristics.energy_level}/10
- Speech Pace: ${host1.speech_patterns.pace}
- Vocabulary Style: ${host1.speech_patterns.vocabulary}
- Typical Perspectives: ${host1.perspectives.slice(0, 3).join(', ')}
- Transition Phrases: ${host1.speech_patterns.transition_phrases.slice(0, 3).join(', ')}

${host2.name.toUpperCase()}:
- Role: ${host2.role}
- Primary Focus: ${host2.characteristics.primary_focus}
- Analytical Depth: ${host2.characteristics.analytical_depth}/10
- Empathy Level: ${host2.characteristics.empathy_level}/10
- Energy Level: ${host2.characteristics.energy_level}/10
- Speech Pace: ${host2.speech_patterns.pace}
- Vocabulary Style: ${host2.speech_patterns.vocabulary}
- Typical Perspectives: ${host2.perspectives.slice(0, 3).join(', ')}
- Transition Phrases: ${host2.speech_patterns.transition_phrases.slice(0, 3).join(', ')}

INTERACTION DYNAMIC: ${interactionDynamic}
${pairingPref ? `Best suited for: ${pairingPref.best_for.join(', ')}` : ''}

DIALOGUE REQUIREMENTS:
1. Each host should speak 3-4 times in natural alternation
2. Maintain distinct personality voices based on their characteristics
3. Use their typical transition phrases and vocabulary styles naturally
4. ${host1.name} should emphasize their ${host1.characteristics.primary_focus}
5. ${host2.name} should emphasize their ${host2.characteristics.primary_focus}
6. Keep the total dialogue to 200-300 words
7. Make it feel like a genuine conversation, not scripted
8. Include natural interruptions or building on each other's points
9. End with a smooth transition that could lead to the next segment

Format as:
${host1.name}: [dialogue]
${host2.name}: [dialogue]
${host1.name}: [dialogue]
[etc.]`;

  const userPrompt = `Generate a dialogue between ${host1.name} and ${host2.name} discussing this news story:

STORY TITLE: ${storyTitle}

STORY CONTENT: ${storyExcerpt}

Create a natural back-and-forth discussion that showcases both hosts' unique perspectives and personalities while covering the key aspects of this story.`;

  try {
    // Use OpenRouter to generate the dialogue
    const response = await client.completeTask(
      TaskType.DIALOGUE_GENERATION,
      userPrompt,
      {
        systemPrompt
      }
    );

    // Extract dialogue from response
    const dialogue = response.content.trim();
    
    // Calculate word count (rough estimate)
    const wordCount = dialogue.split(/\s+/).length;
    
    return {
      dialogue,
      host1Name: host1.name,
      host2Name: host2.name,
      storyTitle,
      interactionType: interactionDynamic,
      wordCount
    };
    
  } catch (error) {
    console.error('Failed to generate host dialogue:', error);
    
    // Fallback dialogue if generation fails
    const fallbackDialogue = `${host1.name}: Let's dive into this developing story about ${storyTitle}.

${host2.name}: ${host2.speech_patterns.transition_phrases[0]} this really highlights the ${host2.characteristics.primary_focus} aspect we need to consider.

${host1.name}: ${host1.speech_patterns.transition_phrases[0]} we're looking at some significant implications here that our listeners should understand.

${host2.name}: Absolutely. ${host2.speech_patterns.transition_phrases[1] || "What strikes me is"} how this connects to broader patterns we've been tracking.`;

    return {
      dialogue: fallbackDialogue,
      host1Name: host1.name,
      host2Name: host2.name,
      storyTitle,
      interactionType: 'fallback_dialogue',
      wordCount: fallbackDialogue.split(/\s+/).length
    };
  }
}

/**
 * Generate dialogue specifically optimized for certain story types
 */
export async function generateHostDialogueForStoryType(
  story: IngestedArticle,
  storyType: string,
  openRouterClient?: OpenRouterClient
): Promise<HostDialogue> {
  // Select the best host pairing for this story type
  const allHosts = getHosts();
  const bestHosts = selectHostsForStory(story, 2, allHosts);
  
  if (bestHosts.length < 2) {
    throw new Error('Could not find suitable host pairing for dialogue');
  }
  
  return generateHostDialogue(
    story,
    bestHosts[0].host,
    bestHosts[1].host,
    openRouterClient
  );
}

/**
 * Generate multi-host discussion for complex topics requiring diverse perspectives
 */
export async function generateDiscussion(
  story: IngestedArticle,
  hosts: Host[],
  options: DiscussionOptions = {}
): Promise<HostDiscussion> {
  const {
    discussionLength = 550,
    includeDebate = false,
    focusAreas = [],
    allowInterruptions = true,
    targetTurns = 3,
    balanceParticipation = true,
    editorialDNA,
    openRouterClient,
    complexityThreshold = 7
  } = options;

  if (hosts.length < 2) {
    throw new Error('Discussion requires at least 2 hosts');
  }

  if (hosts.length > 4) {
    console.warn('More than 4 hosts may result in less coherent discussion, limiting to 4');
    hosts = hosts.slice(0, 4);
  }

  // Create OpenRouter client if not provided
  const client = openRouterClient || new OpenRouterClient();
  
  // Analyze story complexity and extract key information
  const storyTitle = story.title || 'Breaking News';
  const storyContent = story.content || story.title || '';
  const storyExcerpt = storyContent.substring(0, 800) + (storyContent.length > 800 ? '...' : '');
  const storyComplexity = analyzeStoryComplexity(story);
  const keyThemes = extractKeyThemes(story);
  
  // If story isn't complex enough, fall back to regular two-host dialogue
  if (storyComplexity < complexityThreshold && hosts.length > 2) {
    console.log(`Story complexity (${storyComplexity}) below threshold, using two-host dialogue`);
    return generateHostDialogue(story, hosts[0], hosts[1], client).then(dialogue => ({
      discussion: dialogue.dialogue,
      hostNames: [dialogue.host1Name, dialogue.host2Name],
      storyTitle: dialogue.storyTitle,
      interactionType: dialogue.interactionType,
      wordCount: dialogue.wordCount,
      participantCount: 2,
      averageTurnsPerHost: 3.5,
      complexityLevel: storyComplexity
    }));
  }

  // Build system prompt for multi-host discussion
  const systemPrompt = buildMultiHostSystemPrompt(hosts, story, options, storyComplexity, keyThemes);
  
  // Build user prompt with story context
  const userPrompt = buildMultiHostUserPrompt(story, hosts, options, keyThemes);

  try {
    // Use OpenRouter to generate the discussion
    const response = await client.completeTask(
      TaskType.DIALOGUE_GENERATION, // Routes to GPT-4o
      userPrompt,
      {
        systemPrompt,
        temperature: includeDebate ? 0.8 : 0.7, // Higher temperature for debates
        maxTokens: Math.round(discussionLength * 1.3), // Allow some buffer
        trackCosts: true
      }
    );

    // Extract discussion from response
    const discussion = response.content.trim();
    
    // Calculate discussion metrics
    const wordCount = discussion.split(/\s+/).length;
    const estimatedTurns = estimateHostTurns(discussion, hosts);
    const averageTurns = estimatedTurns / hosts.length;
    
    // Log cost information for monitoring
    if (response.cost) {
      console.log(`Multi-host discussion cost: $${response.cost.toFixed(4)} using ${response.model}`);
    }
    
    return {
      discussion,
      hostNames: hosts.map(h => h.name),
      storyTitle,
      interactionType: includeDebate ? 'multi_host_debate' : 'multi_host_discussion',
      wordCount,
      participantCount: hosts.length,
      averageTurnsPerHost: Math.round(averageTurns * 10) / 10,
      complexityLevel: storyComplexity
    };
    
  } catch (error) {
    console.error('Failed to generate multi-host discussion:', error);
    
    // Fallback discussion if generation fails
    const fallbackDiscussion = generateFallbackDiscussion(hosts, story, storyTitle);
    
    return {
      discussion: fallbackDiscussion,
      hostNames: hosts.map(h => h.name),
      storyTitle,
      interactionType: 'fallback_discussion',
      wordCount: fallbackDiscussion.split(/\s+/).length,
      participantCount: hosts.length,
      averageTurnsPerHost: 2.5,
      complexityLevel: storyComplexity
    };
  }
}

/**
 * Analyze story complexity on a 1-10 scale for discussion planning
 */
function analyzeStoryComplexity(story: IngestedArticle): number {
  let complexity = 5; // Base complexity score
  
  const content = (story.content || story.title || '').toLowerCase();
  const title = (story.title || '').toLowerCase();
  
  // Complexity indicators
  const complexityKeywords = [
    'implications', 'consequences', 'systemic', 'unprecedented', 'paradigm',
    'multifaceted', 'interconnected', 'nuanced', 'paradox', 'tension',
    'analysis', 'framework', 'methodology', 'correlation', 'causation',
    'infrastructure', 'ecosystem', 'stakeholder', 'geopolitical', 'macroeconomic'
  ];
  
  const complexityCount = complexityKeywords.filter(keyword => 
    content.includes(keyword) || title.includes(keyword)
  ).length;
  
  complexity += Math.min(complexityCount * 0.5, 3); // Up to +3 for complexity keywords
  
  // Multi-sector stories are more complex
  const sectors = ['economic', 'political', 'social', 'technological', 'environmental', 'legal'];
  const sectorCount = sectors.filter(sector => content.includes(sector)).length;
  if (sectorCount >= 3) complexity += 2;
  else if (sectorCount >= 2) complexity += 1;
  
  // International/global scope adds complexity
  const globalKeywords = ['international', 'global', 'worldwide', 'cross-border', 'multinational'];
  if (globalKeywords.some(keyword => content.includes(keyword))) {
    complexity += 1;
  }
  
  // Technical/scientific content adds complexity
  const technicalKeywords = ['algorithm', 'data', 'research', 'study', 'methodology', 'statistics'];
  if (technicalKeywords.some(keyword => content.includes(keyword))) {
    complexity += 1;
  }
  
  // Controversy/debate indicators add complexity
  const debateKeywords = ['controversy', 'debate', 'opposing', 'critics', 'supporters', 'divided'];
  if (debateKeywords.some(keyword => content.includes(keyword))) {
    complexity += 1;
  }
  
  return Math.max(1, Math.min(complexity, 10));
}

/**
 * Extract key themes from story content for focused discussion
 */
function extractKeyThemes(story: IngestedArticle): string[] {
  const content = (story.content || story.title || '').toLowerCase();
  const title = (story.title || '').toLowerCase();
  
  const themeCategories: { [key: string]: string[] } = {
    'Technology': ['ai', 'artificial intelligence', 'automation', 'digital', 'cyber', 'blockchain', 'data'],
    'Economy': ['economic', 'market', 'financial', 'business', 'trade', 'inflation', 'employment'],
    'Politics': ['political', 'government', 'policy', 'regulation', 'election', 'congress', 'senate'],
    'Social Impact': ['social', 'community', 'inequality', 'rights', 'justice', 'diversity', 'inclusion'],
    'Environment': ['climate', 'environment', 'renewable', 'sustainability', 'emissions', 'green'],
    'Health': ['health', 'medical', 'healthcare', 'disease', 'treatment', 'vaccine', 'wellness'],
    'International': ['international', 'global', 'foreign', 'diplomatic', 'trade', 'relations'],
    'Innovation': ['innovation', 'breakthrough', 'research', 'development', 'discovery', 'advancement'],
    'Ethics': ['ethical', 'moral', 'responsibility', 'accountability', 'transparency', 'privacy'],
    'Future Trends': ['future', 'prediction', 'forecast', 'projection', 'trend', 'emerging']
  };
  
  const detectedThemes: string[] = [];
  const text = `${title} ${content}`;
  
  Object.entries(themeCategories).forEach(([theme, keywords]) => {
    const matches = keywords.filter(keyword => text.includes(keyword)).length;
    if (matches >= 2) {
      detectedThemes.push(theme);
    } else if (matches === 1 && title.includes(keywords[0])) {
      // Single match in title counts as theme
      detectedThemes.push(theme);
    }
  });
  
  // Return top 3 most relevant themes
  return detectedThemes.slice(0, 3);
}

/**
 * Build comprehensive system prompt for multi-host discussion
 */
function buildMultiHostSystemPrompt(
  hosts: Host[],
  story: IngestedArticle,
  options: DiscussionOptions,
  storyComplexity: number,
  keyThemes: string[]
): string {
  const hostCount = hosts.length;
  const targetTurns = options.targetTurns || 3;
  const discussionLength = options.discussionLength || 550;
  
  let systemPrompt = `You are generating a natural multi-host discussion between ${hostCount} experienced news podcast hosts analyzing a complex news story.

HOST PERSONALITIES AND DYNAMICS:
${hosts.map((host, index) => `
${host.name.toUpperCase()} (Host ${index + 1}):
- Role: ${host.role}
- Primary Focus: ${host.characteristics.primary_focus}
- Analytical Depth: ${host.characteristics.analytical_depth}/10
- Empathy Level: ${host.characteristics.empathy_level}/10
- Energy Level: ${host.characteristics.energy_level}/10
- Speech Pace: ${host.speech_patterns.pace}
- Vocabulary: ${host.speech_patterns.vocabulary}
- Key Perspectives: ${host.perspectives.slice(0, 2).join(', ')}
- Signature Phrases: "${host.speech_patterns.transition_phrases.slice(0, 2).join('", "')}"
`).join('')}

STORY ANALYSIS:
- Complexity Level: ${storyComplexity}/10 (${storyComplexity >= 8 ? 'Highly Complex' : storyComplexity >= 6 ? 'Moderately Complex' : 'Standard Complexity'})
- Key Themes: ${keyThemes.length > 0 ? keyThemes.join(', ') : 'General news analysis'}
- Discussion Type: ${options.includeDebate ? 'Analytical Debate' : 'Collaborative Exploration'}

DISCUSSION REQUIREMENTS:
- Total length: ${discussionLength} words
- Each host should speak ${targetTurns} times naturally
- Maintain distinct personality voices throughout
- ${options.allowInterruptions ? 'Include natural interruptions and building on ideas' : 'Use orderly turn-taking'}
- ${options.includeDebate ? 'Allow respectful disagreement when perspectives differ' : 'Focus on collaborative exploration'}
- ${options.focusAreas?.length ? `Emphasize these aspects: ${options.focusAreas.join(', ')}` : 'Cover all major aspects organically'}
- End with synthesis or forward-looking perspective

MULTI-HOST INTERACTION GUIDELINES:
1. Natural conversation flow with organic turn-taking
2. Each host brings their unique expertise and perspective
3. Build on each other's insights authentically
4. ${hostCount >= 3 ? 'Manage multiple voices without chaos - clear speaker transitions' : 'Maintain dialogue rhythm'}
5. Show genuine listening and response to other hosts' points
6. Include personality-appropriate reactions and interjections
7. Vary conversation dynamics (agreement, building, questioning, synthesizing)

CONVERSATION STRUCTURE:
- Opening: Most energetic/relevant host introduces the complexity
- Development: Organic exploration with each host contributing their perspective
- Interaction: Natural building on ideas with ${options.allowInterruptions ? 'interruptions and' : ''} responses
- Synthesis: Collaborative conclusion that ties insights together

FORMAT: Use clear speaker labels (${hosts.map(h => h.name).join(', ')}) with natural conversation flow.
Generate engaging, authentic multi-host dialogue that showcases each host's unique expertise.`;

  return systemPrompt;
}

/**
 * Build user prompt for multi-host discussion with story context
 */
function buildMultiHostUserPrompt(
  story: IngestedArticle,
  hosts: Host[],
  options: DiscussionOptions,
  keyThemes: string[]
): string {
  const storyTitle = story.title || 'Breaking News';
  const storyContent = story.content || story.title || '';
  const storyExcerpt = storyContent.substring(0, 800) + (storyContent.length > 800 ? '...' : '');
  
  const hostExpertise = hosts.map(host => {
    const score = calculateHostTopicScore(story, host);
    return `${host.name}: ${host.characteristics.primary_focus} (relevance: ${score.toFixed(1)}/10)`;
  }).join('\n- ');

  return `Generate a ${options.includeDebate ? 'debate-style' : 'collaborative'} discussion between ${hosts.map(h => h.name).join(', ')} about this complex news story:

STORY TITLE: ${storyTitle}

STORY CONTENT: ${storyExcerpt}

HOST EXPERTISE FOR THIS STORY:
- ${hostExpertise}

KEY THEMES TO EXPLORE: ${keyThemes.length > 0 ? keyThemes.join(', ') : 'Multi-faceted analysis'}
${options.focusAreas?.length ? `\nSPECIFIC FOCUS AREAS: ${options.focusAreas.join(', ')}` : ''}

Create a natural multi-host conversation that:
1. Leverages each host's unique expertise and perspective
2. Explores the story's complexity from multiple angles
3. Shows authentic interaction between the hosts
4. ${options.includeDebate ? 'Includes respectful disagreement where perspectives differ' : 'Builds collaboratively on shared insights'}
5. Synthesizes different viewpoints into comprehensive understanding

Generate engaging dialogue that demonstrates why this story benefits from multiple expert perspectives.`;
}

/**
 * Estimate number of speaking turns in discussion by counting host names
 */
function estimateHostTurns(discussion: string, hosts: Host[]): number {
  const hostNames = hosts.map(h => h.name);
  let totalTurns = 0;
  
  hostNames.forEach(name => {
    // Count occurrences of "HostName:" at start of lines
    const regex = new RegExp(`^${name}:`, 'gm');
    const matches = discussion.match(regex);
    totalTurns += matches ? matches.length : 0;
  });
  
  return totalTurns;
}

/**
 * Generate fallback discussion if AI generation fails
 */
function generateFallbackDiscussion(hosts: Host[], story: IngestedArticle, storyTitle: string): string {
  const hostNames = hosts.map(h => h.name);
  
  let fallback = `${hostNames[0]}: This ${storyTitle} story raises some important questions we should explore together.\n\n`;
  
  if (hosts.length >= 2) {
    const host2 = hosts[1];
    fallback += `${host2.name}: ${host2.speech_patterns.transition_phrases[0] || "What strikes me is"} how this connects to the ${host2.characteristics.primary_focus} implications we've been tracking.\n\n`;
  }
  
  if (hosts.length >= 3) {
    const host3 = hosts[2];
    fallback += `${host3.name}: ${host3.speech_patterns.transition_phrases[0] || "From my perspective"}, the ${host3.characteristics.primary_focus} angle adds another crucial dimension to consider.\n\n`;
  }
  
  fallback += `${hostNames[0]}: ${hosts[0].speech_patterns.transition_phrases[1] || "Looking ahead"}, these developments will likely have lasting implications that our listeners need to understand.\n\n`;
  
  if (hosts.length >= 2) {
    fallback += `${hostNames[1]}: Absolutely. The interconnected nature of these issues means we're looking at something that will shape the landscape for years to come.`;
  }
  
  return fallback;
}

/**
 * Interface for host consistency validation results
 */
export interface HostConsistencyResult {
  isConsistent: boolean;
  overallScore: number;
  issues: string[];
  strengths: string[];
  personalityMatches: {
    vocabulary: number;
    speechPace: number;
    transitionPhrases: number;
    analyticalDepth: number;
    empathyLevel: number;
    energyLevel: number;
    topicFocus: number;
  };
  recommendations: string[];
}

/**
 * Validate that generated text matches host personality traits
 */
export function maintainHostConsistency(text: string, host: Host): HostConsistencyResult {
  if (!text || text.trim().length === 0) {
    return {
      isConsistent: false,
      overallScore: 0,
      issues: ['Empty or missing text content'],
      strengths: [],
      personalityMatches: {
        vocabulary: 0, speechPace: 0, transitionPhrases: 0,
        analyticalDepth: 0, empathyLevel: 0, energyLevel: 0, topicFocus: 0
      },
      recommendations: ['Provide valid text content for analysis']
    };
  }

  const cleanedText = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
  
  const issues: string[] = [];
  const strengths: string[] = [];
  const recommendations: string[] = [];
  
  // 1. Vocabulary Style Analysis
  const vocabularyScore = analyzeVocabularyConsistency(cleanedText, host);
  if (vocabularyScore < 4) {
    issues.push(`Vocabulary style doesn't match ${host.name}'s ${host.speech_patterns.vocabulary} style`);
    recommendations.push(`Use more ${host.speech_patterns.vocabulary} vocabulary appropriate for ${host.name}`);
  } else if (vocabularyScore >= 7) {
    strengths.push(`Excellent vocabulary alignment with ${host.name}'s ${host.speech_patterns.vocabulary} style`);
  }
  
  // 2. Speech Pace Analysis  
  const speechPaceScore = analyzeSpeechPace(avgSentenceLength, sentences, host);
  if (speechPaceScore < 4) {
    const paceAdvice = host.speech_patterns.pace === 'rapid_fire' ? 
      'shorter, punchier sentences' : 
      host.speech_patterns.pace === 'measured' ? 
      'more deliberate, structured sentences' : 
      'conversational flow with varied sentence length';
    issues.push(`Speech pace doesn't align with ${host.name}'s ${host.speech_patterns.pace} delivery`);
    recommendations.push(`Adjust to ${paceAdvice} to match ${host.name}'s style`);
  } else if (speechPaceScore >= 7) {
    strengths.push(`Speech pacing matches ${host.name}'s ${host.speech_patterns.pace} style well`);
  }
  
  // 3. Transition Phrases Usage
  const transitionScore = analyzeTransitionPhrases(cleanedText, host);
  if (transitionScore < 4) {
    issues.push(`Missing ${host.name}'s characteristic transition phrases`);
    recommendations.push(`Include phrases like: "${host.speech_patterns.transition_phrases.slice(0, 2).join('", "')}"`);
  } else if (transitionScore >= 7) {
    strengths.push(`Uses ${host.name}'s characteristic transition phrases naturally`);
  }
  
  // 4. Analytical Depth Assessment
  const analyticalScore = analyzeAnalyticalDepth(cleanedText, host.characteristics.analytical_depth);
  if (Math.abs(analyticalScore - host.characteristics.analytical_depth) > 3) {
    const expectedDepth = host.characteristics.analytical_depth > 7 ? 'highly analytical' :
                         host.characteristics.analytical_depth > 4 ? 'moderately analytical' : 'accessible';
    issues.push(`Analytical depth mismatch - should be more ${expectedDepth} for ${host.name}`);
    recommendations.push(`Adjust analytical complexity to match ${host.name}'s ${expectedDepth} approach`);
  } else if (Math.abs(analyticalScore - host.characteristics.analytical_depth) <= 1) {
    strengths.push(`Analytical depth perfectly matches ${host.name}'s approach`);
  }
  
  // 5. Empathy Level Assessment
  const empathyScore = analyzeEmpathyLevel(cleanedText, host.characteristics.empathy_level);
  if (Math.abs(empathyScore - host.characteristics.empathy_level) > 3) {
    const expectedEmpathy = host.characteristics.empathy_level > 7 ? 'highly empathetic' :
                           host.characteristics.empathy_level > 4 ? 'moderately empathetic' : 'professionally distant';
    issues.push(`Empathy level doesn't match ${host.name}'s ${expectedEmpathy} nature`);
    recommendations.push(`Adjust emotional tone to be more ${expectedEmpathy}`);
  } else if (Math.abs(empathyScore - host.characteristics.empathy_level) <= 1) {
    strengths.push(`Empathy level aligns well with ${host.name}'s emotional range`);
  }
  
  // 6. Energy Level Assessment
  const energyScore = analyzeEnergyLevel(cleanedText, sentences, host.characteristics.energy_level);
  if (Math.abs(energyScore - host.characteristics.energy_level) > 3) {
    const expectedEnergy = host.characteristics.energy_level > 7 ? 'high-energy' :
                          host.characteristics.energy_level > 4 ? 'moderate energy' : 'calm and measured';
    issues.push(`Energy level doesn't match ${host.name}'s ${expectedEnergy} delivery`);
    recommendations.push(`Adjust tone and pacing to be more ${expectedEnergy}`);
  } else if (Math.abs(energyScore - host.characteristics.energy_level) <= 1) {
    strengths.push(`Energy level matches ${host.name}'s ${host.characteristics.energy_level}/10 energy signature`);
  }
  
  // 7. Topic Focus Analysis
  const topicFocusScore = analyzeTopicFocus(cleanedText, host);
  if (topicFocusScore < 4) {
    const primaryFocus = host.characteristics.primary_focus.replace(/_/g, ' ');
    issues.push(`Content doesn't align with ${host.name}'s focus on ${primaryFocus}`);
    recommendations.push(`Frame content more around ${primaryFocus} aspects`);
  } else if (topicFocusScore >= 7) {
    strengths.push(`Content aligns well with ${host.name}'s expertise areas`);
  }
  
  // Calculate overall score (weighted average)
  const personalityMatches = {
    vocabulary: vocabularyScore,
    speechPace: speechPaceScore,
    transitionPhrases: transitionScore,
    analyticalDepth: Math.max(0, 10 - Math.abs(analyticalScore - host.characteristics.analytical_depth)),
    empathyLevel: Math.max(0, 10 - Math.abs(empathyScore - host.characteristics.empathy_level)),
    energyLevel: Math.max(0, 10 - Math.abs(energyScore - host.characteristics.energy_level)),
    topicFocus: topicFocusScore
  };
  
  // Weighted overall score (following editorial scoring patterns)
  const weights = { vocabulary: 1.5, speechPace: 1.2, transitionPhrases: 1.0, 
                   analyticalDepth: 2.0, empathyLevel: 1.8, energyLevel: 1.3, topicFocus: 1.7 };
  
  const weightedScore = Object.entries(personalityMatches).reduce((sum, [key, score]) => {
    return sum + (score * weights[key as keyof typeof weights]);
  }, 0);
  
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const overallScore = Math.round((weightedScore / totalWeight) * 10) / 10;
  
  // Consistency threshold (following editorial patterns)
  const isConsistent = overallScore >= 6.0 && issues.length <= 2;
  
  // Add general recommendations if score is borderline
  if (overallScore >= 4 && overallScore < 6) {
    recommendations.push(`Overall personality alignment needs improvement (${overallScore}/10)`);
  } else if (overallScore >= 6 && overallScore < 8) {
    recommendations.push('Good personality alignment with minor adjustments needed');
  }
  
  return {
    isConsistent,
    overallScore,
    issues,
    strengths,
    personalityMatches,
    recommendations
  };
}

/**
 * Analyze vocabulary style consistency with host preferences
 */
function analyzeVocabularyConsistency(text: string, host: Host): number {
  const vocabularyStyle = host.speech_patterns.vocabulary;
  
  // Define vocabulary indicators for each style
  const vocabularyPatterns: Record<string, string[]> = {
    'precise': ['specifically', 'exactly', 'precisely', 'particular', 'distinct', 'defined', 'clear'],
    'accessible': ['basically', 'simply', 'essentially', 'in other words', 'put simply', 'clearly'],
    'contemporary': ['literally', 'actually', 'honestly', 'totally', 'definitely', 'obviously'],
    'technical': ['system', 'process', 'mechanism', 'framework', 'methodology', 'analysis']
  };
  
  const patterns = vocabularyPatterns[vocabularyStyle] || vocabularyPatterns['accessible'];
  const matches = patterns.filter(pattern => text.includes(pattern)).length;
  
  // Bonus for avoiding inappropriate vocabulary styles
  let penaltyScore = 0;
  if (vocabularyStyle === 'precise' && (text.includes('like') || text.includes('kinda') || text.includes('sorta'))) {
    penaltyScore += 2;
  }
  if (vocabularyStyle === 'accessible' && text.split(' ').some(word => word.length > 12)) {
    penaltyScore += 1; // Penalty for overly complex words
  }
  
  const baseScore = Math.min((matches / patterns.length) * 10, 10);
  return Math.max(0, baseScore - penaltyScore);
}

/**
 * Analyze speech pace alignment with host characteristics
 */
function analyzeSpeechPace(avgSentenceLength: number, sentences: string[], host: Host): number {
  const pace = host.speech_patterns.pace;
  
  let paceScore = 5; // base score
  
  switch (pace) {
    case 'rapid_fire':
      // Prefer shorter sentences (8-12 words), more exclamation points
      if (avgSentenceLength <= 12) paceScore += 3;
      if (sentences.some(s => s.includes('!'))) paceScore += 2;
      if (avgSentenceLength > 20) paceScore -= 3;
      break;
      
    case 'measured':
      // Prefer longer, structured sentences (15-25 words)
      if (avgSentenceLength >= 15 && avgSentenceLength <= 25) paceScore += 3;
      if (sentences.some(s => s.includes(','))) paceScore += 2; // Complex sentences
      if (avgSentenceLength < 10) paceScore -= 3;
      break;
      
    case 'conversational':
      // Prefer varied sentence length (10-18 words average)
      if (avgSentenceLength >= 10 && avgSentenceLength <= 18) paceScore += 3;
      const lengthVariation = sentences.length > 1 ? 
        Math.max(...sentences.map(s => s.split(' ').length)) - Math.min(...sentences.map(s => s.split(' ').length)) : 0;
      if (lengthVariation > 5) paceScore += 2; // Good variation
      break;
  }
  
  return Math.min(Math.max(paceScore, 0), 10);
}

/**
 * Analyze usage of host's characteristic transition phrases
 */
function analyzeTransitionPhrases(text: string, host: Host): number {
  const hostPhrases = host.speech_patterns.transition_phrases;
  
  let matchCount = 0;
  let partialMatchCount = 0;
  
  for (const phrase of hostPhrases) {
    if (text.includes(phrase.toLowerCase())) {
      matchCount++;
    } else {
      // Check for partial matches (key words from phrases)
      const keyWords = phrase.toLowerCase().split(' ').filter(word => word.length > 3);
      if (keyWords.some(word => text.includes(word))) {
        partialMatchCount++;
      }
    }
  }
  
  // Score based on exact matches with bonus for partial matches
  const exactScore = (matchCount / hostPhrases.length) * 8;
  const partialScore = (partialMatchCount / hostPhrases.length) * 2;
  
  return Math.min(exactScore + partialScore, 10);
}

/**
 * Analyze analytical depth of content
 */
function analyzeAnalyticalDepth(text: string, expectedDepth: number): number {
  const analyticalIndicators = [
    'data', 'analysis', 'research', 'study', 'evidence', 'statistics',
    'pattern', 'trend', 'correlation', 'implication', 'consequence',
    'system', 'structure', 'framework', 'methodology', 'approach'
  ];
  
  const depthIndicators = [
    'because', 'therefore', 'however', 'furthermore', 'moreover',
    'specifically', 'particularly', 'notably', 'significantly'
  ];
  
  const analyticalMatches = analyticalIndicators.filter(indicator => text.includes(indicator)).length;
  const depthMatches = depthIndicators.filter(indicator => text.includes(indicator)).length;
  
  // Calculate based on density of analytical language
  const analyticalDensity = (analyticalMatches / text.split(' ').length) * 1000;
  const depthDensity = (depthMatches / text.split(' ').length) * 1000;
  
  const estimatedDepth = Math.min((analyticalDensity + depthDensity) * 2, 10);
  
  return estimatedDepth;
}

/**
 * Analyze empathy level expressed in content
 */
function analyzeEmpathyLevel(text: string, expectedEmpathy: number): number {
  const empathyIndicators = [
    'people', 'families', 'community', 'individuals', 'personal',
    'human', 'feel', 'impact', 'affect', 'experience', 'struggle',
    'hope', 'concern', 'care', 'support', 'help', 'understand'
  ];
  
  const emotionalIndicators = [
    'heart', 'difficult', 'challenging', 'important', 'critical',
    'unfortunately', 'fortunately', 'sadly', 'hopefully', 'worried'
  ];
  
  const empathyMatches = empathyIndicators.filter(indicator => text.includes(indicator)).length;
  const emotionalMatches = emotionalIndicators.filter(indicator => text.includes(indicator)).length;
  
  const empathyDensity = (empathyMatches / text.split(' ').length) * 1000;
  const emotionalDensity = (emotionalMatches / text.split(' ').length) * 1000;
  
  const estimatedEmpathy = Math.min((empathyDensity + emotionalDensity) * 1.5, 10);
  
  return estimatedEmpathy;
}

/**
 * Analyze energy level expressed in content
 */
function analyzeEnergyLevel(text: string, sentences: string[], expectedEnergy: number): number {
  const energyIndicators = [
    'exciting', 'incredible', 'amazing', 'fantastic', 'revolutionary',
    'breakthrough', 'unprecedented', 'remarkable', 'extraordinary'
  ];
  
  const punctuationEnergy = (text.match(/!/g) || []).length;
  const capsUsage = (text.match(/[A-Z]{2,}/g) || []).length;
  const energyWords = energyIndicators.filter(indicator => text.includes(indicator)).length;
  
  // Short, punchy sentences indicate higher energy
  const shortSentences = sentences.filter(s => s.split(' ').length < 12).length;
  const shortSentenceRatio = sentences.length > 0 ? shortSentences / sentences.length : 0;
  
  let energyScore = 3; // base
  energyScore += punctuationEnergy * 1.5;
  energyScore += energyWords * 1.2;
  energyScore += shortSentenceRatio * 3;
  energyScore += capsUsage * 0.5;
  
  return Math.min(energyScore, 10);
}

/**
 * Analyze topic focus alignment with host interests
 */
function analyzeTopicFocus(text: string, host: Host): number {
  const primaryFocus = host.characteristics.primary_focus;
  
  // Map focus areas to relevant keywords
  const focusKeywords: Record<string, string[]> = {
    'data_systems_and_patterns': ['data', 'system', 'pattern', 'analysis', 'trend', 'structure'],
    'human_stories_and_impacts': ['people', 'human', 'personal', 'family', 'community', 'individual'],
    'cultural_trends_and_disruption': ['culture', 'trend', 'movement', 'change', 'shift', 'evolution']
  };
  
  const keywords = focusKeywords[primaryFocus] || [primaryFocus.replace(/_/g, ' ')];
  const matches = keywords.filter(keyword => text.includes(keyword)).length;
  
  // Also check against host's high-interest topics (score >= 8)
  const highInterestTopics = Object.entries(host.topics_of_interest)
    .filter(([_, score]) => score >= 8)
    .map(([topic, _]) => topic.replace(/_/g, ' '));
  
  const topicMatches = highInterestTopics.filter(topic => 
    text.includes(topic) || topic.split(' ').some(word => text.includes(word))
  ).length;
  
  const focusScore = (matches / keywords.length) * 6;
  const topicScore = highInterestTopics.length > 0 ? (topicMatches / highInterestTopics.length) * 4 : 0;
  
  return Math.min(focusScore + topicScore, 10);
}

/**
 * Interface for host assignment with rotation tracking
 */
export interface HostAssignment {
  story: IngestedArticle;
  host: Host;
  segmentIndex: number;
  assignmentReason: string;
  hostScore: number;
}

/**
 * Interface for rotation statistics and balancing
 */
export interface RotationStats {
  totalSegments: number;
  hostParticipation: Record<string, number>;
  participationPercentages: Record<string, number>;
  varietyScore: number;
  balanceScore: number;
  rotationViolations: string[];
}

/**
 * Rotate hosts across stories to ensure balanced participation according to rotation rules
 */
export function rotateHosts(stories: IngestedArticle[], hosts?: Host[]): HostAssignment[] {
  const availableHosts = hosts || getHosts();
  const config = loadHostsConfig();
  const rotationRules = config.rotation_rules;
  
  if (stories.length === 0 || availableHosts.length === 0) {
    return [];
  }
  
  const assignments: HostAssignment[] = [];
  const hostParticipation: Record<string, number> = {};
  const lastAssignmentIndex: Record<string, number> = {};
  
  // Initialize participation tracking
  availableHosts.forEach(host => {
    hostParticipation[host.name] = 0;
    lastAssignmentIndex[host.name] = -999; // Start with large negative to allow first assignment
  });
  
  // Process each story for host assignment
  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    
    // Get ranked host matches for this story
    const hostMatches = selectHostsForStory(story, availableHosts.length, availableHosts);
    
    if (hostMatches.length === 0) {
      throw new Error(`No suitable host found for story: ${story.title}`);
    }
    
    // Find the best host considering rotation rules and participation balance
    const selectedHost = selectOptimalHostForRotation(
      hostMatches,
      hostParticipation,
      lastAssignmentIndex,
      i,
      stories.length,
      rotationRules
    );
    
    // Update participation tracking
    hostParticipation[selectedHost.host.name]++;
    lastAssignmentIndex[selectedHost.host.name] = i;
    
    // Create assignment record
    assignments.push({
      story,
      host: selectedHost.host,
      segmentIndex: i,
      assignmentReason: selectedHost.reasoning,
      hostScore: selectedHost.score
    });
  }
  
  // Perform rebalancing pass if needed to meet participation requirements
  const rebalancedAssignments = rebalanceParticipation(
    assignments,
    availableHosts,
    rotationRules
  );
  
  return rebalancedAssignments;
}

/**
 * Select optimal host considering rotation rules and participation balance
 */
function selectOptimalHostForRotation(
  hostMatches: HostMatch[],
  hostParticipation: Record<string, number>,
  lastAssignmentIndex: Record<string, number>,
  currentIndex: number,
  totalSegments: number,
  rotationRules: RotationRules
): HostMatch {
  // Calculate current participation percentages
  const totalAssignments = Object.values(hostParticipation).reduce((sum, count) => sum + count, 0);
  
  // Score each host match considering rotation constraints
  const scoredMatches = hostMatches.map(match => {
    const hostName = match.host.name;
    const currentParticipation = totalAssignments > 0 ? hostParticipation[hostName] / totalAssignments : 0;
    const lastAssignment = lastAssignmentIndex[hostName];
    const segmentsSinceLastUse = currentIndex - lastAssignment;
    
    let rotationScore = match.score; // Start with topic/personality score
    
    // Apply participation balancing
    const minParticipation = rotationRules.minimum_participation;
    const maxParticipation = rotationRules.maximum_participation;
    
    // Boost hosts below minimum participation
    if (currentParticipation < minParticipation) {
      rotationScore += 3.0; // Strong boost for underused hosts
    }
    
    // Penalize hosts approaching maximum participation
    if (currentParticipation > maxParticipation * 0.8) {
      rotationScore -= 2.0; // Penalty for overused hosts
    }
    
    // Block hosts that would exceed maximum participation
    if (currentParticipation >= maxParticipation) {
      rotationScore = 0; // Hard block for hosts at limit
    }
    
    // Apply variety threshold rules
    if (segmentsSinceLastUse < rotationRules.variety_threshold) {
      rotationScore -= 1.5; // Penalty for too frequent use
    } else if (segmentsSinceLastUse >= rotationRules.variety_threshold * 2) {
      rotationScore += 1.0; // Bonus for good variety spacing
    }
    
    return {
      ...match,
      rotationScore,
      currentParticipation,
      segmentsSinceLastUse
    };
  });
  
  // Sort by rotation score (highest first)
  scoredMatches.sort((a, b) => b.rotationScore - a.rotationScore);
  
  // Return the best match that doesn't violate hard constraints
  const bestMatch = scoredMatches.find(match => match.rotationScore > 0);
  
  if (!bestMatch) {
    // Fallback: return the least overused host
    const fallbackMatches = hostMatches.sort((a, b) => {
      const aParticipation = hostParticipation[a.host.name] || 0;
      const bParticipation = hostParticipation[b.host.name] || 0;
      return aParticipation - bParticipation;
    });
    
    return fallbackMatches[0];
  }
  
  return bestMatch;
}

/**
 * Rebalance assignments to better meet participation requirements
 */
function rebalanceParticipation(
  assignments: HostAssignment[],
  availableHosts: Host[],
  rotationRules: RotationRules
): HostAssignment[] {
  const totalSegments = assignments.length;
  const hostCounts: Record<string, number> = {};
  
  // Count current assignments
  availableHosts.forEach(host => hostCounts[host.name] = 0);
  assignments.forEach(assignment => hostCounts[assignment.host.name]++);
  
  // Check for violations
  const violations: string[] = [];
  const minSegments = Math.floor(totalSegments * rotationRules.minimum_participation);
  const maxSegments = Math.ceil(totalSegments * rotationRules.maximum_participation);
  
  for (const [hostName, count] of Object.entries(hostCounts)) {
    if (count < minSegments) {
      violations.push(`${hostName} has ${count} segments, needs minimum ${minSegments}`);
    }
    if (count > maxSegments) {
      violations.push(`${hostName} has ${count} segments, exceeds maximum ${maxSegments}`);
    }
  }
  
  // If no violations, return original assignments
  if (violations.length === 0) {
    return assignments;
  }
  
  // Perform rebalancing (simplified approach - could be enhanced)
  const rebalanced = [...assignments];
  
  // Find underused and overused hosts
  const underused = Object.entries(hostCounts)
    .filter(([_, count]) => count < minSegments)
    .map(([name]) => availableHosts.find(h => h.name === name)!)
    .filter(Boolean);
    
  const overused = Object.entries(hostCounts)
    .filter(([_, count]) => count > maxSegments)
    .map(([name]) => availableHosts.find(h => h.name === name)!)
    .filter(Boolean);
  
  // Simple rebalancing: swap assignments from overused to underused hosts
  if (underused.length > 0 && overused.length > 0) {
    for (let i = 0; i < rebalanced.length && underused.length > 0 && overused.length > 0; i++) {
      const assignment = rebalanced[i];
      
      if (overused.some(host => host.name === assignment.host.name)) {
        // Find a suitable underused host for this story
        const story = assignment.story;
        const candidateHost = underused.find(host => {
          // Check if this host is suitable for the story type
          const match = selectHostForStory(story, [host]);
          return match.score > 3.0; // Reasonable threshold
        });
        
        if (candidateHost) {
          // Swap the assignment
          rebalanced[i] = {
            ...assignment,
            host: candidateHost,
            assignmentReason: 'Rebalanced for participation requirements'
          };
          
          // Update counters
          hostCounts[assignment.host.name]--;
          hostCounts[candidateHost.name]++;
          
          // Remove from underused if they now meet minimum
          if (hostCounts[candidateHost.name] >= minSegments) {
            const index = underused.findIndex(h => h.name === candidateHost.name);
            if (index >= 0) underused.splice(index, 1);
          }
          
          // Remove from overused if they now meet maximum
          if (hostCounts[assignment.host.name] <= maxSegments) {
            const index = overused.findIndex(h => h.name === assignment.host.name);
            if (index >= 0) overused.splice(index, 1);
          }
        }
      }
    }
  }
  
  return rebalanced;
}

/**
 * Calculate rotation statistics for an episode
 */
export function calculateRotationStats(assignments: HostAssignment[]): RotationStats {
  const config = loadHostsConfig();
  const rotationRules = config.rotation_rules;
  const totalSegments = assignments.length;
  
  // Count host participation
  const hostParticipation: Record<string, number> = {};
  assignments.forEach(assignment => {
    hostParticipation[assignment.host.name] = (hostParticipation[assignment.host.name] || 0) + 1;
  });
  
  // Calculate participation percentages
  const participationPercentages: Record<string, number> = {};
  Object.entries(hostParticipation).forEach(([hostName, count]) => {
    participationPercentages[hostName] = totalSegments > 0 ? count / totalSegments : 0;
  });
  
  // Check for rotation violations
  const violations: string[] = [];
  const minParticipation = rotationRules.minimum_participation;
  const maxParticipation = rotationRules.maximum_participation;
  
  Object.entries(participationPercentages).forEach(([hostName, percentage]) => {
    if (percentage < minParticipation) {
      violations.push(`${hostName}: ${(percentage * 100).toFixed(1)}% < required ${(minParticipation * 100).toFixed(1)}%`);
    }
    if (percentage > maxParticipation) {
      violations.push(`${hostName}: ${(percentage * 100).toFixed(1)}% > maximum ${(maxParticipation * 100).toFixed(1)}%`);
    }
  });
  
  // Calculate variety score (how well spaced are host changes)
  let varietyScore = 10;
  for (let i = 1; i < assignments.length; i++) {
    const currentHost = assignments[i].host.name;
    let segmentsSinceSameHost = 0;
    
    for (let j = i - 1; j >= 0; j--) {
      if (assignments[j].host.name === currentHost) {
        segmentsSinceSameHost = i - j;
        break;
      }
    }
    
    if (segmentsSinceSameHost > 0 && segmentsSinceSameHost < rotationRules.variety_threshold) {
      varietyScore -= 1; // Penalty for insufficient variety
    }
  }
  
  varietyScore = Math.max(0, Math.min(varietyScore, 10));
  
  // Calculate balance score (how evenly distributed are the hosts)
  const idealParticipation = 1.0 / Object.keys(hostParticipation).length;
  let balanceScore = 10;
  
  Object.values(participationPercentages).forEach(percentage => {
    const deviation = Math.abs(percentage - idealParticipation);
    balanceScore -= deviation * 5; // Penalty for deviation from ideal
  });
  
  balanceScore = Math.max(0, Math.min(balanceScore, 10));
  
  return {
    totalSegments,
    hostParticipation,
    participationPercentages,
    varietyScore,
    balanceScore,
    rotationViolations: violations
  };
}

/**
 * Generate optimal episode structure with balanced host rotation
 */
export function generateEpisodeStructure(
  stories: IngestedArticle[],
  hosts?: Host[]
): {
  assignments: HostAssignment[];
  stats: RotationStats;
  recommendations: string[];
} {
  const assignments = rotateHosts(stories, hosts);
  const stats = calculateRotationStats(assignments);
  
  const recommendations: string[] = [];
  
  // Provide recommendations based on stats
  if (stats.balanceScore < 7) {
    recommendations.push('Consider adjusting story-host matching to improve participation balance');
  }
  
  if (stats.varietyScore < 7) {
    recommendations.push('Host transitions could be more varied to improve listener experience');
  }
  
  if (stats.rotationViolations.length > 0) {
    recommendations.push('Participation requirements not met - consider story reordering or host adjustments');
  }
  
  if (assignments.length < 3) {
    recommendations.push('More stories needed to achieve effective host rotation');
  }
  
  return {
    assignments,
    stats,
    recommendations
  };
}