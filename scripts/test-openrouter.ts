#!/usr/bin/env tsx
/**
 * Test OpenRouter integration with a 100-word news summary
 * Validates response structure and basic functionality
 * Run with: npx tsx scripts/test-openrouter.ts
 */

import * as dotenv from 'dotenv';
import { OpenRouterClient, TaskType, calculateCost } from '../src/lib/openrouter';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function runTest(name: string, testFn: () => Promise<TestResult>): Promise<boolean> {
  process.stdout.write(`  ${name}... `);
  
  try {
    const result = await testFn();
    if (result.passed) {
      console.log(`${colors.green}✓${colors.reset}`);
      if (result.details) {
        console.log(`    ${colors.dim}${JSON.stringify(result.details, null, 2).split('\n').join('\n    ')}${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗${colors.reset}`);
      console.log(`    ${colors.red}${result.message}${colors.reset}`);
    }
    return result.passed;
  } catch (error: any) {
    console.log(`${colors.red}✗${colors.reset}`);
    console.log(`    ${colors.red}Error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testOpenRouter() {
  console.log('\n🧪 OpenRouter Integration Test Suite\n');
  console.log('=' .repeat(50));
  
  const client = new OpenRouterClient();
  let allTestsPassed = true;
  
  // Store response for validation across tests
  let newsResponse: any = null;
  
  // Test 1: Generate 100-word news summary
  console.log('\n📰 Test 1: Generate News Summary\n');
  
  allTestsPassed = await runTest('Generate 100-word news summary', async () => {
    const prompt = `Write a 100-word news summary about a recent technological breakthrough in renewable energy. 
    Make it sound like a professional news report with specific details and statistics. 
    The summary should be exactly 100 words.`;
    
    try {
      newsResponse = await client.completeTask(
        TaskType.SUMMARIZATION,
        prompt,
        {
          maxTokens: 150,
          temperature: 0.7,
        }
      );
      
      const wordCount = newsResponse.content.split(/\s+/).filter((word: string) => word.length > 0).length;
      
      return {
        passed: newsResponse.content.length > 0,
        message: 'News summary generated successfully',
        details: {
          wordCount,
          characterCount: newsResponse.content.length,
          model: newsResponse.model,
        }
      };
    } catch (error: any) {
      return {
        passed: false,
        message: error.message,
      };
    }
  }) && allTestsPassed;
  
  // Test 2: Validate response structure
  console.log('\n🔍 Test 2: Validate Response Structure\n');
  
  allTestsPassed = await runTest('Response has required fields', async () => {
    if (!newsResponse) {
      return { passed: false, message: 'No response to validate' };
    }
    
    const requiredFields = ['content', 'model', 'usage'];
    const missingFields = requiredFields.filter(field => !(field in newsResponse));
    
    if (missingFields.length > 0) {
      return {
        passed: false,
        message: `Missing fields: ${missingFields.join(', ')}`,
      };
    }
    
    return {
      passed: true,
      message: 'All required fields present',
      details: {
        hasContent: !!newsResponse.content,
        hasModel: !!newsResponse.model,
        hasUsage: !!newsResponse.usage,
        hasCost: !!newsResponse.cost,
      }
    };
  }) && allTestsPassed;
  
  allTestsPassed = await runTest('Content is non-empty string', async () => {
    if (!newsResponse) {
      return { passed: false, message: 'No response to validate' };
    }
    
    const isValid = typeof newsResponse.content === 'string' && newsResponse.content.length > 0;
    
    return {
      passed: isValid,
      message: isValid ? 'Content is valid string' : 'Content is not a valid string',
      details: {
        type: typeof newsResponse.content,
        length: newsResponse.content?.length || 0,
      }
    };
  }) && allTestsPassed;
  
  allTestsPassed = await runTest('Model is valid OpenRouter model', async () => {
    if (!newsResponse) {
      return { passed: false, message: 'No response to validate' };
    }
    
    const validModelPattern = /^[a-z0-9-]+\/[a-z0-9-\.]+$/i;
    const isValid = validModelPattern.test(newsResponse.model);
    
    return {
      passed: isValid,
      message: isValid ? 'Model ID is valid' : 'Invalid model ID format',
      details: {
        model: newsResponse.model,
      }
    };
  }) && allTestsPassed;
  
  allTestsPassed = await runTest('Usage data is properly structured', async () => {
    if (!newsResponse || !newsResponse.usage) {
      return { passed: false, message: 'No usage data to validate' };
    }
    
    const usage = newsResponse.usage;
    const hasRequiredFields = 
      typeof usage.prompt_tokens === 'number' &&
      typeof usage.completion_tokens === 'number' &&
      typeof usage.total_tokens === 'number';
    
    const tokensMatch = usage.total_tokens === (usage.prompt_tokens + usage.completion_tokens);
    
    return {
      passed: hasRequiredFields && tokensMatch,
      message: hasRequiredFields && tokensMatch ? 'Usage data is valid' : 'Invalid usage data',
      details: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        tokensMatch,
      }
    };
  }) && allTestsPassed;
  
  // Test 3: Validate word count
  console.log('\n📏 Test 3: Validate Word Count\n');
  
  allTestsPassed = await runTest('Word count is approximately 100', async () => {
    if (!newsResponse) {
      return { passed: false, message: 'No response to validate' };
    }
    
    const words = newsResponse.content.split(/\s+/).filter((word: string) => word.length > 0);
    const wordCount = words.length;
    const isWithinRange = wordCount >= 80 && wordCount <= 120; // Allow some flexibility
    
    return {
      passed: isWithinRange,
      message: isWithinRange ? 'Word count is within range' : `Word count ${wordCount} is outside range (80-120)`,
      details: {
        wordCount,
        targetWords: 100,
        deviation: Math.abs(100 - wordCount),
      }
    };
  }) && allTestsPassed;
  
  // Test 4: Cost calculation
  console.log('\n💰 Test 4: Cost Calculation\n');
  
  allTestsPassed = await runTest('Cost is calculated correctly', async () => {
    if (!newsResponse || !newsResponse.usage) {
      return { passed: false, message: 'No response to validate cost' };
    }
    
    const expectedCost = calculateCost(newsResponse.model, newsResponse.usage);
    const actualCost = newsResponse.cost;
    
    const costsMatch = Math.abs(expectedCost - actualCost) < 0.000001; // Allow for floating point errors
    
    return {
      passed: costsMatch && expectedCost > 0,
      message: costsMatch ? 'Cost calculated correctly' : 'Cost calculation mismatch',
      details: {
        expectedCost: expectedCost.toFixed(6),
        actualCost: actualCost?.toFixed(6),
        model: newsResponse.model,
        tokens: newsResponse.usage.total_tokens,
      }
    };
  }) && allTestsPassed;
  
  // Test 5: Response quality
  console.log('\n✨ Test 5: Response Quality\n');
  
  allTestsPassed = await runTest('Content appears to be about renewable energy', async () => {
    if (!newsResponse) {
      return { passed: false, message: 'No response to validate' };
    }
    
    const content = newsResponse.content.toLowerCase();
    const keywords = ['energy', 'renewable', 'solar', 'wind', 'battery', 'power', 'sustainable', 'carbon', 'climate'];
    const foundKeywords = keywords.filter(keyword => content.includes(keyword));
    
    const hasRelevantContent = foundKeywords.length >= 2;
    
    return {
      passed: hasRelevantContent,
      message: hasRelevantContent ? 'Content is relevant to prompt' : 'Content may not be relevant',
      details: {
        foundKeywords,
        keywordCount: foundKeywords.length,
      }
    };
  }) && allTestsPassed;
  
  allTestsPassed = await runTest('Content has professional tone', async () => {
    if (!newsResponse) {
      return { passed: false, message: 'No response to validate' };
    }
    
    const content = newsResponse.content;
    
    // Check for basic news writing elements
    const hasCapitalization = /^[A-Z]/.test(content);
    const hasPunctuation = /[.!?]$/.test(content.trim());
    const hasNumbers = /\d/.test(content); // News often includes statistics
    const sentenceCount = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).length;
    
    const appearsProfessional = hasCapitalization && hasPunctuation && sentenceCount >= 3;
    
    return {
      passed: appearsProfessional,
      message: appearsProfessional ? 'Content appears professional' : 'Content may lack professional tone',
      details: {
        hasCapitalization,
        hasPunctuation,
        hasNumbers,
        sentenceCount,
      }
    };
  }) && allTestsPassed;
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('\n📊 Test Summary\n');
  
  if (newsResponse) {
    console.log('Generated News Summary:');
    console.log('─'.repeat(50));
    console.log(newsResponse.content);
    console.log('─'.repeat(50));
    console.log(`\nModel: ${newsResponse.model}`);
    console.log(`Cost: $${newsResponse.cost?.toFixed(6) || '0.000000'}`);
    console.log(`Tokens: ${newsResponse.usage?.total_tokens || 0}`);
  }
  
  if (allTestsPassed) {
    console.log(`\n${colors.green}✅ All tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Some tests failed.${colors.reset}`);
    process.exit(1);
  }
}

// Run the tests
testOpenRouter().catch((error) => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});