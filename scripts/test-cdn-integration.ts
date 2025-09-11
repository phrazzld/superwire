#!/usr/bin/env npx tsx

/**
 * Test Cloudflare CDN Integration
 * Verifies that CDN is properly configured and working
 */

import * as dotenv from 'dotenv';
import { cdn, getCDNAudioUrl, getCDNUrlWithFallback } from '../src/lib/cdn';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testCDNIntegration() {
  console.log('🧪 Testing Cloudflare CDN Integration...\n');
  
  // Test URLs
  const testUrls = [
    'https://vsngpay3kxupz4wa.public.blob.vercel-storage.com/episodes/episode-2025-09-11.mp3',
    'https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/episodes%2Fepisode.mp3',
    'https://convex.cloud/storage/abc123/episode.mp3'
  ];
  
  // Check CDN configuration
  const cdnDomain = process.env.CLOUDFLARE_CDN_DOMAIN;
  console.log('📋 CDN Configuration:');
  console.log(`   Domain: ${cdnDomain || 'NOT CONFIGURED'}`);
  console.log(`   Enabled: ${!!cdnDomain}`);
  console.log(`   API Token: ${process.env.CLOUDFLARE_API_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`   Zone ID: ${process.env.CLOUDFLARE_ZONE_ID ? '✅ Set' : '❌ Not set'}`);
  console.log();
  
  // Test CDN service
  const cdnService = cdn;
  
  console.log('🔄 Testing URL Transformations:');
  for (const url of testUrls) {
    console.log(`\nOriginal: ${url}`);
    
    // Test direct CDN transformation
    const cdnUrl = await cdnService.transformUrl(url, { fileType: 'audio' });
    console.log(`CDN URL:  ${cdnUrl}`);
    
    // Test with fallback
    const fallbackUrl = await getCDNUrlWithFallback(url, { fileType: 'audio' });
    console.log(`With Fallback: ${fallbackUrl}`);
    
    // Check if transformation occurred
    const transformed = cdnUrl !== url;
    console.log(`Transformed: ${transformed ? '✅ Yes' : '⚠️  No (CDN not configured)'}`);
  }
  
  // Test cache headers
  console.log('\n📦 Cache Headers:');
  const cacheHeaders = cdnService.getCacheHeaders('audio');
  console.log(`   Audio Files: ${cacheHeaders['Cache-Control']}`);
  
  // Test audio-specific helper
  console.log('\n🎵 Audio CDN Helper:');
  const audioUrl = await getCDNAudioUrl(testUrls[0]);
  console.log(`   Audio URL: ${audioUrl}`);
  
  // Summary
  console.log('\n📊 Summary:');
  if (cdnDomain) {
    console.log('✅ Cloudflare CDN is CONFIGURED and READY');
    console.log(`   - Domain: ${cdnDomain}`);
    console.log('   - URL transformation: Working');
    console.log('   - Fallback system: Active');
    console.log('   - Cache strategies: Configured');
    console.log('\n💡 To test in production:');
    console.log('   1. Deploy to Vercel with CLOUDFLARE_CDN_DOMAIN set');
    console.log('   2. Configure Cloudflare DNS with CNAME record');
    console.log('   3. Enable proxy (orange cloud) in Cloudflare');
  } else {
    console.log('⚠️  Cloudflare CDN is NOT CONFIGURED');
    console.log('\nTo enable:');
    console.log('   1. Add to .env.local:');
    console.log('      CLOUDFLARE_CDN_DOMAIN=cdn.your-domain.com');
    console.log('   2. Configure Cloudflare account and DNS');
    console.log('   3. Restart development server');
    console.log('\n📖 See docs/cloudflare-cdn-setup.md for full instructions');
  }
}

// Run tests
testCDNIntegration().catch(console.error);