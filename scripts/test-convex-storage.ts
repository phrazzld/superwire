#!/usr/bin/env npx tsx

/**
 * Test script for Convex file storage operations
 * 
 * Tests the uploadToStorage function and related utilities
 * This script requires Convex to be properly configured with NEXT_PUBLIC_CONVEX_URL
 */

import fs from 'fs';
import path from 'path';
import { 
  uploadToStorage, 
  uploadMultipleFiles, 
  getFileUrl, 
  deleteFile, 
  validateFileForUpload,
  getUploadStats 
} from '../src/lib/convex-storage';

// Test configuration
const TEST_CONFIG = {
  testFilesDir: path.join(process.cwd(), 'tmp', 'test-files'),
  testFiles: {
    small: 'test-small.txt',
    medium: 'test-medium.mp3', 
    large: 'test-large.wav',
  }
};

/**
 * Create test files for upload testing
 */
function createTestFiles(): void {
  console.log('📁 Creating test files...');
  
  // Ensure test directory exists
  if (!fs.existsSync(TEST_CONFIG.testFilesDir)) {
    fs.mkdirSync(TEST_CONFIG.testFilesDir, { recursive: true });
  }

  // Small text file (1KB)
  const smallContent = 'Test file content for Convex storage upload validation.\n'.repeat(30);
  fs.writeFileSync(
    path.join(TEST_CONFIG.testFilesDir, TEST_CONFIG.testFiles.small), 
    smallContent
  );

  // Medium audio file mock (100KB)
  const mediumContent = Buffer.alloc(100 * 1024, 0);
  fs.writeFileSync(
    path.join(TEST_CONFIG.testFilesDir, TEST_CONFIG.testFiles.medium), 
    mediumContent
  );

  // Large audio file mock (1MB)  
  const largeContent = Buffer.alloc(1024 * 1024, 0);
  fs.writeFileSync(
    path.join(TEST_CONFIG.testFilesDir, TEST_CONFIG.testFiles.large), 
    largeContent
  );

  console.log('✅ Test files created successfully');
}

/**
 * Clean up test files
 */
function cleanupTestFiles(): void {
  console.log('🧹 Cleaning up test files...');
  
  if (fs.existsSync(TEST_CONFIG.testFilesDir)) {
    fs.rmSync(TEST_CONFIG.testFilesDir, { recursive: true, force: true });
    console.log('✅ Test files cleaned up');
  }
}

/**
 * Test file validation function
 */
async function testFileValidation(): Promise<boolean> {
  console.log('\n🔍 Testing file validation...');
  
  try {
    const testFile = path.join(TEST_CONFIG.testFilesDir, TEST_CONFIG.testFiles.small);
    
    // Test valid file
    const validResult = validateFileForUpload(testFile, 50);
    console.log(`✓ Valid file check: ${validResult.valid ? 'PASS' : 'FAIL'}`);
    
    // Test non-existent file
    const invalidResult = validateFileForUpload('/non/existent/file.txt', 50);
    console.log(`✓ Invalid file check: ${!invalidResult.valid ? 'PASS' : 'FAIL'}`);
    
    // Test file too large (set very small limit)
    const largeFileResult = validateFileForUpload(testFile, 0.001); // 0.001MB limit
    console.log(`✓ File size check: ${!largeFileResult.valid ? 'PASS' : 'FAIL'}`);
    
    return true;
  } catch (error) {
    console.error('❌ File validation test failed:', error);
    return false;
  }
}

/**
 * Test single file upload
 */
async function testSingleUpload(): Promise<{ success: boolean; storageId?: string }> {
  console.log('\n📤 Testing single file upload...');
  
  try {
    const testFile = path.join(TEST_CONFIG.testFilesDir, TEST_CONFIG.testFiles.small);
    
    const result = await uploadToStorage(testFile, {
      fileName: 'convex-test-upload.txt',
      contentType: 'text/plain',
      metadata: { test: true, timestamp: Date.now() }
    });
    
    console.log(`Upload result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    if (result.success) {
      console.log(`✓ Storage ID: ${result.storageId}`);
      console.log(`✓ File URL: ${result.fileUrl}`);
      console.log(`✓ File size: ${result.fileSize} bytes`);
      return { success: true, storageId: result.storageId };
    } else {
      console.log(`❌ Error: ${result.error}`);
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Single upload test failed:', error);
    return { success: false };
  }
}

/**
 * Test batch file upload
 */
async function testBatchUpload(): Promise<boolean> {
  console.log('\n📦 Testing batch file upload...');
  
  try {
    const testFiles = [
      path.join(TEST_CONFIG.testFilesDir, TEST_CONFIG.testFiles.small),
      path.join(TEST_CONFIG.testFilesDir, TEST_CONFIG.testFiles.medium),
    ];
    
    const results = await uploadMultipleFiles(testFiles, {
      contentType: 'application/octet-stream'
    }, 2);
    
    const stats = getUploadStats(results);
    
    console.log(`✓ Batch upload completed:`);
    console.log(`  - Successful: ${stats.successful}`);
    console.log(`  - Failed: ${stats.failed}`);
    console.log(`  - Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`  - Average size: ${stats.avgSizeMB.toFixed(3)} MB`);
    
    return stats.successful > 0;
  } catch (error) {
    console.error('❌ Batch upload test failed:', error);
    return false;
  }
}

/**
 * Test file URL retrieval
 */
async function testGetFileUrl(storageId: string): Promise<boolean> {
  console.log('\n🔗 Testing file URL retrieval...');
  
  try {
    const fileUrl = await getFileUrl(storageId);
    
    if (fileUrl) {
      console.log(`✓ File URL retrieved: ${fileUrl}`);
      return true;
    } else {
      console.log('❌ Failed to retrieve file URL');
      return false;
    }
  } catch (error) {
    console.error('❌ Get file URL test failed:', error);
    return false;
  }
}

/**
 * Test file deletion
 */
async function testDeleteFile(storageId: string): Promise<boolean> {
  console.log('\n🗑️ Testing file deletion...');
  
  try {
    const success = await deleteFile(storageId);
    
    if (success) {
      console.log('✅ File deleted successfully');
      return true;
    } else {
      console.log('❌ File deletion failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Delete file test failed:', error);
    return false;
  }
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log('🧪 Convex File Storage Test Suite');
  console.log('==================================\n');
  
  // Check environment
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    console.log('⚠️ NEXT_PUBLIC_CONVEX_URL not configured');
    console.log('Please set up Convex first by running: npx convex dev');
    console.log('Then add the URL to your .env.local file');
    process.exit(1);
  }
  
  console.log(`📡 Convex URL: ${process.env.NEXT_PUBLIC_CONVEX_URL}`);
  
  const testResults = {
    validation: false,
    singleUpload: false,
    batchUpload: false,
    getUrl: false,
    deleteFile: false,
  };
  
  let storageIdForTesting: string | undefined;
  
  try {
    // Setup
    createTestFiles();
    
    // Run tests
    testResults.validation = await testFileValidation();
    
    const uploadResult = await testSingleUpload();
    testResults.singleUpload = uploadResult.success;
    storageIdForTesting = uploadResult.storageId;
    
    testResults.batchUpload = await testBatchUpload();
    
    if (storageIdForTesting) {
      testResults.getUrl = await testGetFileUrl(storageIdForTesting);
      testResults.deleteFile = await testDeleteFile(storageIdForTesting);
    }
    
    // Results summary
    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    console.log(`✅ File validation: ${testResults.validation ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Single upload: ${testResults.singleUpload ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Batch upload: ${testResults.batchUpload ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Get file URL: ${testResults.getUrl ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Delete file: ${testResults.deleteFile ? 'PASS' : 'FAIL'}`);
    
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(Boolean).length;
    
    console.log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Convex storage is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Check the output above for details.');
    }
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  } finally {
    // Cleanup
    cleanupTestFiles();
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}