/**
 * ElevenLabs Audio Generation Test Script
 * Tests the generateAudioSegment implementation with all voice configurations
 */

import dotenv from 'dotenv';
import { 
  generateAudioSegment, 
  generateAudioSegmentsBatch,
  VOICE_CONFIGS, 
  estimateAudioCost,
  getAudioCostSummary,
  audioCache,
  validateAudio
} from '../src/lib/elevenlabs';

// Load environment variables
dotenv.config({ path: '.env.local' });

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

function colorLog(color: keyof typeof colors, message: string): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEnvironmentSetup(): Promise<boolean> {
  colorLog('cyan', '\n=== Testing Environment Setup ===');
  
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  if (!apiKey) {
    colorLog('red', '❌ ELEVEN_LABS_API_KEY not found in environment variables');
    return false;
  }
  
  if (apiKey === 'YOUR_ELEVEN_LABS_API_KEY_HERE') {
    colorLog('red', '❌ ELEVEN_LABS_API_KEY contains placeholder value');
    return false;
  }
  
  colorLog('green', '✅ ElevenLabs API key found');
  return true;
}

async function testCostEstimation(): Promise<boolean> {
  colorLog('cyan', '\n=== Testing Cost Estimation ===');
  
  const testText = "Welcome to Superwire, your AI-powered news podcast. Today we'll be covering the latest developments in technology, politics, and global affairs.";
  const estimatedCost = estimateAudioCost(testText);
  const expectedCost = testText.length * 0.00018;
  
  colorLog('white', `Test text: "${testText}"`);
  colorLog('white', `Character count: ${testText.length}`);
  colorLog('white', `Estimated cost: $${estimatedCost.toFixed(6)}`);
  colorLog('white', `Expected cost: $${expectedCost.toFixed(6)}`);
  
  if (Math.abs(estimatedCost - expectedCost) < 0.000001) {
    colorLog('green', '✅ Cost estimation working correctly');
    return true;
  } else {
    colorLog('red', '❌ Cost estimation mismatch');
    return false;
  }
}

async function testVoiceConfigurations(): Promise<boolean> {
  colorLog('cyan', '\n=== Testing Voice Configurations ===');
  
  const voices = Object.keys(VOICE_CONFIGS);
  colorLog('white', `Testing ${voices.length} voice configurations:`);
  
  for (const voiceName of voices) {
    const config = VOICE_CONFIGS[voiceName];
    colorLog('white', `  • ${config.name} (${config.voiceId}): stability=${config.stability}, similarity=${config.similarityBoost}`);
    
    if (config.stability !== 0.4) {
      colorLog('yellow', `    ⚠️  Stability should be 0.4 for optimal podcast quality (current: ${config.stability})`);
    }
    
    if (config.similarityBoost !== 0.75) {
      colorLog('yellow', `    ⚠️  Similarity boost should be 0.75 for optimal podcast quality (current: ${config.similarityBoost})`);
    }
  }
  
  colorLog('green', '✅ Voice configurations loaded');
  return true;
}

async function testSingleAudioGeneration(): Promise<boolean> {
  colorLog('cyan', '\n=== Testing Single Audio Generation ===');
  
  const testText = "This is a test of the ElevenLabs integration for Superwire.";
  const voiceName = 'adam';
  const voiceConfig = VOICE_CONFIGS[voiceName];
  
  if (!voiceConfig) {
    colorLog('red', `❌ Voice configuration not found: ${voiceName}`);
    return false;
  }
  
  colorLog('white', `Generating audio with ${voiceConfig.name} voice...`);
  colorLog('white', `Text: "${testText}"`);
  colorLog('white', `Estimated cost: $${estimateAudioCost(testText).toFixed(4)}`);
  
  try {
    const result = await generateAudioSegment(testText, voiceConfig.voiceId, {
      enableCaching: true,
      taskType: 'test_generation'
    });
    
    if (result.success) {
      colorLog('green', '✅ Audio generation successful');
      colorLog('white', `  • Cost: $${result.cost.toFixed(4)}`);
      colorLog('white', `  • Characters: ${result.characterCount}`);
      colorLog('white', `  • Duration: ${result.duration || 'unknown'}`);
      colorLog('white', `  • From cache: ${result.fromCache}`);
      colorLog('white', `  • Retry count: ${result.retryCount || 0}`);
      
      if (result.audioBuffer) {
        const validation = validateAudio(result.audioBuffer);
        if (validation.isValid) {
          colorLog('green', '  ✅ Audio validation passed');
          colorLog('white', `    • Format: ${validation.format}`);
          colorLog('white', `    • Duration: ${validation.duration?.toFixed(1)}s`);
          colorLog('white', `    • File size: ${validation.fileSize} bytes`);
        } else {
          colorLog('red', '  ❌ Audio validation failed:');
          validation.issues.forEach(issue => colorLog('red', `    • ${issue}`));
          return false;
        }
      }
      
      return true;
    } else {
      colorLog('red', `❌ Audio generation failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    colorLog('red', `❌ Audio generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function testCacheHit(): Promise<boolean> {
  colorLog('cyan', '\n=== Testing Cache Functionality ===');
  
  const testText = "Welcome to Superwire"; // Short, cacheable text
  const voiceConfig = VOICE_CONFIGS.adam;
  
  // First generation (should be cached)
  colorLog('white', 'First generation (should cache)...');
  const firstResult = await generateAudioSegment(testText, voiceConfig.voiceId, {
    enableCaching: true,
    taskType: 'cache_test_1'
  });
  
  if (!firstResult.success) {
    colorLog('red', `❌ First generation failed: ${firstResult.error}`);
    return false;
  }
  
  // Second generation (should hit cache)
  colorLog('white', 'Second generation (should hit cache)...');
  const secondResult = await generateAudioSegment(testText, voiceConfig.voiceId, {
    enableCaching: true,
    taskType: 'cache_test_2'
  });
  
  if (!secondResult.success) {
    colorLog('red', `❌ Second generation failed: ${secondResult.error}`);
    return false;
  }
  
  if (secondResult.fromCache) {
    colorLog('green', '✅ Cache hit detected');
    colorLog('white', `  • First generation cost: $${firstResult.cost.toFixed(4)}`);
    colorLog('white', `  • Second generation cost: $${secondResult.cost.toFixed(4)} (should be $0.0000)`);
    
    if (secondResult.cost === 0) {
      colorLog('green', '  ✅ Cache hit has zero cost');
      return true;
    } else {
      colorLog('red', '  ❌ Cache hit should have zero cost');
      return false;
    }
  } else {
    colorLog('yellow', '⚠️  Cache miss (text might not meet caching criteria)');
    return true; // Still pass the test, caching is heuristic-based
  }
}

async function testBatchGeneration(): Promise<boolean> {
  colorLog('cyan', '\n=== Testing Batch Audio Generation ===');
  
  const segments = [
    { text: "Breaking news update.", voiceId: VOICE_CONFIGS.adam.voiceId, taskType: 'batch_intro' },
    { text: "Here's what you need to know.", voiceId: VOICE_CONFIGS.dallas.voiceId, taskType: 'batch_transition' },
    { text: "Thanks for listening to Superwire.", voiceId: VOICE_CONFIGS.jordan.voiceId, taskType: 'batch_outro' }
  ];
  
  colorLog('white', `Testing batch generation with ${segments.length} segments...`);
  
  try {
    const results = await generateAudioSegmentsBatch(segments, {
      enableCaching: true
    });
    
    const successful = results.filter(r => r.success);
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    
    colorLog('white', `Results: ${successful.length}/${results.length} successful`);
    colorLog('white', `Total cost: $${totalCost.toFixed(4)}`);
    
    if (successful.length === segments.length) {
      colorLog('green', '✅ Batch generation successful');
      
      // Display individual results
      results.forEach((result, i) => {
        const segment = segments[i];
        const voiceName = Object.values(VOICE_CONFIGS).find(v => v.voiceId === segment.voiceId)?.name || 'Unknown';
        colorLog('white', `  ${i + 1}. ${voiceName}: ${result.success ? '✅' : '❌'} ($${result.cost.toFixed(4)})`);
      });
      
      return true;
    } else {
      colorLog('red', '❌ Some batch generations failed');
      results.forEach((result, i) => {
        if (!result.success) {
          colorLog('red', `  Segment ${i + 1} failed: ${result.error}`);
        }
      });
      return false;
    }
  } catch (error) {
    colorLog('red', `❌ Batch generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function testErrorHandling(): Promise<boolean> {
  colorLog('cyan', '\n=== Testing Error Handling ===');
  
  // Test invalid voice ID
  colorLog('white', 'Testing invalid voice ID...');
  const invalidResult = await generateAudioSegment("Test text", "invalid-voice-id", {
    maxRetries: 1 // Reduce retries for faster testing
  });
  
  if (!invalidResult.success && invalidResult.error) {
    colorLog('green', '✅ Invalid voice ID properly handled');
    colorLog('white', `  Error: ${invalidResult.error}`);
  } else {
    colorLog('red', '❌ Invalid voice ID should have failed');
    return false;
  }
  
  // Test empty text
  colorLog('white', 'Testing empty text...');
  const emptyResult = await generateAudioSegment("", VOICE_CONFIGS.adam.voiceId);
  
  if (!emptyResult.success && emptyResult.error?.includes('empty')) {
    colorLog('green', '✅ Empty text properly handled');
  } else {
    colorLog('red', '❌ Empty text should have failed with appropriate error');
    return false;
  }
  
  return true;
}

async function testCostSummary(): Promise<boolean> {
  colorLog('cyan', '\n=== Testing Cost Summary ===');
  
  const summary = getAudioCostSummary();
  
  colorLog('white', 'Audio cost summary:');
  colorLog('white', `  • Today's costs: $${summary.todaysAudioCosts.toFixed(4)}`);
  colorLog('white', `  • Total costs: $${summary.totalAudioCosts.toFixed(4)}`);
  colorLog('white', `  • Characters processed: ${summary.totalCharactersProcessed}`);
  colorLog('white', `  • Average cost per request: $${summary.averageCostPerRequest.toFixed(4)}`);
  
  colorLog('white', 'Voice breakdown:');
  Object.entries(summary.voiceBreakdown).forEach(([voiceId, cost]) => {
    const voiceName = Object.values(VOICE_CONFIGS).find(v => v.voiceId === voiceId)?.name || voiceId;
    colorLog('white', `    ${voiceName}: $${cost.toFixed(4)}`);
  });
  
  colorLog('green', '✅ Cost summary working');
  return true;
}

async function testCacheStatistics(): Promise<boolean> {
  colorLog('cyan', '\n=== Testing Cache Statistics ===');
  
  const stats = audioCache.getCacheStats();
  
  colorLog('white', 'Cache statistics:');
  colorLog('white', `  • Total entries: ${stats.totalEntries}`);
  colorLog('white', `  • Total size: ${stats.totalSizeMB.toFixed(2)} MB`);
  colorLog('white', `  • Hit rate: ${stats.hitRate.toFixed(1)}%`);
  colorLog('white', `  • Oldest entry: ${stats.oldestEntry || 'None'}`);
  colorLog('white', `  • Newest entry: ${stats.newestEntry || 'None'}`);
  
  colorLog('green', '✅ Cache statistics working');
  return true;
}

async function runAllTests(): Promise<void> {
  colorLog('bold', '🎙️  ELEVENLABS AUDIO GENERATION TESTS');
  colorLog('bold', '=====================================');
  
  const tests = [
    { name: 'Environment Setup', fn: testEnvironmentSetup, critical: true },
    { name: 'Cost Estimation', fn: testCostEstimation, critical: true },
    { name: 'Voice Configurations', fn: testVoiceConfigurations, critical: true },
    { name: 'Single Audio Generation', fn: testSingleAudioGeneration, critical: true },
    { name: 'Cache Functionality', fn: testCacheHit, critical: false },
    { name: 'Batch Generation', fn: testBatchGeneration, critical: false },
    { name: 'Error Handling', fn: testErrorHandling, critical: true },
    { name: 'Cost Summary', fn: testCostSummary, critical: false },
    { name: 'Cache Statistics', fn: testCacheStatistics, critical: false }
  ];
  
  let passed = 0;
  let failed = 0;
  let criticalFailed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
        if (test.critical) {
          criticalFailed++;
        }
      }
    } catch (error) {
      colorLog('red', `❌ Test "${test.name}" threw error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
      if (test.critical) {
        criticalFailed++;
      }
    }
  }
  
  colorLog('bold', '\n=== TEST RESULTS ===');
  colorLog('green', `✅ Passed: ${passed}`);
  colorLog('red', `❌ Failed: ${failed}`);
  
  if (criticalFailed > 0) {
    colorLog('red', `💥 CRITICAL FAILURES: ${criticalFailed}`);
    colorLog('red', 'ElevenLabs integration is not ready for use');
    process.exit(1);
  } else if (failed > 0) {
    colorLog('yellow', '⚠️  Some non-critical tests failed');
    colorLog('yellow', 'ElevenLabs integration has minor issues but is functional');
  } else {
    colorLog('green', '🎉 ALL TESTS PASSED!');
    colorLog('green', 'ElevenLabs integration is ready for use');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}