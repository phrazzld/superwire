#!/usr/bin/env tsx
/**
 * Test the modelRouter function and task-based completion
 * Run with: npx tsx scripts/test-model-router.ts
 */

import * as dotenv from 'dotenv';
import { OpenRouterClient, TaskType, modelRouter, MODEL_ROUTER } from '../src/lib/openrouter';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testModelRouter() {
  console.log('🧪 Testing Model Router Functionality\n');
  console.log('=' .repeat(50));
  
  // Test 1: Verify model mapping
  console.log('\n📋 Test 1: Model Mapping Verification\n');
  
  const taskTests = [
    { task: TaskType.CLASSIFICATION, expected: 'openai/gpt-3.5-turbo' },
    { task: TaskType.SUMMARIZATION, expected: 'anthropic/claude-3.5-sonnet' },
    { task: TaskType.CREATIVE_WRITING, expected: 'openai/gpt-4o' },
    { task: TaskType.SIMPLE_COMPLETION, expected: 'openai/gpt-3.5-turbo' },
  ];

  let passed = 0;
  for (const test of taskTests) {
    const result = modelRouter(test.task);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${status} ${test.task}: ${result}`);
    if (result === test.expected) passed++;
  }
  
  console.log(`\n✓ Passed ${passed}/${taskTests.length} model routing tests`);

  // Test 2: Override functionality
  console.log('\n📋 Test 2: Model Override\n');
  
  const overrideModel = 'openai/gpt-3.5-turbo';
  const overrideResult = modelRouter(TaskType.CREATIVE_WRITING, overrideModel);
  console.log(`Override test: ${overrideResult === overrideModel ? '✅' : '❌'}`);
  console.log(`  Expected: ${overrideModel}`);
  console.log(`  Got: ${overrideResult}`);

  // Test 3: Live API test with different task types
  console.log('\n📋 Test 3: Live API Test with Task Routing\n');
  
  const client = new OpenRouterClient();
  
  const testCases = [
    {
      type: TaskType.CLASSIFICATION,
      prompt: 'Classify this text into one category: "The stock market rose 2% today on strong earnings reports." Categories: Business, Sports, Entertainment, Technology',
    },
    {
      type: TaskType.TITLE_GENERATION,
      prompt: 'Generate a catchy headline for an article about renewable energy breakthrough',
    },
    {
      type: TaskType.EXTRACTION,
      prompt: 'Extract the key fact from this text: "Scientists discovered a new exoplanet 120 light-years away that may have water."',
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔄 Testing ${testCase.type}...`);
    
    try {
      const startTime = Date.now();
      const result = await client.completeTask(testCase.type, testCase.prompt, {
        maxTokens: 100,
        temperature: 0.5,
      });
      const duration = Date.now() - startTime;
      
      console.log(`  Model used: ${result.model}`);
      console.log(`  Response time: ${duration}ms`);
      console.log(`  Response: ${result.content.substring(0, 100)}...`);
      
      if (result.usage) {
        console.log(`  Tokens: ${result.usage.prompt_tokens} in, ${result.usage.completion_tokens} out`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  // Test 4: Display cost comparison
  console.log('\n📋 Test 4: Cost Analysis by Task Type\n');
  console.log('Estimated costs for 1000 requests of each type (assuming 500 tokens avg):');
  console.log('-'.repeat(60));
  
  const { MODEL_PRICING } = await import('../src/lib/openrouter');
  
  for (const [taskType, model] of Object.entries(MODEL_ROUTER)) {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
    if (pricing) {
      const costPer1000 = ((500 / 1_000_000) * pricing.output * 1000);
      console.log(`${taskType.padEnd(20)} → ${model.padEnd(40)} $${costPer1000.toFixed(4)}`);
    }
  }

  console.log('\n✨ Model Router testing complete!');
}

// Run tests
testModelRouter().catch(console.error);