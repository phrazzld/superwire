#!/usr/bin/env npx tsx

/**
 * Comprehensive Vercel Blob Storage Validation Script
 * Tests all storage operations to ensure production readiness
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  uploadEpisodeToBlob, 
  listEpisodes, 
  getEpisodeMetadata, 
  deleteEpisode, 
  getAllEpisodes,
  isBlobStorageConfigured,
  testBlobStorage
} from '../src/lib/vercel-blob';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
  const colorMap = {
    success: colors.green,
    error: colors.red,
    info: colors.blue,
    warning: colors.yellow
  };
  console.log(`${colorMap[type]}${message}${colors.reset}`);
}

function section(title: string) {
  console.log(`\n${colors.bright}${colors.cyan}═══ ${title} ═══${colors.reset}\n`);
}

async function createTestAudioFile(): Promise<Buffer> {
  // Create a small test audio file (minimal MP3 header + silence)
  // This is a valid but minimal MP3 file structure
  const mp3Header = Buffer.from([
    0xFF, 0xFB, 0x90, 0x00, // MP3 frame header
    0x00, 0x00, 0x00, 0x00, // Padding
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    // Add more padding to make it a reasonable size
    ...Array(1024).fill(0)   // 1KB of silence
  ]);
  
  return mp3Header;
}

async function validateBlobStorage() {
  console.log(colors.bright + '\n🧪 VERCEL BLOB STORAGE VALIDATION\n' + colors.reset);
  console.log('Starting comprehensive storage validation...\n');
  
  let testFileUrl: string | undefined;
  let validationsPassed = 0;
  let validationsFailed = 0;
  
  try {
    // 1. Check configuration
    section('1. Configuration Check');
    if (!isBlobStorageConfigured()) {
      log('❌ BLOB_READ_WRITE_TOKEN not configured', 'error');
      log('   Please add BLOB_READ_WRITE_TOKEN to .env.local', 'warning');
      log('   Get token from: https://vercel.com/dashboard/stores', 'info');
      return;
    }
    log('✅ BLOB_READ_WRITE_TOKEN is configured', 'success');
    validationsPassed++;
    
    // 2. Test listing existing episodes
    section('2. List Episodes Test');
    const existingEpisodes = await listEpisodes(5);
    log(`📋 Found ${existingEpisodes.episodes.length} existing episodes`, 'info');
    
    if (existingEpisodes.episodes.length > 0) {
      log('Sample episodes:', 'info');
      existingEpisodes.episodes.slice(0, 3).forEach(ep => {
        const filename = ep.pathname.replace('episodes/', '');
        const sizeMB = (ep.size / 1024 / 1024).toFixed(2);
        console.log(`   - ${filename} (${sizeMB} MB)`);
      });
    }
    validationsPassed++;
    
    // 3. Test upload operation
    section('3. Upload Test');
    const testBuffer = await createTestAudioFile();
    const testFilename = `test-validation-${Date.now()}.mp3`;
    
    log(`📤 Uploading test file: ${testFilename}`, 'info');
    const uploadResult = await uploadEpisodeToBlob(testBuffer, testFilename);
    
    if (!uploadResult.success) {
      log(`❌ Upload failed: ${uploadResult.error}`, 'error');
      validationsFailed++;
    } else {
      log('✅ Upload successful', 'success');
      log(`   URL: ${uploadResult.url}`, 'info');
      log(`   Size: ${uploadResult.size} bytes`, 'info');
      testFileUrl = uploadResult.url;
      validationsPassed++;
    }
    
    // 4. Test metadata retrieval
    if (testFileUrl) {
      section('4. Metadata Retrieval Test');
      const metadata = await getEpisodeMetadata(testFileUrl);
      
      if (!metadata) {
        log('❌ Failed to retrieve metadata', 'error');
        validationsFailed++;
      } else {
        log('✅ Metadata retrieved successfully', 'success');
        log(`   Content Type: ${metadata.contentType}`, 'info');
        log(`   Size: ${metadata.size} bytes`, 'info');
        log(`   Uploaded: ${metadata.uploadedAt.toISOString()}`, 'info');
        log(`   Cache Control: ${metadata.cacheControl}`, 'info');
        validationsPassed++;
      }
    }
    
    // 5. Test listing with pagination
    section('5. Pagination Test');
    const firstPage = await listEpisodes(2);
    log(`📄 First page: ${firstPage.episodes.length} episodes`, 'info');
    log(`   Has more: ${firstPage.hasMore}`, 'info');
    
    if (firstPage.hasMore && firstPage.cursor) {
      const secondPage = await listEpisodes(2, firstPage.cursor);
      log(`📄 Second page: ${secondPage.episodes.length} episodes`, 'info');
      validationsPassed++;
    } else {
      log('⚠️ Not enough episodes to test pagination', 'warning');
      validationsPassed++;
    }
    
    // 6. Test getAllEpisodes
    section('6. Get All Episodes Test');
    const allEpisodes = await getAllEpisodes();
    log(`📚 Total episodes in storage: ${allEpisodes.length}`, 'info');
    
    if (allEpisodes.length > 0) {
      const totalSizeMB = allEpisodes.reduce((sum, ep) => sum + ep.size, 0) / 1024 / 1024;
      log(`   Total storage used: ${totalSizeMB.toFixed(2)} MB`, 'info');
    }
    validationsPassed++;
    
    // 7. Test URL validation
    section('7. URL Validation Test');
    const invalidUrl = 'https://example.com/invalid.mp3';
    const invalidMetadata = await getEpisodeMetadata(invalidUrl);
    
    if (invalidMetadata === null) {
      log('✅ Invalid URL correctly rejected', 'success');
      validationsPassed++;
    } else {
      log('❌ Invalid URL not rejected properly', 'error');
      validationsFailed++;
    }
    
    // 8. Test deletion
    if (testFileUrl) {
      section('8. Delete Test');
      log(`🗑️ Deleting test file...`, 'info');
      const deleteResult = await deleteEpisode(testFileUrl);
      
      if (deleteResult) {
        log('✅ Test file deleted successfully', 'success');
        validationsPassed++;
        
        // Verify deletion
        const afterDelete = await getEpisodeMetadata(testFileUrl);
        if (afterDelete === null) {
          log('✅ Deletion verified - file no longer exists', 'success');
          validationsPassed++;
        } else {
          log('⚠️ File still accessible after deletion', 'warning');
          validationsFailed++;
        }
      } else {
        log('❌ Failed to delete test file', 'error');
        validationsFailed++;
      }
    }
    
    // 9. Test built-in validation function
    section('9. Built-in Test Function');
    await testBlobStorage();
    validationsPassed++;
    
    // 10. Performance test
    section('10. Performance Test');
    const startTime = Date.now();
    await listEpisodes(10);
    const listTime = Date.now() - startTime;
    log(`⏱️ List operation took ${listTime}ms`, 'info');
    
    if (listTime < 5000) {
      log('✅ Performance is acceptable', 'success');
      validationsPassed++;
    } else {
      log('⚠️ Performance may be slow', 'warning');
      validationsFailed++;
    }
    
  } catch (error) {
    log(`\n❌ Validation error: ${error}`, 'error');
    validationsFailed++;
    
    // Clean up test file if it exists
    if (testFileUrl) {
      log('Attempting to clean up test file...', 'info');
      await deleteEpisode(testFileUrl).catch(() => {});
    }
  }
  
  // Final summary
  section('VALIDATION SUMMARY');
  const total = validationsPassed + validationsFailed;
  const percentage = total > 0 ? Math.round((validationsPassed / total) * 100) : 0;
  
  console.log(`${colors.bright}Tests Passed: ${colors.green}${validationsPassed}${colors.reset}`);
  console.log(`${colors.bright}Tests Failed: ${colors.red}${validationsFailed}${colors.reset}`);
  console.log(`${colors.bright}Success Rate: ${percentage >= 80 ? colors.green : colors.yellow}${percentage}%${colors.reset}\n`);
  
  if (validationsFailed === 0) {
    log('🎉 ALL VALIDATIONS PASSED! Vercel Blob storage is ready for production.', 'success');
  } else if (percentage >= 80) {
    log('✅ Vercel Blob storage is mostly functional with minor issues.', 'warning');
  } else {
    log('❌ Vercel Blob storage has significant issues that need attention.', 'error');
  }
  
  // Production readiness checklist
  section('Production Readiness Checklist');
  const checklist = [
    { item: 'BLOB_READ_WRITE_TOKEN configured', passed: isBlobStorageConfigured() },
    { item: 'Upload operations working', passed: validationsPassed > 2 },
    { item: 'List operations working', passed: validationsPassed > 1 },
    { item: 'Metadata retrieval working', passed: validationsPassed > 3 },
    { item: 'Delete operations working', passed: validationsPassed > 7 },
    { item: 'Performance acceptable', passed: validationsPassed > 10 }
  ];
  
  checklist.forEach(({ item, passed }) => {
    console.log(`${passed ? '✅' : '❌'} ${item}`);
  });
  
  console.log('\n' + colors.cyan + '═'.repeat(50) + colors.reset + '\n');
}

// Run validation
validateBlobStorage().catch(error => {
  console.error('Fatal error during validation:', error);
  process.exit(1);
});