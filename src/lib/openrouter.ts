/**
 * OpenRouter API Client
 * Unified interface for accessing multiple AI models through OpenRouter
 * Based on existing patterns from pages/api/episodes.ts
 */

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
  async createChatCompletion(request: OpenRouterRequest): Promise<OpenRouterResponse> {
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
  'google/gemini-2.0-flash-thinking-exp:free': { input: 0, output: 0 },
  'google/gemini-2.0-flash-exp:free': { input: 0, output: 0 },
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