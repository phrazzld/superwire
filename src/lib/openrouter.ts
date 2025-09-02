/**
 * OpenRouter API Client
 * Unified interface for accessing multiple AI models through OpenRouter
 * Based on existing patterns from pages/api/episodes.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Types for OpenRouter API
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  created: number;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

// Retry configuration following existing pattern from episodes.ts:95-97
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

// OpenRouter API endpoint
const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

/**
 * OpenRouter Client Class
 * Provides typed interface for OpenRouter API with retry logic
 */
export class OpenRouterClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable.');
    }
  }

  /**
   * Make a chat completion request to OpenRouter
   * Implements retry logic with exponential backoff following episodes.ts:101-127 pattern
   */
  async createChatCompletion(
    request: OpenRouterRequest, 
    options?: {
      trackCosts?: boolean;
      taskType?: string;
    }
  ): Promise<OpenRouterResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Make the API request following episodes.ts:285-297 pattern
        const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
            'X-Title': 'Superwire News',
          },
          body: JSON.stringify(request),
        });

        // Check if response is ok
        if (!response.ok) {
          const errorData = await response.json() as OpenRouterError;
          throw new Error(errorData.error?.message || `OpenRouter API error: ${response.status}`);
        }

        // Parse and validate response following episodes.ts:133-142 pattern
        const data = await response.json() as OpenRouterResponse;
        
        if (!data.choices || data.choices.length === 0) {
          throw new Error('No response generated from OpenRouter');
        }

        // Track costs if enabled and usage data is available
        const shouldTrack = options?.trackCosts !== false; // Default to true
        if (shouldTrack && data.usage) {
          await trackTokenUsage(
            request.model,
            data.usage.prompt_tokens,
            data.usage.completion_tokens,
            {
              taskType: options?.taskType,
              prompt: request.messages[request.messages.length - 1]?.content,
            }
          );
        }

        return data;

      } catch (error: any) {
        lastError = error;
        console.error(`OpenRouter API attempt ${attempt + 1} failed:`, error.message);

        // If we haven't exhausted retries, wait before trying again
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAYS[attempt];
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    throw new Error(`OpenRouter API failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
  }

  /**
   * Simple completion helper for single prompts
   */
  async complete(
    prompt: string,
    model: string = 'openai/gpt-3.5-turbo',
    maxTokens: number = 1000,
    temperature: number = 0.7
  ): Promise<string> {
    const response = await this.createChatCompletion({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * System prompt helper for more complex interactions
   */
  async completeWithSystem(
    systemPrompt: string,
    userPrompt: string,
    model: string = 'openai/gpt-3.5-turbo',
    maxTokens: number = 1000,
    temperature: number = 0.7
  ): Promise<string> {
    const response = await this.createChatCompletion({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Task-based completion using model router
   * Automatically selects the optimal model based on task type
   */
  async completeTask(
    taskType: TaskType,
    prompt: string,
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
      modelOverride?: string;
      trackCosts?: boolean;
    }
  ): Promise<{ content: string; model: string; usage?: any; cost?: number }> {
    const model = modelRouter(taskType, options?.modelOverride);
    const maxTokens = options?.maxTokens || 1000;
    const temperature = options?.temperature || 0.7;
    const shouldTrackCosts = options?.trackCosts !== false; // Default to true

    console.log(`Executing ${taskType} task with model: ${model}`);

    const messages: OpenRouterMessage[] = options?.systemPrompt
      ? [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: prompt }
        ]
      : [{ role: 'user', content: prompt }];

    const response = await this.createChatCompletion({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }, {
      trackCosts: shouldTrackCosts,
      taskType,  // Pass taskType for better cost tracking context
    });

    // Calculate cost for this request
    const cost = response.usage ? calculateCost(model, response.usage) : 0;

    return {
      content: response.choices[0]?.message?.content || '',
      model,
      usage: response.usage,
      cost,
    };
  }
}

/**
 * Singleton instance for convenience
 */
let clientInstance: OpenRouterClient | null = null;

export function getOpenRouterClient(): OpenRouterClient {
  if (!clientInstance) {
    clientInstance = new OpenRouterClient();
  }
  return clientInstance;
}

/**
 * Model pricing information (per million tokens)
 * Used for cost tracking
 */
export const MODEL_PRICING = {
  'openai/gpt-4o': { input: 2.50, output: 10.00 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  'openai/gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'anthropic/claude-3.5-sonnet': { input: 3.00, output: 15.00 },
  'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },
  'meta-llama/llama-3.1-70b-instruct': { input: 0.70, output: 0.80 },
};

/**
 * Calculate cost for a request based on token usage
 */
export function calculateCost(model: string, usage?: { prompt_tokens: number; completion_tokens: number }): number {
  if (!usage) return 0;
  
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
  if (!pricing) {
    console.warn(`No pricing information for model: ${model}`);
    return 0;
  }

  const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;
  
  return inputCost + outputCost;
}

/**
 * Cost tracking entry structure
 */
export interface CostEntry {
  timestamp: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  taskType?: string;
  prompt?: string;  // Optional: first 100 chars of prompt for debugging
}

/**
 * Cost tracking data structure
 */
export interface CostTracking {
  entries: CostEntry[];
  dailyTotals: Record<string, number>;
  modelTotals: Record<string, number>;
  taskTypeTotals: Record<string, number>; // Track costs by task type
  grandTotal: number;
}

/**
 * Track token usage and costs to costs.json file
 * Appends to existing data and updates running totals
 */
export async function trackTokenUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  options?: {
    taskType?: string;
    prompt?: string;
    costsFilePath?: string;
  }
): Promise<void> {
  const costsPath = options?.costsFilePath || path.join(process.cwd(), 'costs.json');
  
  // Calculate cost for this request
  const cost = calculateCost(model, {
    prompt_tokens: inputTokens,
    completion_tokens: outputTokens,
  });

  // Create new entry
  const entry: CostEntry = {
    timestamp: new Date().toISOString(),
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    cost,
    taskType: options?.taskType,
    prompt: options?.prompt?.substring(0, 100),  // Store first 100 chars for reference
  };

  // Load existing data or create new
  let costData: CostTracking;
  try {
    const existingData = await fs.promises.readFile(costsPath, 'utf-8');
    costData = JSON.parse(existingData);
  } catch (error) {
    // File doesn't exist or is invalid, create new structure
    costData = {
      entries: [],
      dailyTotals: {},
      modelTotals: {},
      taskTypeTotals: {},
      grandTotal: 0,
    };
  }

  // Add new entry
  costData.entries.push(entry);

  // Update daily total
  const today = new Date().toISOString().split('T')[0];
  costData.dailyTotals[today] = (costData.dailyTotals[today] || 0) + cost;

  // Update model total
  costData.modelTotals[model] = (costData.modelTotals[model] || 0) + cost;

  // Update task type total
  if (options?.taskType) {
    costData.taskTypeTotals[options.taskType] = (costData.taskTypeTotals[options.taskType] || 0) + cost;
  }

  // Update grand total
  costData.grandTotal += cost;

  // Keep only last 1000 entries to prevent file from growing too large
  if (costData.entries.length > 1000) {
    costData.entries = costData.entries.slice(-1000);
  }

  // Write back to file
  try {
    await fs.promises.writeFile(
      costsPath,
      JSON.stringify(costData, null, 2),
      'utf-8'
    );
    
    // Log cost tracking (can be disabled in production)
    console.log(`💰 Cost tracked: ${model} - $${cost.toFixed(6)} (${entry.totalTokens} tokens)`);
    
    // Warn if daily spend is high
    if (costData.dailyTotals[today] > 5.0) {
      console.warn(`⚠️ Daily spend is high: $${costData.dailyTotals[today].toFixed(2)}`);
    }
  } catch (error) {
    console.error('Failed to write cost tracking data:', error);
  }
}

/**
 * Get cost summary from costs.json
 */
export async function getCostSummary(costsFilePath?: string): Promise<CostTracking | null> {
  const costsPath = costsFilePath || path.join(process.cwd(), 'costs.json');
  
  try {
    const data = await fs.promises.readFile(costsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Task types for model routing
 * Each task type has an optimal model based on cost/performance trade-offs
 */
export enum TaskType {
  // Content processing tasks
  CLASSIFICATION = 'classification',      // Categorizing articles, topics
  EXTRACTION = 'extraction',              // Extracting facts, quotes, data
  SUMMARIZATION = 'summarization',        // Creating article summaries
  
  // Creative generation tasks
  CREATIVE_WRITING = 'creative',          // Op-eds, narrative content
  ARTICLE_GENERATION = 'article',         // News articles, cost-efficient
  SCRIPT_GENERATION = 'script',           // Podcast scripts
  DIALOGUE_GENERATION = 'dialogue',       // Multi-host discussions
  
  // Analysis tasks
  SENTIMENT_ANALYSIS = 'sentiment',       // Analyzing tone and mood
  FACT_CHECKING = 'fact_checking',        // Verifying claims
  EDITORIAL_ANALYSIS = 'editorial',       // Applying editorial perspective
  
  // Utility tasks
  TRANSLATION = 'translation',            // Language translation
  TITLE_GENERATION = 'title',             // Headlines and titles
  SIMPLE_COMPLETION = 'simple',           // Basic completions
}

/**
 * Model router configuration
 * Maps task types to optimal models based on performance and cost
 */
export const MODEL_ROUTER: Record<TaskType, string> = {
  // Use free/cheap models for high-volume, simple tasks
  [TaskType.CLASSIFICATION]: 'openai/gpt-3.5-turbo',  // Fast and reliable for classification
  [TaskType.EXTRACTION]: 'openai/gpt-3.5-turbo',      // Good at structured extraction
  [TaskType.SENTIMENT_ANALYSIS]: 'openai/gpt-3.5-turbo',  // Adequate for sentiment
  
  // Use Claude for balanced quality/cost on analytical tasks
  [TaskType.SUMMARIZATION]: 'anthropic/claude-3.5-sonnet',
  [TaskType.EDITORIAL_ANALYSIS]: 'anthropic/claude-3.5-sonnet',
  [TaskType.FACT_CHECKING]: 'anthropic/claude-3.5-sonnet',
  
  // Use GPT-4o for creative and complex generation
  [TaskType.CREATIVE_WRITING]: 'openai/gpt-4o',
  [TaskType.ARTICLE_GENERATION]: 'google/gemini-2.0-flash-thinking-exp:free', // Cost-efficient articles
  [TaskType.SCRIPT_GENERATION]: 'openai/gpt-4o',
  [TaskType.DIALOGUE_GENERATION]: 'openai/gpt-4o',
  
  // Use appropriate models for utility tasks
  [TaskType.TRANSLATION]: 'anthropic/claude-3-haiku',
  [TaskType.TITLE_GENERATION]: 'openai/gpt-3.5-turbo',
  [TaskType.SIMPLE_COMPLETION]: 'openai/gpt-3.5-turbo',
};

/**
 * Model router function
 * Returns the optimal model for a given task type
 * 
 * @param taskType - The type of task to perform
 * @param override - Optional model override for testing or specific needs
 * @returns The model identifier to use for the task
 */
export function modelRouter(taskType: TaskType, override?: string): string {
  if (override) {
    console.log(`Model override: Using ${override} instead of default for ${taskType}`);
    return override;
  }
  
  const model = MODEL_ROUTER[taskType];
  if (!model) {
    console.warn(`No model configured for task type: ${taskType}, falling back to gpt-3.5-turbo`);
    return 'openai/gpt-3.5-turbo';
  }
  
  return model;
}

/**
 * Extended model information with capabilities
 */
export const MODEL_CAPABILITIES = {
  'openai/gpt-3.5-turbo': {
    maxTokens: 4096,
    strengths: ['balanced', 'reliable', 'good general purpose', 'fast'],
    weaknesses: ['not best at any specific task', 'can hallucinate'],
  },
  'openai/gpt-4o': {
    maxTokens: 4096,
    strengths: ['best creativity', 'excellent writing', 'complex reasoning'],
    weaknesses: ['expensive', 'can be verbose'],
  },
  'openai/gpt-4o-mini': {
    maxTokens: 16384,
    strengths: ['affordable', 'good reasoning', 'larger context'],
    weaknesses: ['not as creative as gpt-4o'],
  },
  'anthropic/claude-3.5-sonnet': {
    maxTokens: 8192,
    strengths: ['excellent analysis', 'nuanced understanding', 'factual accuracy'],
    weaknesses: ['higher cost', 'sometimes overly cautious'],
  },
  'anthropic/claude-3-haiku': {
    maxTokens: 4096,
    strengths: ['fast', 'affordable', 'good for simple tasks'],
    weaknesses: ['limited context', 'basic reasoning'],
  },
  'meta-llama/llama-3.1-70b-instruct': {
    maxTokens: 8192,
    strengths: ['open source heritage', 'good general purpose', 'affordable'],
    weaknesses: ['less refined than commercial models'],
  },
};

/**
 * Op-Ed specific cost tracking and analysis
 */
export interface OpEdCostSummary {
  totalOpEdCost: number;
  averageCostPerOpEd: number;
  opEdCount: number;
  dailyOpEdCosts: Record<string, number>;
  comparisonToArticles: {
    articleAverageCost: number;
    costMultiplier: number;
    costDifference: number;
  };
  monthlyProjection: number;
  budgetStatus: {
    dailyBudgetUsed: number;
    remainingBudget: number;
    daysUntilBudgetExceeded: number;
  };
}

/**
 * Get op-ed specific cost analysis
 */
export async function getOpEdCostSummary(costsFilePath?: string): Promise<OpEdCostSummary | null> {
  const costData = await getCostSummary(costsFilePath);
  if (!costData) return null;

  // Get op-ed specific entries
  const opEdEntries = costData.entries.filter(entry => 
    entry.taskType === TaskType.CREATIVE_WRITING || entry.taskType?.includes('oped')
  );

  const opEdCount = opEdEntries.length;
  const totalOpEdCost = opEdEntries.reduce((sum, entry) => sum + entry.cost, 0);
  const averageCostPerOpEd = opEdCount > 0 ? totalOpEdCost / opEdCount : 0;

  // Calculate daily op-ed costs
  const dailyOpEdCosts: Record<string, number> = {};
  opEdEntries.forEach(entry => {
    const date = entry.timestamp.split('T')[0];
    dailyOpEdCosts[date] = (dailyOpEdCosts[date] || 0) + entry.cost;
  });

  // Compare to article costs
  const articleEntries = costData.entries.filter(entry => 
    entry.taskType === TaskType.ARTICLE_GENERATION || entry.taskType?.includes('article')
  );
  const articleAverageCost = articleEntries.length > 0 
    ? articleEntries.reduce((sum, entry) => sum + entry.cost, 0) / articleEntries.length
    : 0;

  const costMultiplier = articleAverageCost > 0 ? averageCostPerOpEd / articleAverageCost : 0;
  const costDifference = averageCostPerOpEd - articleAverageCost;

  // Monthly projection (based on 2 op-eds per day, 30 days)
  const monthlyProjection = averageCostPerOpEd * 2 * 30;

  // Budget analysis (assuming $6/day total budget, op-eds are part of it)
  const today = new Date().toISOString().split('T')[0];
  const todayTotal = costData.dailyTotals[today] || 0;
  const dailyBudget = 6.0;
  const dailyBudgetUsed = (todayTotal / dailyBudget) * 100;
  const remainingBudget = Math.max(0, dailyBudget - todayTotal);
  const daysUntilBudgetExceeded = remainingBudget > 0 && averageCostPerOpEd > 0
    ? Math.floor(remainingBudget / (averageCostPerOpEd * 2)) // 2 op-eds per day
    : Infinity;

  return {
    totalOpEdCost,
    averageCostPerOpEd,
    opEdCount,
    dailyOpEdCosts,
    comparisonToArticles: {
      articleAverageCost,
      costMultiplier,
      costDifference
    },
    monthlyProjection,
    budgetStatus: {
      dailyBudgetUsed,
      remainingBudget,
      daysUntilBudgetExceeded
    }
  };
}

/**
 * Log op-ed cost analysis to console
 */
export async function logOpEdCostAnalysis(costsFilePath?: string): Promise<void> {
  const summary = await getOpEdCostSummary(costsFilePath);
  if (!summary) {
    console.log('📊 No op-ed cost data available yet');
    return;
  }

  console.log('\n📊 Op-Ed Cost Analysis:');
  console.log(`💰 Total Op-Ed Cost: $${summary.totalOpEdCost.toFixed(4)}`);
  console.log(`📝 Op-Eds Generated: ${summary.opEdCount}`);
  console.log(`💵 Average Cost per Op-Ed: $${summary.averageCostPerOpEd.toFixed(4)}`);

  if (summary.comparisonToArticles.articleAverageCost > 0) {
    console.log(`\n📈 Cost Comparison to Articles:`);
    console.log(`   Article Average: $${summary.comparisonToArticles.articleAverageCost.toFixed(4)}`);
    console.log(`   Op-Ed Premium: ${summary.comparisonToArticles.costMultiplier.toFixed(1)}x more expensive`);
    console.log(`   Cost Difference: +$${summary.comparisonToArticles.costDifference.toFixed(4)} per piece`);
  }

  console.log(`\n📅 Monthly Projection: $${summary.monthlyProjection.toFixed(2)} (2 op-eds/day)`);
  
  console.log(`\n🎯 Budget Status:`);
  console.log(`   Daily Budget Used: ${summary.budgetStatus.dailyBudgetUsed.toFixed(1)}%`);
  console.log(`   Remaining Today: $${summary.budgetStatus.remainingBudget.toFixed(2)}`);
  
  if (summary.budgetStatus.daysUntilBudgetExceeded === Infinity) {
    console.log(`   Budget Status: ✅ Within limits`);
  } else if (summary.budgetStatus.daysUntilBudgetExceeded > 7) {
    console.log(`   Budget Status: ✅ Safe for ${summary.budgetStatus.daysUntilBudgetExceeded} days`);
  } else if (summary.budgetStatus.daysUntilBudgetExceeded > 1) {
    console.log(`   Budget Status: ⚠️ Will exceed budget in ${summary.budgetStatus.daysUntilBudgetExceeded} days`);
  } else {
    console.log(`   Budget Status: 🚨 Budget will be exceeded tomorrow!`);
  }
}

/**
 * Check if op-ed generation should be limited due to cost concerns
 */
export async function shouldLimitOpEdGeneration(costsFilePath?: string): Promise<{
  shouldLimit: boolean;
  reason?: string;
  maxOpEdsAllowed: number;
}> {
  const summary = await getOpEdCostSummary(costsFilePath);
  if (!summary) {
    return { shouldLimit: false, maxOpEdsAllowed: 2 }; // Default limit
  }

  const dailyBudget = 6.0;
  const currentSpend = dailyBudget - summary.budgetStatus.remainingBudget;
  const averageCost = summary.averageCostPerOpEd;

  // If we've used more than 80% of daily budget, limit op-eds
  if (summary.budgetStatus.dailyBudgetUsed > 80) {
    const remainingForOpEds = summary.budgetStatus.remainingBudget * 0.5; // Reserve 50% for op-eds
    const maxOpEds = averageCost > 0 ? Math.floor(remainingForOpEds / averageCost) : 0;
    
    return {
      shouldLimit: true,
      reason: `Daily budget 80% used (${summary.budgetStatus.dailyBudgetUsed.toFixed(1)}%)`,
      maxOpEdsAllowed: Math.max(0, maxOpEds)
    };
  }

  // If average op-ed cost is too high (>$1), limit generation
  if (averageCost > 1.0) {
    return {
      shouldLimit: true,
      reason: `Op-ed cost too high: $${averageCost.toFixed(4)} per piece`,
      maxOpEdsAllowed: 1 // Only allow 1 expensive op-ed per day
    };
  }

  // Normal operation
  return {
    shouldLimit: false,
    maxOpEdsAllowed: 2
  };
}

/**
 * Get task type cost breakdown
 */
export async function getTaskTypeCostBreakdown(costsFilePath?: string): Promise<Record<string, {
  totalCost: number;
  count: number;
  averageCost: number;
  percentage: number;
}> | null> {
  const costData = await getCostSummary(costsFilePath);
  if (!costData || costData.entries.length === 0) return null;

  const taskTypeStats: Record<string, { totalCost: number; count: number }> = {};

  // Calculate stats for each task type
  costData.entries.forEach(entry => {
    const taskType = entry.taskType || 'unknown';
    if (!taskTypeStats[taskType]) {
      taskTypeStats[taskType] = { totalCost: 0, count: 0 };
    }
    taskTypeStats[taskType].totalCost += entry.cost;
    taskTypeStats[taskType].count += 1;
  });

  // Convert to breakdown format
  const breakdown: Record<string, any> = {};
  Object.keys(taskTypeStats).forEach(taskType => {
    const stats = taskTypeStats[taskType];
    breakdown[taskType] = {
      totalCost: stats.totalCost,
      count: stats.count,
      averageCost: stats.totalCost / stats.count,
      percentage: (stats.totalCost / costData.grandTotal) * 100
    };
  });

  return breakdown;
}