/**
 * Generation state management with resume capability for Superwire
 * 
 * Provides persistent state tracking and step-based resume functionality
 * for the daily generation pipeline. Enables recovery from failures and
 * partial generation completion.
 * 
 * Based on patterns from:
 * - src/app/api/cron/generate/route.ts (generation pipeline)
 * - src/lib/error-handler.ts (retry patterns)
 * - src/lib/fallback.ts (graceful degradation)
 */

import { ConvexHttpClient } from 'convex/browser';
import { ingestDailyNews } from './ingestion';
import { loadEditorialDNA, applyEditorialFilter } from './editorial';
import { generateArticlesBatch } from '../generators/article';
import { selectOpEdTopics, generateOpEd } from '../generators/oped';
import { generateDailyBrief } from '../generators/brief';
import { getCostSummary } from './openrouter';
import { getAudioCostSummary } from './elevenlabs';
import { loadHostsConfig } from './hosts';
import { logGenerationMetrics } from './metrics';
import { generateFallbackContent } from './fallback';
import { notifyFailure } from './notifications';
import { EnhancedError, ErrorCategory } from './error-handler';

/**
 * Generation step enumeration matching existing pipeline
 */
export enum GenerationStep {
  NEWS_INGESTION = 'News Ingestion',
  EDITORIAL_FILTERING = 'Editorial Filtering',
  CONTENT_GENERATION = 'Content Generation',
  OPED_GENERATION = 'Op-Ed Generation',
  DAILY_BRIEF = 'Daily Brief',
  COST_ANALYSIS = 'Cost Analysis',
  COMPLETE = 'Complete'
}

/**
 * Step configuration with progress tracking
 */
interface StepConfig {
  name: GenerationStep;
  startProgress: number;
  endProgress: number;
  required: boolean;
  fallbackEnabled: boolean;
}

/**
 * Step execution result
 */
export interface StepResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  fallbackUsed?: boolean;
}

/**
 * Generation context with intermediate data
 */
export interface GenerationContext {
  date: string;
  timestamp: string;
  sessionId?: string;
  
  // Intermediate data from each step
  articles?: any[];
  filteredStories?: any[];
  generatedArticles?: any[];
  generatedOpEds?: any[];
  dailyBrief?: any;
  costs?: {
    aiCosts: number;
    audioCosts: number;
    totalCosts: number;
  };
  
  // Tracking
  completedSteps: GenerationStep[];
  currentStep?: GenerationStep;
  progress: number;
  errors: string[];
  startTime: number;
  lastUpdated: number;
}

/**
 * Persistent generation state
 */
export interface GenerationState {
  isRunning: boolean;
  date: string;
  sessionId: string;
  currentStep?: GenerationStep;
  progress: number;
  completedSteps: GenerationStep[];
  context: GenerationContext;
  status: 'idle' | 'running' | 'failed' | 'completed' | 'partial';
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Step configuration map (following existing progress from cron/generate)
 */
const STEP_CONFIGS: Record<GenerationStep, StepConfig> = {
  [GenerationStep.NEWS_INGESTION]: {
    name: GenerationStep.NEWS_INGESTION,
    startProgress: 10,
    endProgress: 30,
    required: true,
    fallbackEnabled: false
  },
  [GenerationStep.EDITORIAL_FILTERING]: {
    name: GenerationStep.EDITORIAL_FILTERING,
    startProgress: 30,
    endProgress: 50,
    required: false,
    fallbackEnabled: true
  },
  [GenerationStep.CONTENT_GENERATION]: {
    name: GenerationStep.CONTENT_GENERATION,
    startProgress: 50,
    endProgress: 70,
    required: false,
    fallbackEnabled: true
  },
  [GenerationStep.OPED_GENERATION]: {
    name: GenerationStep.OPED_GENERATION,
    startProgress: 70,
    endProgress: 85,
    required: false,
    fallbackEnabled: true
  },
  [GenerationStep.DAILY_BRIEF]: {
    name: GenerationStep.DAILY_BRIEF,
    startProgress: 85,
    endProgress: 95,
    required: false,
    fallbackEnabled: true
  },
  [GenerationStep.COST_ANALYSIS]: {
    name: GenerationStep.COST_ANALYSIS,
    startProgress: 95,
    endProgress: 100,
    required: false,
    fallbackEnabled: false
  },
  [GenerationStep.COMPLETE]: {
    name: GenerationStep.COMPLETE,
    startProgress: 100,
    endProgress: 100,
    required: false,
    fallbackEnabled: false
  }
};

/**
 * Step execution order
 */
const STEP_ORDER: GenerationStep[] = [
  GenerationStep.NEWS_INGESTION,
  GenerationStep.EDITORIAL_FILTERING,
  GenerationStep.CONTENT_GENERATION,
  GenerationStep.OPED_GENERATION,
  GenerationStep.DAILY_BRIEF,
  GenerationStep.COST_ANALYSIS,
  GenerationStep.COMPLETE
];

/**
 * In-memory state cache (will be enhanced with Convex persistence)
 */
let currentGenerationState: GenerationState | null = null;

/**
 * Execute a single generation step
 */
async function executeStep(
  step: GenerationStep,
  context: GenerationContext
): Promise<StepResult> {
  const startTime = Date.now();
  console.log(`🔄 Executing step: ${step}`);

  try {
    switch (step) {
      case GenerationStep.NEWS_INGESTION:
        const ingestionResult = await ingestDailyNews();
        context.articles = ingestionResult.articles || [];
        return {
          success: true,
          data: { articlesCount: context.articles.length },
          duration: Date.now() - startTime
        };

      case GenerationStep.EDITORIAL_FILTERING:
        if (!context.articles || context.articles.length === 0) {
          throw new Error('No articles available for filtering');
        }
        const editorialDNA = await loadEditorialDNA();
        context.filteredStories = applyEditorialFilter(context.articles, editorialDNA);
        return {
          success: true,
          data: { storiesFiltered: context.filteredStories.length },
          duration: Date.now() - startTime
        };

      case GenerationStep.CONTENT_GENERATION:
        if (!context.filteredStories || context.filteredStories.length === 0) {
          console.warn('⚠️ No stories for content generation, using fallback');
          const fallback = await generateFallbackContent(undefined, {
            contentType: 'article' as any,
            targetLength: 300
          });
          context.generatedArticles = [fallback];
          return {
            success: true,
            data: { articlesGenerated: 1 },
            duration: Date.now() - startTime,
            fallbackUsed: true
          };
        }

        const topStories = context.filteredStories.slice(0, 5);
        const articleResults = await generateArticlesBatch(topStories, {
          targetLength: 500,
          includeContext: true
        });
        context.generatedArticles = articleResults;
        return {
          success: true,
          data: { articlesGenerated: articleResults.length },
          duration: Date.now() - startTime
        };

      case GenerationStep.OPED_GENERATION:
        if (!context.filteredStories || context.filteredStories.length < 2) {
          console.warn('⚠️ Insufficient stories for op-ed, skipping');
          context.generatedOpEds = [];
          return {
            success: true,
            data: { opEdsGenerated: 0 },
            duration: Date.now() - startTime,
            fallbackUsed: true
          };
        }

        const opEdTopics = selectOpEdTopics(context.filteredStories, 2);
        const hosts = await loadHostsConfig();
        const opEdResults = [];

        for (const topic of opEdTopics) {
          try {
            const host = hosts[Math.floor(Math.random() * hosts.length)];
            const editorialDNA = await loadEditorialDNA();
            const opEd = await generateOpEd([topic], host, editorialDNA);
            opEdResults.push(opEd);
          } catch (error) {
            console.warn(`⚠️ Op-ed generation failed: ${error}`);
          }
        }

        context.generatedOpEds = opEdResults;
        return {
          success: true,
          data: { opEdsGenerated: opEdResults.length },
          duration: Date.now() - startTime
        };

      case GenerationStep.DAILY_BRIEF:
        const storiesToBrief = context.filteredStories || context.articles || [];
        if (storiesToBrief.length === 0) {
          const fallback = await generateFallbackContent(undefined, {
            contentType: 'brief' as any,
            targetLength: 200
          });
          context.dailyBrief = fallback;
          return {
            success: true,
            data: { briefGenerated: true },
            duration: Date.now() - startTime,
            fallbackUsed: true
          };
        }

        const brief = await generateDailyBrief(storiesToBrief.slice(0, 10));
        context.dailyBrief = brief;
        return {
          success: true,
          data: { briefGenerated: true },
          duration: Date.now() - startTime
        };

      case GenerationStep.COST_ANALYSIS:
        const aiCostSummary = await getCostSummary();
        const audioCostSummary = await getAudioCostSummary();
        const today = new Date().toISOString().split('T')[0];
        
        context.costs = {
          aiCosts: aiCostSummary.dailyTotals[today] || 0,
          audioCosts: audioCostSummary.dailyTotal || 0,
          totalCosts: (aiCostSummary.dailyTotals[today] || 0) + (audioCostSummary.dailyTotal || 0)
        };

        return {
          success: true,
          data: context.costs,
          duration: Date.now() - startTime
        };

      case GenerationStep.COMPLETE:
        // Log metrics for the completed generation
        if (context.costs) {
          await logGenerationMetrics({
            success: true,
            timestamp: context.timestamp,
            duration: Date.now() - context.startTime,
            steps: {
              newsIngestion: {
                success: context.completedSteps.includes(GenerationStep.NEWS_INGESTION),
                articlesCount: context.articles?.length || 0,
                duration: 0 // Would need to track individual step durations
              },
              contentGeneration: {
                success: context.completedSteps.includes(GenerationStep.CONTENT_GENERATION),
                articlesGenerated: context.generatedArticles?.length || 0,
                opEdsGenerated: context.generatedOpEds?.length || 0,
                briefGenerated: !!context.dailyBrief,
                duration: 0
              }
            },
            costs: context.costs,
            errors: context.errors
          });
        }

        return {
          success: true,
          data: { completed: true },
          duration: Date.now() - startTime
        };

      default:
        throw new Error(`Unknown generation step: ${step}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Step ${step} failed:`, errorMessage);
    
    // Check if fallback is enabled for this step
    const stepConfig = STEP_CONFIGS[step];
    if (stepConfig.fallbackEnabled) {
      console.log(`🔄 Attempting fallback for ${step}`);
      try {
        const fallbackContent = await generateFallbackContent(undefined, {
          targetLength: 200,
          emergencyMode: true
        });
        
        return {
          success: true,
          data: fallbackContent,
          duration: Date.now() - startTime,
          fallbackUsed: true,
          error: errorMessage
        };
      } catch (fallbackError) {
        console.error(`❌ Fallback also failed for ${step}`);
      }
    }

    return {
      success: false,
      error: errorMessage,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Get the next step to execute based on completed steps
 */
function getNextStep(completedSteps: GenerationStep[]): GenerationStep | null {
  for (const step of STEP_ORDER) {
    if (!completedSteps.includes(step)) {
      return step;
    }
  }
  return null;
}

/**
 * Save generation state (will be enhanced with Convex persistence)
 */
async function saveGenerationState(state: GenerationState): Promise<void> {
  currentGenerationState = state;
  state.updatedAt = Date.now();
  
  // TODO: Persist to Convex when database is configured
  // const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  // if (convexUrl) {
  //   const client = new ConvexHttpClient(convexUrl);
  //   await client.mutation('storeGenerationState', state);
  // }
  
  console.log(`💾 Generation state saved: Step ${state.currentStep}, Progress ${state.progress}%`);
}

/**
 * Load generation state (will be enhanced with Convex persistence)
 */
async function loadGenerationState(date?: string): Promise<GenerationState | null> {
  // TODO: Load from Convex when database is configured
  // const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  // if (convexUrl) {
  //   const client = new ConvexHttpClient(convexUrl);
  //   return await client.query('getGenerationState', { date });
  // }
  
  if (currentGenerationState && (!date || currentGenerationState.date === date)) {
    return currentGenerationState;
  }
  
  return null;
}

/**
 * Main function to resume generation from a specific step
 */
export async function resumeGeneration(
  fromStep?: GenerationStep,
  existingContext?: GenerationContext
): Promise<{
  success: boolean;
  context: GenerationContext;
  completedSteps: GenerationStep[];
  errors: string[];
}> {
  const today = new Date().toISOString().split('T')[0];
  const sessionId = `gen-${Date.now()}`;
  
  console.log(`🔄 Resuming generation from step: ${fromStep || 'beginning'}`);
  
  // Load or create context
  let context: GenerationContext = existingContext || {
    date: today,
    timestamp: new Date().toISOString(),
    sessionId,
    completedSteps: [],
    progress: 0,
    errors: [],
    startTime: Date.now(),
    lastUpdated: Date.now()
  };

  // Load existing state if available
  const existingState = await loadGenerationState(today);
  if (existingState && !existingContext) {
    context = existingState.context;
    console.log(`📂 Loaded existing generation state with ${context.completedSteps.length} completed steps`);
  }

  // Determine starting step
  let startingStep: GenerationStep;
  if (fromStep) {
    // Resume from specified step
    startingStep = fromStep;
    // Remove this step and all following from completed list
    const stepIndex = STEP_ORDER.indexOf(fromStep);
    context.completedSteps = context.completedSteps.filter(
      step => STEP_ORDER.indexOf(step) < stepIndex
    );
  } else {
    // Resume from next incomplete step
    const nextStep = getNextStep(context.completedSteps);
    if (!nextStep) {
      console.log('✅ Generation already complete');
      return {
        success: true,
        context,
        completedSteps: context.completedSteps,
        errors: context.errors
      };
    }
    startingStep = nextStep;
  }

  console.log(`🚀 Starting from step: ${startingStep}`);
  
  // Create generation state
  const state: GenerationState = {
    isRunning: true,
    date: today,
    sessionId,
    currentStep: startingStep,
    progress: STEP_CONFIGS[startingStep].startProgress,
    completedSteps: context.completedSteps,
    context,
    status: 'running',
    createdAt: existingState?.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  // Save initial state
  await saveGenerationState(state);

  // Execute remaining steps
  const startIndex = STEP_ORDER.indexOf(startingStep);
  let hasFailures = false;

  for (let i = startIndex; i < STEP_ORDER.length; i++) {
    const step = STEP_ORDER[i];
    const stepConfig = STEP_CONFIGS[step];
    
    // Update current step
    state.currentStep = step;
    state.progress = stepConfig.startProgress;
    await saveGenerationState(state);

    // Execute step
    const result = await executeStep(step, context);
    
    if (result.success) {
      context.completedSteps.push(step);
      state.completedSteps = context.completedSteps;
      state.progress = stepConfig.endProgress;
      
      console.log(`✅ Step ${step} completed in ${result.duration}ms${result.fallbackUsed ? ' (fallback used)' : ''}`);
      
      if (result.error) {
        context.errors.push(`${step}: ${result.error} (recovered with fallback)`);
      }
    } else {
      hasFailures = true;
      const errorMsg = `Step ${step} failed: ${result.error}`;
      context.errors.push(errorMsg);
      state.lastError = errorMsg;
      
      // Check if step is required
      if (stepConfig.required) {
        console.error(`❌ Required step ${step} failed - stopping generation`);
        state.status = 'failed';
        state.isRunning = false;
        await saveGenerationState(state);
        
        // Send failure notification
        await notifyFailure(
          new EnhancedError(errorMsg, ErrorCategory.API_ERROR),
          {
            system: 'generation-resume',
            operation: `executeStep-${step}`,
            timestamp: new Date().toISOString()
          }
        );
        
        break;
      } else {
        console.warn(`⚠️ Optional step ${step} failed - continuing`);
      }
    }

    // Update state after each step
    context.lastUpdated = Date.now();
    state.updatedAt = Date.now();
    await saveGenerationState(state);
  }

  // Final state update
  state.isRunning = false;
  state.status = hasFailures ? 
    (context.completedSteps.length > 0 ? 'partial' : 'failed') : 
    'completed';
  state.progress = context.completedSteps.includes(GenerationStep.COMPLETE) ? 100 : state.progress;
  await saveGenerationState(state);

  const success = !hasFailures || context.completedSteps.length >= 3; // At least 3 steps for partial success

  console.log(`🏁 Generation ${state.status}: ${context.completedSteps.length}/${STEP_ORDER.length} steps completed`);
  
  return {
    success,
    context,
    completedSteps: context.completedSteps,
    errors: context.errors
  };
}

/**
 * Clean up incomplete generation data
 */
export async function cleanupIncomplete(date?: string): Promise<void> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  console.log(`🧹 Cleaning up incomplete generation for ${targetDate}`);
  
  // Clear in-memory state
  if (currentGenerationState?.date === targetDate) {
    currentGenerationState = null;
  }

  // TODO: Clean up Convex records when database is configured
  // const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  // if (convexUrl) {
  //   const client = new ConvexHttpClient(convexUrl);
  //   await client.mutation('cleanupGenerationState', { date: targetDate });
  //   await client.mutation('cleanupPartialContent', { date: targetDate });
  // }

  console.log('✅ Cleanup complete');
}

/**
 * Mark generation as complete with full metrics
 */
export async function markGenerationComplete(
  date: string,
  stats: {
    duration: number;
    articlesGenerated: number;
    opEdsGenerated: number;
    briefGenerated: boolean;
    costs: { aiCosts: number; audioCosts: number; totalCosts: number };
    errors: string[];
  }
): Promise<void> {
  console.log(`✅ Marking generation complete for ${date}`);
  
  // Log metrics
  await logGenerationMetrics({
    success: true,
    timestamp: new Date().toISOString(),
    duration: stats.duration,
    steps: {
      contentGeneration: {
        success: true,
        articlesGenerated: stats.articlesGenerated,
        opEdsGenerated: stats.opEdsGenerated,
        briefGenerated: stats.briefGenerated,
        duration: stats.duration
      }
    },
    costs: stats.costs,
    errors: stats.errors
  });

  // Update state
  if (currentGenerationState?.date === date) {
    currentGenerationState.status = 'completed';
    currentGenerationState.progress = 100;
    currentGenerationState.currentStep = GenerationStep.COMPLETE;
    currentGenerationState.isRunning = false;
    currentGenerationState.updatedAt = Date.now();
    await saveGenerationState(currentGenerationState);
  }

  // TODO: Persist to Convex when database is configured
  
  console.log(`📊 Generation complete: ${stats.articlesGenerated} articles, ${stats.opEdsGenerated} op-eds, cost: $${stats.costs.totalCosts.toFixed(2)}`);
}

/**
 * Check if generation is currently running
 */
export function isGenerating(): boolean {
  return currentGenerationState?.isRunning || false;
}

/**
 * Get current generation status
 */
export function getGenerationStatus(): GenerationState | null {
  return currentGenerationState;
}

/**
 * Test the resume functionality
 */
export async function testResumeGeneration(): Promise<boolean> {
  console.log('🧪 Testing resume generation functionality...');
  
  try {
    // Test 1: Resume from beginning
    console.log('Test 1: Starting fresh generation...');
    const result1 = await resumeGeneration();
    console.log(`✓ Fresh generation: ${result1.completedSteps.length} steps completed`);

    // Test 2: Resume from specific step
    console.log('Test 2: Resuming from CONTENT_GENERATION...');
    const mockContext: GenerationContext = {
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      articles: [{ title: 'Test Article', content: 'Test content' }],
      filteredStories: [{ title: 'Filtered Story', content: 'Filtered content' }],
      completedSteps: [GenerationStep.NEWS_INGESTION, GenerationStep.EDITORIAL_FILTERING],
      progress: 50,
      errors: [],
      startTime: Date.now(),
      lastUpdated: Date.now()
    };
    
    const result2 = await resumeGeneration(GenerationStep.CONTENT_GENERATION, mockContext);
    console.log(`✓ Resume from step: ${result2.completedSteps.length} steps completed`);

    // Test 3: Cleanup
    console.log('Test 3: Testing cleanup...');
    await cleanupIncomplete();
    console.log('✓ Cleanup successful');

    console.log('✅ Resume generation tests completed');
    return true;

  } catch (error) {
    console.error('❌ Resume generation tests failed:', error);
    return false;
  }
}