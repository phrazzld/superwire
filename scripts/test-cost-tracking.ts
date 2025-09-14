#!/usr/bin/env tsx
/**
 * Test the cost tracking functionality
 * Run with: npx tsx scripts/test-cost-tracking.ts
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { OpenRouterClient, TaskType, getCostSummary, trackTokenUsage } from '../src/lib/openrouter';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testCostTracking() {
  console.log('💰 Testing Cost Tracking Functionality\n');
  console.log('=' .repeat(50));
  
  const client = new OpenRouterClient();
  const costsPath = path.join(process.cwd(), 'costs.json');
  
  // Clean up any existing costs file for testing
  if (fs.existsSync(costsPath)) {
    console.log('📝 Existing costs.json found, backing up...');
    fs.renameSync(costsPath, `${costsPath}.backup-${Date.now()}`);
  }
  
  try {
    // Test 1: Direct cost tracking
    console.log('\n📋 Test 1: Direct Cost Tracking\n');
    
    await trackTokenUsage('openai/gpt-3.5-turbo', 100, 50, {
      taskType: 'test',
      prompt: 'This is a test prompt',
    });
    
    console.log('✅ Direct tracking completed');
    
    // Test 2: API call with automatic tracking
    console.log('\n📋 Test 2: API Call with Automatic Tracking\n');
    
    const result = await client.completeTask(
      TaskType.TITLE_GENERATION,
      'Generate a title for an article about cost tracking in AI systems',
      {
        maxTokens: 50,
        temperature: 0.7,
      }
    );
    
    console.log('✅ API call completed');
    console.log(`   Generated: "${result.content}"`);
    console.log(`   Model: ${result.model}`);
    if (result.cost) {
      console.log(`   Cost: $${result.cost.toFixed(6)}`);
    }
    
    // Test 3: Multiple task types
    console.log('\n📋 Test 3: Multiple Task Types\n');
    
    const taskTests = [
      { type: TaskType.CLASSIFICATION, prompt: 'Classify: "AI is transforming industries"' },
      { type: TaskType.EXTRACTION, prompt: 'Extract the main topic from: "Cost tracking helps budget management"' },
      { type: TaskType.SIMPLE_COMPLETION, prompt: 'Complete: The purpose of cost tracking is' },
    ];
    
    for (const test of taskTests) {
      console.log(`\n🔄 Testing ${test.type}...`);
      
      const result = await client.completeTask(test.type, test.prompt, {
        maxTokens: 30,
        temperature: 0.5,
      });
      
      console.log(`   ✓ Response: ${result.content.substring(0, 50)}...`);
      console.log(`   ✓ Cost: $${result.cost?.toFixed(6) || '0.000000'}`);
    }
    
    // Test 4: Read cost summary
    console.log('\n📋 Test 4: Cost Summary\n');
    
    const summary = await getCostSummary();
    
    if (summary) {
      console.log('📊 Cost Summary:');
      console.log(`   Total entries: ${summary.entries.length}`);
      console.log(`   Grand total: $${summary.grandTotal.toFixed(6)}`);
      console.log('\n   Model breakdown:');
      
      for (const [model, cost] of Object.entries(summary.modelTotals)) {
        console.log(`     ${model}: $${cost.toFixed(6)}`);
      }
      
      console.log('\n   Daily totals:');
      for (const [date, cost] of Object.entries(summary.dailyTotals)) {
        console.log(`     ${date}: $${cost.toFixed(6)}`);
      }
      
      // Show last 3 entries
      console.log('\n   Recent entries:');
      const recentEntries = summary.entries.slice(-3);
      for (const entry of recentEntries) {
        console.log(`     ${entry.timestamp.split('T')[1].split('.')[0]} - ${entry.model} - ${entry.totalTokens} tokens - $${entry.cost.toFixed(6)}`);
      }
    }
    
    // Test 5: Verify cost file structure
    console.log('\n📋 Test 5: Verify File Structure\n');
    
    const fileContent = fs.readFileSync(costsPath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    console.log('✅ costs.json structure:');
    console.log(`   - entries: ${Array.isArray(data.entries) ? '✓' : '✗'}`);
    console.log(`   - dailyTotals: ${typeof data.dailyTotals === 'object' ? '✓' : '✗'}`);
    console.log(`   - modelTotals: ${typeof data.modelTotals === 'object' ? '✓' : '✗'}`);
    console.log(`   - grandTotal: ${typeof data.grandTotal === 'number' ? '✓' : '✗'}`);
    
    // Test 6: Tracking disabled
    console.log('\n📋 Test 6: Cost Tracking Disabled\n');
    
    const resultNoTrack = await client.completeTask(
      TaskType.SIMPLE_COMPLETION,
      'Test without tracking',
      {
        maxTokens: 20,
        trackCosts: false,  // Disable tracking for this call
      }
    );
    
    console.log('✅ Call completed with tracking disabled');
    console.log(`   Cost calculated but not tracked: $${resultNoTrack.cost?.toFixed(6) || '0.000000'}`);
    
    console.log('\n✨ Cost tracking tests complete!');
    
    // Display warning if approaching daily limit
    if (summary && summary.dailyTotals[new Date().toISOString().split('T')[0]] > 4.0) {
      console.log('\n⚠️  WARNING: Approaching daily spending limit!');
    }
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run tests
testCostTracking().catch(console.error);