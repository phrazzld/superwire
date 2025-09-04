/**
 * Comprehensive error handling and retry logic for Superwire
 * 
 * Provides retry wrappers for external API calls with exponential backoff,
 * timeout handling, error categorization, and integration with cost tracking.
 * 
 * Based on established patterns from:
 * - OpenRouter client (array-based exponential backoff)  
 * - Scraper (AbortController timeout handling)
 * - ElevenLabs (comprehensive error categorization)
 */

import { trackTokenUsage } from './openrouter';
import { trackAudioUsage } from './elevenlabs';

/**
 * Error categories for different types of failures
 */
export enum ErrorCategory {
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  AUTHENTICATION = 'authentication',
  NETWORK = 'network', 
  API_ERROR = 'api_error',
  VALIDATION = 'validation',
  QUOTA_EXCEEDED = 'quota_exceeded',
  UNKNOWN = 'unknown'
}

/**
 * Retry result interface
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: EnhancedError;
  attempts: number;
  totalDuration: number;
  costs?: {
    tokens?: number;
    characters?: number;
    estimatedCost?: number;
  };
}

/**
 * Enhanced error with categorization and context
 */
export class EnhancedError extends Error {
  public readonly category: ErrorCategory;
  public readonly statusCode?: number;
  public readonly attempt: number;
  public readonly context: Record<string, any>;
  public readonly originalError?: Error;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    statusCode?: number,
    attempt: number = 1,
    context: Record<string, any> = {},
    originalError?: Error,
    isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'EnhancedError';
    this.category = category;
    this.statusCode = statusCode;
    this.attempt = attempt;
    this.context = context;
    this.originalError = originalError;
    this.isRetryable = isRetryable;
  }
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxAttempts?: number;
  backoffStrategy?: 'exponential' | 'fixed' | 'linear';
  delayMs?: number[];
  timeoutMs?: number;
  retryIf?: (error: EnhancedError) => boolean;
  onRetry?: (error: EnhancedError, attempt: number) => void;
  context?: Record<string, any>;
  trackCosts?: boolean;
}

/**
 * Default retry configuration following OpenRouter patterns
 */
export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  backoffStrategy: 'exponential',
  delayMs: [1000, 2000, 4000], // Following OpenRouter pattern
  timeoutMs: 30000, // 30 seconds default timeout
  retryIf: (error: EnhancedError) => error.isRetryable,
  onRetry: (error: EnhancedError, attempt: number) => {
    console.warn(`⚠️ Retry attempt ${attempt} after error: ${error.message}`);
  },
  context: {},
  trackCosts: false
};

/**
 * Categorize errors based on type and status code
 */
export function categorizeError(error: any, response?: Response): ErrorCategory {
  // AbortError for timeouts (following scraper pattern)
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return ErrorCategory.TIMEOUT;
  }

  // HTTP status code categorization
  if (response?.status || error.status) {
    const status = response?.status || error.status;
    
    if (status === 401 || status === 403) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (status === 429) {
      return ErrorCategory.RATE_LIMIT;
    }
    if (status === 402 || status === 403) {
      return ErrorCategory.QUOTA_EXCEEDED;
    }
    if (status >= 400 && status < 500) {
      return ErrorCategory.VALIDATION;
    }
    if (status >= 500) {
      return ErrorCategory.API_ERROR;
    }
  }

  // Network errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || 
      error.message?.includes('fetch') || error.message?.includes('network')) {
    return ErrorCategory.NETWORK;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Determine if error is retryable based on category
 */
export function isRetryableError(category: ErrorCategory): boolean {
  const retryableCategories = [
    ErrorCategory.TIMEOUT,
    ErrorCategory.RATE_LIMIT,
    ErrorCategory.NETWORK,
    ErrorCategory.API_ERROR
  ];
  
  return retryableCategories.includes(category);
}

/**
 * Calculate delay for next retry attempt
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const { backoffStrategy, delayMs } = options;
  
  switch (backoffStrategy) {
    case 'exponential':
      // Use predefined delays if available, otherwise calculate
      if (attempt <= delayMs.length) {
        return delayMs[attempt - 1];
      }
      return Math.pow(2, attempt - 1) * 1000; // Fallback to mathematical exponential
      
    case 'linear':
      return attempt * 1000;
      
    case 'fixed':
      return delayMs[0] || 1000;
      
    default:
      return delayMs[0] || 1000;
  }
}

/**
 * Main retry wrapper function
 * 
 * Wraps any async function with retry logic, following established patterns
 * from OpenRouter, ElevenLabs, and scraper implementations.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: EnhancedError;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      // Create AbortController for timeout (following scraper pattern)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, opts.timeoutMs);

      try {
        // Execute the function with timeout handling
        const result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new EnhancedError(
                `Operation timed out after ${opts.timeoutMs}ms`,
                ErrorCategory.TIMEOUT,
                undefined,
                attempt,
                { ...opts.context, timeoutMs: opts.timeoutMs }
              ));
            });
          })
        ]);

        clearTimeout(timeoutId);
        
        // Success - return result
        return {
          success: true,
          data: result,
          attempts: attempt,
          totalDuration: Date.now() - startTime
        };
        
      } finally {
        clearTimeout(timeoutId);
      }
      
    } catch (error: any) {
      const category = categorizeError(error);
      const isRetryable = isRetryableError(category);
      
      lastError = new EnhancedError(
        error.message || 'Unknown error',
        category,
        error.status || error.statusCode,
        attempt,
        { ...opts.context, originalErrorName: error.name },
        error,
        isRetryable
      );

      // Check if we should retry
      const shouldRetry = attempt < opts.maxAttempts && 
                         opts.retryIf(lastError) && 
                         isRetryable;

      if (!shouldRetry) {
        break;
      }

      // Call retry callback
      opts.onRetry(lastError, attempt);

      // Calculate and wait for next attempt
      const delay = calculateDelay(attempt, opts);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All attempts failed
  return {
    success: false,
    error: lastError!,
    attempts: opts.maxAttempts,
    totalDuration: Date.now() - startTime
  };
}

/**
 * Specialized retry wrapper for OpenRouter API calls with cost tracking
 */
export async function withRetryAndCostTracking<T>(
  fn: () => Promise<T>,
  taskType: string,
  model: string,
  options: RetryOptions = {}
): Promise<RetryResult<T & { usage?: any }>> {
  const optsWithCosts = { ...options, trackCosts: true };
  
  const result = await withRetry(async () => {
    const response = await fn();
    
    // Track costs if response includes usage information
    if (response && typeof response === 'object' && 'usage' in response) {
      const usage = (response as any).usage;
      if (usage && usage.total_tokens && usage.prompt_tokens && usage.completion_tokens) {
        await trackTokenUsage(
          model,
          usage.prompt_tokens,
          usage.completion_tokens,
          { taskType }
        );
      }
    }
    
    return response;
  }, optsWithCosts);

  return result as RetryResult<T & { usage?: any }>;
}

/**
 * Specialized retry wrapper for audio generation with character tracking
 */
export async function withRetryAudio<T>(
  fn: () => Promise<T>,
  textLength: number,
  voiceId: string,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  return withRetry(async () => {
    const result = await fn();
    
    // Track audio costs
    await trackAudioUsage(voiceId, textLength, { taskType: 'audio_generation' });
    
    return result;
  }, options);
}

/**
 * Utility function to create retry-enabled versions of functions
 */
export function retryable<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<RetryResult<TReturn>> {
  return async (...args: TArgs) => {
    return withRetry(() => fn(...args), options);
  };
}

/**
 * Batch retry function for processing arrays with individual retry logic
 */
export async function withRetryBatch<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  options: RetryOptions & { concurrency?: number } = {}
): Promise<{
  successful: Array<{ item: T; result: R; attempts: number }>;
  failed: Array<{ item: T; error: EnhancedError; attempts: number }>;
  totalDuration: number;
}> {
  const startTime = Date.now();
  const concurrency = options.concurrency || 3;
  const successful: Array<{ item: T; result: R; attempts: number }> = [];
  const failed: Array<{ item: T; error: EnhancedError; attempts: number }> = [];

  // Process in batches with controlled concurrency
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const result = await withRetry(() => processFn(item), options);
        
        if (result.success) {
          successful.push({ 
            item, 
            result: result.data!,
            attempts: result.attempts 
          });
        } else {
          failed.push({ 
            item, 
            error: result.error!,
            attempts: result.attempts 
          });
        }
      })
    );

    // Small delay between batches to avoid overwhelming the target
    if (i + concurrency < items.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return {
    successful,
    failed,
    totalDuration: Date.now() - startTime
  };
}

/**
 * Health check function to test retry mechanisms
 */
export async function testRetryMechanism(): Promise<boolean> {
  console.log('🧪 Testing retry mechanism...');
  
  let attempts = 0;
  
  const result = await withRetry(async () => {
    attempts++;
    if (attempts < 3) {
      throw new Error('Simulated failure');
    }
    return 'success';
  }, {
    maxAttempts: 3,
    delayMs: [100, 200, 400], // Faster for testing
    onRetry: (error, attempt) => {
      console.log(`  Retry ${attempt}: ${error.message}`);
    }
  });
  
  const success = result.success && result.data === 'success' && result.attempts === 3;
  console.log(`✅ Retry test: ${success ? 'PASSED' : 'FAILED'}`);
  
  return success;
}