/**
 * Daily Content Generation Cron API Endpoint
 * 
 * Triggered by Vercel cron job to generate daily podcast episode
 * Orchestrates the complete news-to-audio pipeline
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ingestDailyNews } from '../../../src/lib/ingestion';
import { loadEditorialDNA, applyEditorialFilter } from '../../../src/lib/editorial';
import { generateDailyBrief } from '../../../src/generators/brief';
import { generateArticle, generateArticlesBatch } from '../../../src/generators/article';
import { selectOpEdTopics, generateOpEd } from '../../../src/generators/oped';
import { getCostSummary } from '../../../src/lib/openrouter';
import { getAudioCostSummary, shouldLimitAudioGeneration } from '../../../src/lib/elevenlabs';
import { loadHostsConfig } from '../../../src/lib/hosts';

/**
 * Generation status tracking
 */
interface GenerationStatus {
  isRunning: boolean;
  startTime?: string;
  currentStep?: string;
  progress?: number;
  lastRun?: string;
}

/**
 * Generation result summary
 */
interface GenerationResult {
  success: boolean;
  timestamp: string;
  duration: number;
  steps: {
    newsIngestion: { success: boolean; articlesCount: number; duration: number };
    contentGeneration: { success: boolean; articlesGenerated: number; opEdsGenerated: number; briefGenerated: boolean; duration: number };
    costs: { aiCosts: number; audioCosts: number; totalCosts: number };
  };
  errors?: string[];
}

// In-memory status tracking (could be moved to Convex later)
let generationStatus: GenerationStatus = { isRunning: false };

/**
 * Verify bearer token for cron job security
 */
function verifyBearerToken(request: NextApiRequest): boolean {
  const authorization = request.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return false;
  }
  
  if (!authorization) {
    return false;
  }
  
  const token = authorization.replace('Bearer ', '');
  return token === cronSecret;
}

/**
 * Check if generation is already running
 */
function isGenerationRunning(): boolean {
  return generationStatus.isRunning;
}

/**
 * Update generation status
 */
function updateGenerationStatus(status: Partial<GenerationStatus>): void {
  generationStatus = { ...generationStatus, ...status };
}

/**
 * Run complete daily generation pipeline
 */
async function runDailyGeneration(): Promise<GenerationResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const errors: string[] = [];
  
  console.log('🚀 Starting daily content generation...');
  
  try {
    updateGenerationStatus({
      isRunning: true,
      startTime: timestamp,
      currentStep: 'News Ingestion',
      progress: 10
    });

    // Step 1: Ingest daily news
    console.log('📰 Step 1: Ingesting daily news...');
    const newsStartTime = Date.now();
    
    let articles: any[] = [];
    try {
      const ingestionResult = await ingestDailyNews();
      articles = ingestionResult.articles || [];
      console.log(`✅ Ingested ${articles.length} articles`);
    } catch (error) {
      const errorMsg = `News ingestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
    }
    
    const newsDuration = Date.now() - newsStartTime;
    
    updateGenerationStatus({
      currentStep: 'Editorial Filtering',
      progress: 30
    });

    // Step 2: Apply editorial filtering
    console.log('🎯 Step 2: Applying editorial filtering...');
    const editorialDNA = loadEditorialDNA();
    const filteredStories = applyEditorialFilter(articles, editorialDNA);
    console.log(`✅ Filtered to ${filteredStories.length} high-quality stories`);

    updateGenerationStatus({
      currentStep: 'Content Generation',
      progress: 50
    });

    // Step 3: Generate content
    console.log('✍️ Step 3: Generating content...');
    const contentStartTime = Date.now();
    
    let articlesGenerated = 0;
    let opEdsGenerated = 0;
    let briefGenerated = false;

    // Generate articles (batch processing for efficiency)
    try {
      const topStories = filteredStories.slice(0, 5); // Top 5 stories for articles
      if (topStories.length > 0) {
        const articleResults = await generateArticlesBatch(topStories, { storeInConvex: true });
        articlesGenerated = articleResults.length;
        console.log(`✅ Generated ${articlesGenerated} articles`);
      }
    } catch (error) {
      const errorMsg = `Article generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
    }

    updateGenerationStatus({
      currentStep: 'Op-Ed Generation',
      progress: 70
    });

    // Generate op-eds
    try {
      const opEdTopics = selectOpEdTopics(filteredStories, 2);
      if (opEdTopics.length > 0) {
        const hostsConfig = loadHostsConfig();
        const adamHost = hostsConfig.hosts.adam;
        
        if (adamHost) {
          for (const topic of opEdTopics) {
            try {
              const opEd = await generateOpEd([topic], adamHost, editorialDNA, { storeInConvex: true });
              if (opEd) {
                opEdsGenerated++;
              }
            } catch (error) {
              console.error('Op-ed generation error:', error);
            }
          }
        }
        console.log(`✅ Generated ${opEdsGenerated} op-eds`);
      }
    } catch (error) {
      const errorMsg = `Op-ed generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
    }

    updateGenerationStatus({
      currentStep: 'Daily Brief',
      progress: 85
    });

    // Generate daily brief
    try {
      const briefResult = await generateDailyBrief(filteredStories.slice(0, 10));
      briefGenerated = !!briefResult;
      console.log(`✅ Generated daily brief: ${briefGenerated ? 'Success' : 'Failed'}`);
    } catch (error) {
      const errorMsg = `Brief generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error('❌', errorMsg);
    }

    const contentDuration = Date.now() - contentStartTime;

    updateGenerationStatus({
      currentStep: 'Cost Analysis',
      progress: 95
    });

    // Step 4: Cost analysis
    const aiCostSummary = await getCostSummary();
    const audioCostSummary = getAudioCostSummary();
    
    const todaysAiCosts = aiCostSummary?.dailyTotals?.[new Date().toISOString().split('T')[0]] || 0;
    
    const costs = {
      aiCosts: todaysAiCosts,
      audioCosts: audioCostSummary.todaysAudioCosts || 0,
      totalCosts: todaysAiCosts + (audioCostSummary.todaysAudioCosts || 0)
    };

    console.log(`💰 Daily costs: AI $${costs.aiCosts.toFixed(4)}, Audio $${costs.audioCosts.toFixed(4)}, Total $${costs.totalCosts.toFixed(4)}`);

    const totalDuration = Date.now() - startTime;
    
    updateGenerationStatus({
      currentStep: 'Complete',
      progress: 100,
      isRunning: false,
      lastRun: timestamp
    });

    const result: GenerationResult = {
      success: errors.length === 0,
      timestamp,
      duration: totalDuration,
      steps: {
        newsIngestion: {
          success: articles.length > 0,
          articlesCount: articles.length,
          duration: newsDuration
        },
        contentGeneration: {
          success: articlesGenerated > 0 || opEdsGenerated > 0 || briefGenerated,
          articlesGenerated,
          opEdsGenerated,
          briefGenerated,
          duration: contentDuration
        },
        costs
      },
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`🎉 Generation completed in ${(totalDuration / 1000).toFixed(1)}s`);
    return result;

  } catch (error) {
    const errorMsg = `Generation pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(errorMsg);
    console.error('💥 Critical error:', errorMsg);
    
    updateGenerationStatus({
      isRunning: false,
      currentStep: 'Failed'
    });

    return {
      success: false,
      timestamp,
      duration: Date.now() - startTime,
      steps: {
        newsIngestion: { success: false, articlesCount: 0, duration: 0 },
        contentGeneration: { success: false, articlesGenerated: 0, opEdsGenerated: 0, briefGenerated: false, duration: 0 },
        costs: { aiCosts: 0, audioCosts: 0, totalCosts: 0 }
      },
      errors
    };
  }
}

/**
 * API handler for cron endpoint
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      // Verify cron job authentication
      if (!verifyBearerToken(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Check if generation is already running
      if (isGenerationRunning()) {
        return res.status(409).json({ 
          error: 'Generation already in progress',
          status: generationStatus
        });
      }

      // Check budget constraints before starting
      if (shouldLimitAudioGeneration()) {
        return res.status(429).json({ 
          error: 'Daily audio budget limit reached',
          audioCosts: getAudioCostSummary()
        });
      }

      // Run the generation pipeline
      const result = await runDailyGeneration();

      // Return result
      if (result.success) {
        return res.status(200).json({
          message: 'Daily content generation completed successfully',
          result
        });
      } else {
        return res.status(207).json({
          message: 'Daily content generation completed with errors',
          result
        }); // 207 Multi-Status for partial success
      }

    } else if (req.method === 'GET') {
      // Verify authentication for status checks
      if (!verifyBearerToken(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(200).json({
        status: generationStatus,
        costs: {
          ai: await getCostSummary(),
          audio: getAudioCostSummary()
        }
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Cron endpoint error:', error);
    
    // Reset status on critical error
    updateGenerationStatus({ isRunning: false, currentStep: 'Error' });
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}