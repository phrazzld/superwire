#!/usr/bin/env tsx

/**
 * Test script for new GPT-5 and Gemini 2.5 models
 */

import dotenv from 'dotenv';
import { OpenRouterClient, TaskType } from '../src/lib/openrouter';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testNewModels() {
  console.log('\n🚀 Testing New GPT-5 and Gemini 2.5 Models\n');
  console.log('=' .repeat(50) + '\n');

  const client = new OpenRouterClient();
  const testResults: any[] = [];

  // Test 1: GPT-5-mini for script generation
  console.log('📝 Test 1: GPT-5-mini for Script Generation');
  try {
    const scriptResult = await client.completeTask(
      TaskType.SCRIPT_GENERATION,
      'Write a brief podcast intro about artificial intelligence advances.',
      {
        maxTokens: 150,
        temperature: 0.7,
        trackCosts: true
      }
    );
    
    console.log(`✅ Success! Model: ${scriptResult.model}`);
    console.log(`   Cost: $${scriptResult.cost?.toFixed(6)}`);
    console.log(`   Length: ${scriptResult.content.length} chars\n`);
    testResults.push({ test: 'GPT-5-mini Script', success: true, model: scriptResult.model, cost: scriptResult.cost });
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}\n`);
    testResults.push({ test: 'GPT-5-mini Script', success: false, error: error.message });
  }

  // Test 2: Gemini 2.5 Flash for article generation
  console.log('📰 Test 2: Gemini 2.5 Flash for Article Generation');
  try {
    const articleResult = await client.completeTask(
      TaskType.ARTICLE_GENERATION,
      'Write a 100-word news article about renewable energy.',
      {
        maxTokens: 200,
        temperature: 0.7,
        trackCosts: true
      }
    );
    
    console.log(`✅ Success! Model: ${articleResult.model}`);
    console.log(`   Cost: $${articleResult.cost?.toFixed(6)}`);
    console.log(`   Length: ${articleResult.content.length} chars\n`);
    testResults.push({ test: 'Gemini 2.5 Flash Article', success: true, model: articleResult.model, cost: articleResult.cost });
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}\n`);
    testResults.push({ test: 'Gemini 2.5 Flash Article', success: false, error: error.message });
  }

  // Test 3: Gemini 2.5 Flash Lite for classification
  console.log('🏷️ Test 3: Gemini 2.5 Flash Lite for Classification');
  try {
    const classificationResult = await client.completeTask(
      TaskType.CLASSIFICATION,
      'Classify this headline: "Stock Market Reaches All-Time High"',
      {
        maxTokens: 50,
        temperature: 0.3,
        trackCosts: true
      }
    );
    
    console.log(`✅ Success! Model: ${classificationResult.model}`);
    console.log(`   Cost: $${classificationResult.cost?.toFixed(6)}`);
    console.log(`   Response: ${classificationResult.content.substring(0, 100)}\n`);
    testResults.push({ test: 'Gemini 2.5 Flash Lite Classification', success: true, model: classificationResult.model, cost: classificationResult.cost });
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}\n`);
    testResults.push({ test: 'Gemini 2.5 Flash Lite Classification', success: false, error: error.message });
  }

  // Test 4: GPT-5 for creative writing
  console.log('✍️ Test 4: GPT-5 for Creative Writing');
  try {
    const creativeResult = await client.completeTask(
      TaskType.CREATIVE_WRITING,
      'Write a creative opening paragraph for a story about the future.',
      {
        maxTokens: 150,
        temperature: 0.8,
        trackCosts: true
      }
    );
    
    console.log(`✅ Success! Model: ${creativeResult.model}`);
    console.log(`   Cost: $${creativeResult.cost?.toFixed(6)}`);
    console.log(`   Length: ${creativeResult.content.length} chars\n`);
    testResults.push({ test: 'GPT-5 Creative', success: true, model: creativeResult.model, cost: creativeResult.cost });
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}\n`);
    testResults.push({ test: 'GPT-5 Creative', success: false, error: error.message });
  }

  // Summary
  console.log('=' .repeat(50));
  console.log('\n📊 Test Summary:\n');
  
  const successCount = testResults.filter(r => r.success).length;
  const totalCost = testResults.reduce((sum, r) => sum + (r.cost || 0), 0);
  
  testResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const details = result.success 
      ? `${result.model} - $${result.cost?.toFixed(6)}`
      : result.error;
    console.log(`${status} ${result.test}: ${details}`);
  });
  
  console.log(`\n🎯 Success Rate: ${successCount}/${testResults.length}`);
  console.log(`💰 Total Cost: $${totalCost.toFixed(6)}`);
  
  // Cost comparison
  console.log('\n💡 Cost Comparison:');
  console.log('   GPT-4o:     $2.50/$10.00 per 1M tokens');
  console.log('   GPT-5-mini: $0.25/$2.00 per 1M tokens (10x cheaper!)');
  console.log('   Gemini 2.5: $0.10/$0.40 per 1M tokens (25x cheaper!)');
}

// Run the test
testNewModels().catch(console.error);