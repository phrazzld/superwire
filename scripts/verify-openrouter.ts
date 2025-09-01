#!/usr/bin/env tsx
/**
 * Verify OpenRouter API connection
 * Run with: npx tsx scripts/verify-openrouter.ts
 */

import * as dotenv from 'dotenv';
import { OpenRouterClient } from '../src/lib/openrouter';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function verifyConnection() {
  console.log('🔍 Verifying OpenRouter connection...\n');

  // Check for API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'sk-or-v1-YOUR_OPENROUTER_API_KEY_HERE') {
    console.error('❌ Error: OpenRouter API key not configured');
    console.error('   Please add your actual API key to .env.local');
    console.error('   Get your key from: https://openrouter.ai/keys');
    process.exit(1);
  }

  console.log('✅ API key found\n');

  try {
    // Initialize client
    const client = new OpenRouterClient(apiKey);
    console.log('📡 Testing connection to OpenRouter...\n');

    // Test with a simple news summary prompt
    const prompt = `Write a 100-word news summary about a fictional breakthrough in renewable energy technology. Make it sound realistic and professional.`;
    
    console.log('📝 Sending test prompt to openai/gpt-3.5-turbo...\n');
    const startTime = Date.now();
    
    const response = await client.complete(
      prompt,
      'openai/gpt-3.5-turbo',
      150, // max tokens
      0.7  // temperature
    );

    const duration = Date.now() - startTime;

    // Validate response
    if (!response || response.length === 0) {
      throw new Error('Empty response received');
    }

    // Count words in response
    const wordCount = response.split(/\s+/).filter(word => word.length > 0).length;

    console.log('✅ SUCCESS! OpenRouter connection verified\n');
    console.log('📊 Response Stats:');
    console.log(`   - Model: openai/gpt-3.5-turbo`);
    console.log(`   - Response time: ${duration}ms`);
    console.log(`   - Word count: ${wordCount} words`);
    console.log(`   - Character count: ${response.length} characters\n`);
    
    console.log('📰 Generated News Summary:');
    console.log('─'.repeat(50));
    console.log(response);
    console.log('─'.repeat(50));
    
    console.log('\n✨ OpenRouter is ready to use!');
    
    // Test cost calculation
    const estimatedCost = (150 / 1000000) * 1.50; // rough estimate for output tokens
    console.log(`💰 Estimated cost for this test: $${estimatedCost.toFixed(6)}`);

  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('\n🔍 Troubleshooting tips:');
    console.error('   1. Check your API key is valid');
    console.error('   2. Ensure you have credits in your OpenRouter account');
    console.error('   3. Check your internet connection');
    console.error('   4. Verify the API key starts with "sk-or-v1-"');
    process.exit(1);
  }
}

// Run verification
verifyConnection().catch(console.error);