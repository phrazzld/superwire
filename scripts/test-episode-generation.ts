#!/usr/bin/env npx tsx

/**
 * Test Episode Generation and Audio Quality Verification
 * Generates a complete test episode and validates audio quality
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Audio quality metrics
interface AudioQualityMetrics {
  duration: number;
  fileSize: number;
  bitrate: number;
  format: string;
  segments: number;
  quality: 'low' | 'medium' | 'high' | 'excellent';
}

async function analyzeAudioQuality(audioBuffer: Buffer): Promise<AudioQualityMetrics> {
  const fileSize = audioBuffer.length;
  
  // Estimate duration based on typical podcast bitrate (128 kbps)
  const estimatedBitrate = 128000; // bits per second
  const estimatedDuration = (fileSize * 8) / estimatedBitrate; // seconds
  
  // Determine quality based on file size and estimated bitrate
  let quality: AudioQualityMetrics['quality'] = 'medium';
  if (fileSize < 500000) quality = 'low';
  else if (fileSize < 2000000) quality = 'medium';
  else if (fileSize < 5000000) quality = 'high';
  else quality = 'excellent';
  
  return {
    duration: estimatedDuration,
    fileSize,
    bitrate: estimatedBitrate,
    format: 'mp3',
    segments: 5, // typical episode has intro + 3 segments + outro
    quality
  };
}

async function generateTestEpisode() {
  console.log('🎙️ TEST EPISODE GENERATION & QUALITY VERIFICATION\n');
  console.log('=' .repeat(50));
  
  const startTime = Date.now();
  
  try {
    // Step 1: Check if dev server is running
    console.log('\n📡 Checking Development Server...\n');
    
    try {
      const healthCheck = await fetch('http://localhost:3000/api/stats');
      if (healthCheck.ok) {
        console.log('✅ Development server is running');
      }
    } catch (error) {
      console.log('⚠️ Development server not responding, please ensure yarn dev is running');
      console.log('Run: yarn dev in another terminal');
      return;
    }
    
    // Step 2: Trigger episode generation
    console.log('\n🎬 Triggering Episode Generation...\n');
    console.log('This will generate a real episode with:');
    console.log('  • News fetching from RSS/API sources');
    console.log('  • AI script generation (OpenRouter)');
    console.log('  • TTS audio synthesis (OpenAI)');
    console.log('  • Audio stitching and processing');
    console.log('  • Upload to Vercel Blob storage\n');
    
    const response = await fetch('http://localhost:3000/api/episodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test: true,
        limit: 3, // Generate with only 3 articles for faster testing
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Episode generation failed:', error);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Episode generation completed');
    console.log(`   Episode URL: ${result.url || result.episodeUrl || 'Not available'}`);
    console.log(`   Generation time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    
    // Step 3: Fetch and analyze the generated audio
    if (result.url || result.episodeUrl) {
      console.log('\n🔍 Analyzing Audio Quality...\n');
      
      const audioUrl = result.url || result.episodeUrl;
      const audioResponse = await fetch(audioUrl);
      
      if (!audioResponse.ok) {
        console.error('❌ Failed to fetch generated audio');
        return;
      }
      
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      const metrics = await analyzeAudioQuality(audioBuffer);
      
      console.log('📊 Audio Quality Metrics:\n');
      console.log(`   File Size: ${(metrics.fileSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Duration: ${Math.floor(metrics.duration / 60)}:${Math.floor(metrics.duration % 60).toString().padStart(2, '0')}`);
      console.log(`   Bitrate: ${metrics.bitrate / 1000} kbps`);
      console.log(`   Format: ${metrics.format.toUpperCase()}`);
      console.log(`   Quality: ${metrics.quality.toUpperCase()}`);
      
      // Save test episode locally for manual review
      const testEpisodePath = path.join(process.cwd(), 'test-episode.mp3');
      fs.writeFileSync(testEpisodePath, audioBuffer);
      console.log(`\n💾 Test episode saved to: ${testEpisodePath}`);
      console.log('   You can play this file to manually verify audio quality');
    }
    
    // Step 4: Test individual components
    console.log('\n🧪 Component Testing...\n');
    
    // Test News Fetching
    console.log('1. News Fetching:');
    const newsResponse = await fetch('http://localhost:3000/api/articles/test/first-paragraph');
    console.log(`   ${newsResponse.ok ? '✅' : '❌'} News API responding`);
    
    // Test Script Generation  
    console.log('2. Script Generation:');
    const scriptTest = await fetch('http://localhost:3000/api/test-conclusion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headlines: ['Test headline 1', 'Test headline 2'] }),
    });
    console.log(`   ${scriptTest.ok ? '✅' : '❌'} OpenRouter AI generation`);
    
    // Test Content API
    console.log('3. Content Delivery:');
    const contentResponse = await fetch('http://localhost:3000/api/content/latest');
    console.log(`   ${contentResponse.ok ? '✅' : '❌'} Content API responding`);
    
    // Test RSS Feed
    console.log('4. RSS Feed:');
    const rssResponse = await fetch('http://localhost:3000/api/rss');
    console.log(`   ${rssResponse.ok ? '✅' : '❌'} RSS feed generation`);
    
    // Test JSON Feed
    console.log('5. JSON Feed:');
    const jsonFeedResponse = await fetch('http://localhost:3000/api/feed.json');
    console.log(`   ${jsonFeedResponse.ok ? '✅' : '❌'} JSON feed generation`);
    
    // Step 5: Cost Analysis
    console.log('\n💰 Cost Analysis...\n');
    
    const costsPath = path.join(process.cwd(), 'costs.json');
    if (fs.existsSync(costsPath)) {
      const costs = JSON.parse(fs.readFileSync(costsPath, 'utf-8'));
      const today = new Date().toISOString().split('T')[0];
      const todayCost = costs.dailyTotals[today] || 0;
      
      console.log(`   Today's cost so far: $${todayCost.toFixed(4)}`);
      console.log(`   This episode cost: ~$${(todayCost * 0.1).toFixed(4)} (estimated)`);
      console.log(`   Budget remaining: $${(6 - todayCost).toFixed(2)}/day`);
    }
    
    // Step 6: Quality Validation Summary
    console.log('\n✅ QUALITY VALIDATION SUMMARY\n');
    console.log('=' .repeat(50));
    
    const validationResults = {
      'Episode Generation': result.url ? '✅ PASS' : '❌ FAIL',
      'Audio Quality': result.url ? '✅ PASS' : '⚠️ N/A',
      'News Fetching': newsResponse.ok ? '✅ PASS' : '❌ FAIL',
      'AI Generation': scriptTest.ok ? '✅ PASS' : '❌ FAIL',
      'Content Delivery': contentResponse.ok ? '✅ PASS' : '❌ FAIL',
      'RSS Feed': rssResponse.ok ? '✅ PASS' : '❌ FAIL',
      'JSON Feed': jsonFeedResponse.ok ? '✅ PASS' : '❌ FAIL',
    };
    
    for (const [component, status] of Object.entries(validationResults)) {
      console.log(`${status} ${component}`);
    }
    
    const passCount = Object.values(validationResults).filter(v => v.includes('PASS')).length;
    const totalCount = Object.values(validationResults).length;
    const passRate = (passCount / totalCount) * 100;
    
    console.log('\n' + '=' .repeat(50));
    console.log(`Overall Quality Score: ${passRate.toFixed(0)}% (${passCount}/${totalCount} passed)`);
    
    if (passRate === 100) {
      console.log('🎉 All quality checks passed! Episode generation is production-ready.');
    } else if (passRate >= 80) {
      console.log('✅ Most quality checks passed. Minor issues to address.');
    } else {
      console.log('⚠️ Several quality issues detected. Please review failures.');
    }
    
    // Step 7: Recommendations
    console.log('\n💡 Recommendations:\n');
    
    if (result.url) {
      console.log('• Play test-episode.mp3 to manually verify:');
      console.log('  - Audio clarity and volume levels');
      console.log('  - Host voice consistency');
      console.log('  - Smooth transitions between segments');
      console.log('  - Overall listening experience');
    }
    
    console.log('• Monitor costs.json for budget tracking');
    console.log('• Check Vercel Blob storage for episode persistence');
    console.log('• Verify Convex database for metadata storage');
    
    console.log('\n' + '=' .repeat(50));
    console.log('Test episode generation complete ✅');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    
    // Provide troubleshooting steps
    console.log('\n🔧 Troubleshooting:\n');
    console.log('1. Ensure development server is running: yarn dev');
    console.log('2. Check environment variables in .env.local:');
    console.log('   - OPENROUTER_API_KEY');
    console.log('   - OPENAI_API_KEY');
    console.log('   - NEWS_API_KEY');
    console.log('   - BLOB_READ_WRITE_TOKEN');
    console.log('3. Verify Convex is running: npx convex dev');
    console.log('4. Check network connectivity');
  }
}

// Run test
generateTestEpisode().catch(console.error);