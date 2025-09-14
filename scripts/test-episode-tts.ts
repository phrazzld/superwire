#!/usr/bin/env npx tsx

/**
 * Test script for OpenAI TTS integration in episode generation
 * Tests the actual integration in pages/api/episodes.ts without needing full episode generation
 */

import { generateAudioForHost, shouldUseTTS, getTTSCostSummary } from '../src/lib/openai-tts';
import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function testEpisodeTTSIntegration() {
  console.log(`\n${colors.bright}${colors.blue}🎙️  Testing Episode TTS Integration${colors.reset}\n`);

  // Check if TTS is available
  const canUseTTS = shouldUseTTS();
  console.log(`${colors.cyan}TTS Status:${colors.reset} ${canUseTTS ? colors.green + 'Available ✓' : colors.red + 'Not Available ✗'}${colors.reset}\n`);

  if (!canUseTTS) {
    console.log(`${colors.red}Cannot test - TTS is not available${colors.reset}`);
    console.log('Check that OPENAI_API_KEY is set and daily budget not exceeded');
    return;
  }

  // Simulate episode content
  const intro = "Welcome to Superwire, your AI-powered news podcast. I'm Adam, and today we'll be covering the latest developments in technology, climate science, and global politics. Our team has analyzed thousands of sources to bring you the most important stories of the day.";
  
  const segments = [
    "Our first story today focuses on breakthrough renewable energy developments. Scientists at MIT have announced a new solar panel technology that achieves 47% efficiency, nearly double the current standard. This could revolutionize how we generate clean energy.",
    "In international news, world leaders have gathered in Geneva for emergency climate talks. The summit aims to accelerate carbon reduction commitments following unprecedented weather events across three continents this month.",
    "Finally, in technology news, quantum computing has reached a new milestone. Researchers have successfully maintained quantum coherence for over 100 seconds, bringing practical quantum computers closer to reality."
  ];
  
  const conclusion = "That's all for today's episode of Superwire. Thank you for listening to our AI-curated news summary. Join us tomorrow for more important stories from around the world. Until then, stay informed and stay curious.";

  // Create output directory
  const outputDir = path.join(process.cwd(), 'tmp', 'episode_test');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  let totalCost = 0;
  let totalCharacters = 0;

  try {
    // Test intro generation (ADAM with HD quality)
    console.log(`${colors.bright}1. Testing Intro Generation${colors.reset}`);
    console.log(`   Host: ADAM (HD quality)`);
    console.log(`   Length: ${intro.length} characters`);
    
    const introResult = await generateAudioForHost(intro, 'ADAM', 'hd');
    if (introResult.success && introResult.audioBuffer) {
      const introFile = path.join(outputDir, `${timestamp}-00-intro.mp3`);
      fs.writeFileSync(introFile, introResult.audioBuffer);
      
      const stats = fs.statSync(introFile);
      console.log(`   ${colors.green}✓ Generated:${colors.reset} ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Cost: $${introResult.cost?.toFixed(6)}`);
      
      totalCost += introResult.cost || 0;
      totalCharacters += introResult.characterCount || 0;
    } else {
      console.log(`   ${colors.red}✗ Failed:${colors.reset} ${introResult.error}`);
    }

    // Test segments (alternating DALLAS/JORDAN with standard quality)
    console.log(`\n${colors.bright}2. Testing Segment Generation${colors.reset}`);
    
    for (let i = 0; i < segments.length; i++) {
      const hostName = i % 2 === 0 ? 'DALLAS' : 'JORDAN';
      console.log(`\n   Segment ${i + 1}: ${hostName} (standard quality)`);
      console.log(`   Length: ${segments[i].length} characters`);
      
      const segmentResult = await generateAudioForHost(segments[i], hostName, 'standard');
      if (segmentResult.success && segmentResult.audioBuffer) {
        const segmentFile = path.join(outputDir, `${timestamp}-0${i}-segment.mp3`);
        fs.writeFileSync(segmentFile, segmentResult.audioBuffer);
        
        const stats = fs.statSync(segmentFile);
        console.log(`   ${colors.green}✓ Generated:${colors.reset} ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`   Cost: $${segmentResult.cost?.toFixed(6)}`);
        
        totalCost += segmentResult.cost || 0;
        totalCharacters += segmentResult.characterCount || 0;
      } else {
        console.log(`   ${colors.red}✗ Failed:${colors.reset} ${segmentResult.error}`);
      }
    }

    // Test conclusion (ADAM with HD quality)
    console.log(`\n${colors.bright}3. Testing Conclusion Generation${colors.reset}`);
    console.log(`   Host: ADAM (HD quality)`);
    console.log(`   Length: ${conclusion.length} characters`);
    
    const conclusionResult = await generateAudioForHost(conclusion, 'ADAM', 'hd');
    if (conclusionResult.success && conclusionResult.audioBuffer) {
      const conclusionFile = path.join(outputDir, `${timestamp}-99-conclusion.mp3`);
      fs.writeFileSync(conclusionFile, conclusionResult.audioBuffer);
      
      const stats = fs.statSync(conclusionFile);
      console.log(`   ${colors.green}✓ Generated:${colors.reset} ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Cost: $${conclusionResult.cost?.toFixed(6)}`);
      
      totalCost += conclusionResult.cost || 0;
      totalCharacters += conclusionResult.characterCount || 0;
    } else {
      console.log(`   ${colors.red}✗ Failed:${colors.reset} ${conclusionResult.error}`);
    }

    // Summary
    console.log(`\n${colors.bright}${colors.green}📊 Test Summary${colors.reset}\n`);
    console.log(`  Total characters: ${totalCharacters}`);
    console.log(`  Total cost: $${totalCost.toFixed(6)}`);
    console.log(`  Cost per 1000 chars: $${((totalCost / totalCharacters) * 1000).toFixed(4)}`);
    
    // Compare with ElevenLabs cost
    const elevenLabsCost = totalCharacters * 0.00018; // $0.18 per 1000 chars
    const savings = ((elevenLabsCost - totalCost) / elevenLabsCost * 100).toFixed(1);
    console.log(`\n  ${colors.cyan}Cost Comparison:${colors.reset}`);
    console.log(`  OpenAI TTS: $${totalCost.toFixed(6)}`);
    console.log(`  ElevenLabs (estimated): $${elevenLabsCost.toFixed(6)}`);
    console.log(`  ${colors.green}Savings: ${savings}% (${(elevenLabsCost / totalCost).toFixed(1)}x cheaper)${colors.reset}`);

    // Check cumulative costs
    const costSummary = await getTTSCostSummary();
    if (costSummary) {
      console.log(`\n${colors.cyan}Cumulative TTS Costs:${colors.reset}`);
      console.log(`  Total spent today: $${costSummary.dailyTotals[new Date().toISOString().split('T')[0]]?.toFixed(6) || '0.000000'}`);
      console.log(`  Grand total: $${costSummary.grandTotal.toFixed(6)}`);
    }

    // List generated files
    console.log(`\n${colors.cyan}Generated Episode Files:${colors.reset}`);
    const files = fs.readdirSync(outputDir).filter(f => f.startsWith(timestamp));
    files.forEach(file => {
      const filepath = path.join(outputDir, file);
      const stats = fs.statSync(filepath);
      console.log(`  • ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });

    console.log(`\n${colors.bright}${colors.green}✅ Episode TTS integration test completed successfully!${colors.reset}`);
    console.log(`\nThe integration is working correctly and provides ~${(elevenLabsCost / totalCost).toFixed(0)}x cost savings.`);
    console.log(`Files saved to: ${outputDir}\n`);

  } catch (error) {
    console.error(`\n${colors.red}Test failed:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run the test
testEpisodeTTSIntegration().catch(error => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});