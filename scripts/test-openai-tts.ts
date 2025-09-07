#!/usr/bin/env npx tsx

/**
 * Test script for OpenAI Text-to-Speech module
 * Generates sample audio for each voice and verifies functionality
 */

import fs from 'fs';
import path from 'path';
import {
  generateSpeech,
  generateAudioForHost,
  estimateTTSCost,
  shouldUseTTS,
  getTTSCostSummary,
  VOICE_DESCRIPTIONS,
  HOST_TO_VOICE_MAP,
  type VoiceType
} from '../src/lib/openai-tts';

// Test samples for each voice (15-30 words each)
const TEST_SAMPLES: Record<VoiceType, string> = {
  alloy: "This is the Alloy voice, designed to be neutral and balanced. It works well for general narration and informational content.",
  echo: "Echo brings energy and dynamism to your content! Perfect for exciting announcements and engaging storytelling that captures attention.",
  fable: "Greetings from Fable, offering a distinguished British accent. Ideal for sophisticated narratives and educational material with a touch of elegance.",
  onyx: "Onyx delivers with deep, authoritative tones. This voice commands respect and is perfect for serious news and documentary narration.",
  nova: "Nova speaks with warmth and empathy, creating connections with listeners. Excellent for human interest stories and supportive content.",
  shimmer: "Shimmer's soft and gentle tones create a calming atmosphere. Perfect for meditation, relaxation content, and bedtime stories."
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function testOpenAITTS() {
  console.log(`\n${colors.bright}${colors.blue}🎙️  OpenAI Text-to-Speech Test Suite${colors.reset}\n`);

  // Check if TTS should be used
  console.log(`${colors.cyan}📋 Pre-flight checks:${colors.reset}`);
  const canUseTTS = shouldUseTTS();
  console.log(`  • TTS available: ${canUseTTS ? colors.green + '✓' : colors.red + '✗'} ${colors.reset}`);
  
  if (!canUseTTS) {
    console.log(`\n${colors.red}❌ TTS is not available. Please check:${colors.reset}`);
    console.log(`  1. OPENAI_API_KEY is set in environment`);
    console.log(`  2. Daily TTS budget ($0.50) has not been exceeded`);
    return;
  }

  // Create output directory
  const outputDir = path.join(process.cwd(), 'tmp', 'tts_test');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`  • Created output directory: ${outputDir}`);
  } else {
    console.log(`  • Using output directory: ${outputDir}`);
  }

  console.log(`\n${colors.cyan}🎵 Testing Individual Voices:${colors.reset}\n`);

  // Test each voice
  const results: Array<{ voice: VoiceType; success: boolean; file?: string; error?: string }> = [];
  let totalCost = 0;
  let totalCharacters = 0;

  for (const [voice, text] of Object.entries(TEST_SAMPLES) as Array<[VoiceType, string]>) {
    console.log(`${colors.bright}Testing ${voice}:${colors.reset} "${text.substring(0, 40)}..."`);
    
    // Estimate cost
    const estimatedCost = estimateTTSCost(text, 'tts-1');
    console.log(`  • Estimated cost: $${estimatedCost.toFixed(6)} (${text.length} characters)`);
    
    // Generate speech
    const result = await generateSpeech(text, voice, 'tts-1', 1.0);
    
    if (result.success && result.audioBuffer) {
      // Save audio file
      const filename = `${voice}_sample.mp3`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, result.audioBuffer);
      
      // Verify file was created and has content
      const stats = fs.statSync(filepath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`  ${colors.green}✓${colors.reset} Generated successfully`);
      console.log(`  • File: ${filename} (${fileSizeKB} KB)`);
      console.log(`  • Cost: $${result.cost?.toFixed(6)}`);
      if (result.retryCount && result.retryCount > 0) {
        console.log(`  • Retries needed: ${result.retryCount}`);
      }
      
      results.push({ voice, success: true, file: filepath });
      totalCost += result.cost || 0;
      totalCharacters += result.characterCount || 0;
    } else {
      console.log(`  ${colors.red}✗ Failed:${colors.reset} ${result.error}`);
      results.push({ voice, success: false, error: result.error });
    }
    
    console.log('');
  }

  // Test host-specific generation
  console.log(`${colors.cyan}🎭 Testing Host-Specific Generation:${colors.reset}\n`);

  for (const [hostName, expectedVoice] of Object.entries(HOST_TO_VOICE_MAP)) {
    const text = `Hello, this is ${hostName} speaking. Welcome to today's episode of Superwire, your AI-powered news podcast.`;
    console.log(`${colors.bright}Testing ${hostName}:${colors.reset} (expects ${expectedVoice} voice)`);
    
    const result = await generateAudioForHost(text, hostName, 'standard');
    
    if (result.success && result.audioBuffer) {
      const filename = `host_${hostName.toLowerCase()}_sample.mp3`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, result.audioBuffer);
      
      const stats = fs.statSync(filepath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`  ${colors.green}✓${colors.reset} Generated successfully`);
      console.log(`  • File: ${filename} (${fileSizeKB} KB)`);
      console.log(`  • Voice used: ${result.voice}`);
      console.log(`  • Cost: $${result.cost?.toFixed(6)}`);
      
      totalCost += result.cost || 0;
      totalCharacters += result.characterCount || 0;
    } else {
      console.log(`  ${colors.red}✗ Failed:${colors.reset} ${result.error}`);
    }
    
    console.log('');
  }

  // Test HD quality
  console.log(`${colors.cyan}🎧 Testing HD Quality:${colors.reset}\n`);
  
  const hdText = "This audio is generated using the HD model for higher quality output.";
  const hdResult = await generateSpeech(hdText, 'nova', 'tts-1-hd', 1.0);
  
  if (hdResult.success && hdResult.audioBuffer) {
    const filename = 'hd_quality_sample.mp3';
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, hdResult.audioBuffer);
    
    const stats = fs.statSync(filepath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(`  ${colors.green}✓${colors.reset} HD audio generated`);
    console.log(`  • File: ${filename} (${fileSizeKB} KB)`);
    console.log(`  • Cost: $${hdResult.cost?.toFixed(6)} (2x standard rate)`);
    
    totalCost += hdResult.cost || 0;
    totalCharacters += hdResult.characterCount || 0;
  } else {
    console.log(`  ${colors.red}✗ HD generation failed:${colors.reset} ${hdResult.error}`);
  }

  // Summary
  console.log(`\n${colors.bright}${colors.green}📊 Test Summary:${colors.reset}\n`);
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`  • Voices tested: ${results.length}`);
  console.log(`  • Successful: ${colors.green}${successCount}${colors.reset}`);
  if (failCount > 0) {
    console.log(`  • Failed: ${colors.red}${failCount}${colors.reset}`);
  }
  console.log(`  • Total characters: ${totalCharacters}`);
  console.log(`  • Total cost: $${totalCost.toFixed(6)}`);
  console.log(`  • Output directory: ${outputDir}`);

  // Check cost tracking
  const costSummary = await getTTSCostSummary();
  if (costSummary) {
    console.log(`\n${colors.cyan}💰 Cost Tracking:${colors.reset}`);
    console.log(`  • Grand total: $${costSummary.grandTotal.toFixed(6)}`);
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = costSummary.dailyTotals[today] || 0;
    console.log(`  • Today's total: $${todayTotal.toFixed(6)}`);
  }

  // List generated files
  console.log(`\n${colors.cyan}📁 Generated Files:${colors.reset}\n`);
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.mp3'));
  files.forEach(file => {
    const filepath = path.join(outputDir, file);
    const stats = fs.statSync(filepath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    console.log(`  • ${file} (${fileSizeKB} KB)`);
  });

  console.log(`\n${colors.bright}${colors.green}✅ Test completed successfully!${colors.reset}`);
  console.log(`\nYou can play the generated audio files using:`);
  console.log(`  ${colors.yellow}afplay ${outputDir}/*.mp3${colors.reset}  (on macOS)`);
  console.log(`  ${colors.yellow}mpg123 ${outputDir}/*.mp3${colors.reset}  (on Linux)\n`);
}

// Run tests
testOpenAITTS().catch(error => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});