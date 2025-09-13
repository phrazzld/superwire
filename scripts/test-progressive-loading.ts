#!/usr/bin/env npx tsx

/**
 * Test progressive loading functionality for articles
 * 
 * This script verifies:
 * 1. First paragraph API returns quickly
 * 2. Remaining content API works correctly
 * 3. Progressive loading component behavior
 * 4. Cache headers are properly set
 * 5. Loading states and transitions work
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  responseTime?: number;
}

const tests: TestResult[] = [];
const BASE_URL = 'http://localhost:3000';

async function checkDevServer(): Promise<boolean> {
  try {
    const response = await fetch(BASE_URL);
    return response.ok;
  } catch {
    return false;
  }
}

async function testFirstParagraphAPI() {
  console.log(chalk.yellow('\n📋 Test 1: First Paragraph API'));
  
  const articleId = 'article-1';  // Use valid mock article ID
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/articles/${articleId}/first-paragraph`);
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      tests.push({
        name: 'First Paragraph API',
        passed: false,
        details: `HTTP ${response.status}: ${response.statusText}`,
        responseTime
      });
      console.log(chalk.red(`  ✗ API returned ${response.status}`));
      return;
    }
    
    const data = await response.json();
    
    // Check cache headers
    const cacheControl = response.headers.get('cache-control');
    const hasProperCache = cacheControl?.includes('max-age=300');
    
    // Verify response structure
    const hasContent = data.content && data.content.length > 0;
    const hasArticleId = data.articleId === articleId;
    const hasTimestamp = data.timestamp !== undefined;
    
    const passed = hasContent && hasArticleId && responseTime < 500; // Should be fast
    
    tests.push({
      name: 'First Paragraph API',
      passed,
      details: `Response time: ${responseTime}ms | Content: ${hasContent ? '✓' : '✗'} | Cache: ${hasProperCache ? '✓' : '✗'}`,
      responseTime
    });
    
    console.log(`  ${passed ? '✓' : '✗'} Response time: ${responseTime}ms`);
    console.log(`  ${hasContent ? '✓' : '✗'} Content returned (${data.content?.length || 0} chars)`);
    console.log(`  ${hasProperCache ? '✓' : '✗'} Cache headers: ${cacheControl || 'none'}`);
    
  } catch (error) {
    tests.push({
      name: 'First Paragraph API',
      passed: false,
      details: `Error: ${error.message}`
    });
    console.log(chalk.red(`  ✗ Error: ${error.message}`));
  }
}

async function testRemainingContentAPI() {
  console.log(chalk.yellow('\n📋 Test 2: Remaining Content API'));
  
  const articleId = 'article-1';  // Use valid mock article ID
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/articles/${articleId}/remaining-content`);
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      tests.push({
        name: 'Remaining Content API',
        passed: false,
        details: `HTTP ${response.status}: ${response.statusText}`,
        responseTime
      });
      console.log(chalk.red(`  ✗ API returned ${response.status}`));
      return;
    }
    
    const data = await response.json();
    
    // Check cache headers (should be longer than first paragraph)
    const cacheControl = response.headers.get('cache-control');
    const hasProperCache = cacheControl?.includes('max-age=3600');
    
    // Verify response structure
    const hasContent = data.content && data.content.length > 0;
    const hasArticleId = data.articleId === articleId;
    const hasMetadata = data.metadata !== undefined;
    
    // In development, there's a 500ms delay simulation
    const expectedDelay = process.env.NODE_ENV === 'development' ? 500 : 0;
    const passed = hasContent && hasArticleId && responseTime >= expectedDelay;
    
    tests.push({
      name: 'Remaining Content API',
      passed,
      details: `Response time: ${responseTime}ms | Content: ${hasContent ? '✓' : '✗'} | Cache: ${hasProperCache ? '✓' : '✗'}`,
      responseTime
    });
    
    console.log(`  ${passed ? '✓' : '✗'} Response time: ${responseTime}ms (includes dev delay)`);
    console.log(`  ${hasContent ? '✓' : '✗'} Content returned (${data.content?.length || 0} chars)`);
    console.log(`  ${hasProperCache ? '✓' : '✗'} Cache headers: ${cacheControl || 'none'}`);
    console.log(`  ${hasMetadata ? '✓' : '✗'} Metadata included`);
    
  } catch (error) {
    tests.push({
      name: 'Remaining Content API',
      passed: false,
      details: `Error: ${error.message}`
    });
    console.log(chalk.red(`  ✗ Error: ${error.message}`));
  }
}

async function testProgressiveComponent() {
  console.log(chalk.yellow('\n📋 Test 3: Progressive Article Component'));
  
  const componentPath = path.join(process.cwd(), 'app', 'components', 'ProgressiveArticle.tsx');
  const componentExists = fs.existsSync(componentPath);
  
  if (!componentExists) {
    tests.push({
      name: 'Progressive Article Component',
      passed: false,
      details: 'Component file not found'
    });
    console.log(chalk.red('  ✗ ProgressiveArticle.tsx not found'));
    return;
  }
  
  const componentContent = fs.readFileSync(componentPath, 'utf-8');
  
  // Check for key progressive loading features
  const hasIntersectionObserver = componentContent.includes('IntersectionObserver');
  const hasUseEffect = componentContent.includes('useEffect');
  const hasLoadingStates = componentContent.includes('isLoading') || componentContent.includes('loading');
  const hasSkeletonLoader = componentContent.includes('skeleton') || componentContent.includes('Skeleton');
  const hasAutoLoad = componentContent.includes('autoLoad');
  const hasManualTrigger = componentContent.includes('Continue Reading') || componentContent.includes('Load More');
  const hasFadeAnimation = componentContent.includes('fadeIn') || componentContent.includes('transition');
  
  // Check for the custom hook
  const hasProgressiveHook = componentContent.includes('useProgressiveContent');
  
  const featureCount = [
    hasIntersectionObserver,
    hasUseEffect,
    hasLoadingStates,
    hasSkeletonLoader,
    hasAutoLoad,
    hasManualTrigger,
    hasFadeAnimation,
    hasProgressiveHook
  ].filter(Boolean).length;
  
  const passed = featureCount >= 6; // Must have at least 6 of 8 features
  
  tests.push({
    name: 'Progressive Article Component',
    passed,
    details: `${featureCount}/8 features implemented`
  });
  
  console.log(`  ${componentExists ? '✓' : '✗'} Component file exists`);
  console.log(`  ${hasIntersectionObserver ? '✓' : '✗'} Intersection Observer for viewport detection`);
  console.log(`  ${hasLoadingStates ? '✓' : '✗'} Loading state management`);
  console.log(`  ${hasSkeletonLoader ? '✓' : '✗'} Skeleton loader UI`);
  console.log(`  ${hasAutoLoad ? '✓' : '✗'} Auto-load capability`);
  console.log(`  ${hasManualTrigger ? '✓' : '✗'} Manual load trigger`);
  console.log(`  ${hasFadeAnimation ? '✓' : '✗'} Smooth animations`);
  console.log(`  ${hasProgressiveHook ? '✓' : '✗'} Custom progressive hook`);
}

async function testCacheStrategies() {
  console.log(chalk.yellow('\n📋 Test 4: Cache Strategies'));
  
  // Test both APIs to compare cache strategies
  try {
    const firstResponse = await fetch(`${BASE_URL}/api/articles/article-1/first-paragraph`);
    const remainingResponse = await fetch(`${BASE_URL}/api/articles/article-1/remaining-content`);
    
    const firstCache = firstResponse.headers.get('cache-control') || '';
    const remainingCache = remainingResponse.headers.get('cache-control') || '';
    
    // Parse cache times
    const firstMaxAge = firstCache.match(/max-age=(\d+)/)?.[1];
    const remainingMaxAge = remainingCache.match(/max-age=(\d+)/)?.[1];
    
    const firstStale = firstCache.includes('stale-while-revalidate');
    const remainingStale = remainingCache.includes('stale-while-revalidate');
    
    // First paragraph should have shorter cache (300s) than remaining (3600s)
    const correctCacheTimes = 
      parseInt(firstMaxAge || '0') < parseInt(remainingMaxAge || '0');
    
    const hasDifferentStrategies = firstCache !== remainingCache;
    const bothHaveStale = firstStale && remainingStale;
    
    const passed = correctCacheTimes && hasDifferentStrategies && bothHaveStale;
    
    tests.push({
      name: 'Cache Strategies',
      passed,
      details: `First: ${firstMaxAge}s | Remaining: ${remainingMaxAge}s | Different strategies: ${hasDifferentStrategies ? '✓' : '✗'}`
    });
    
    console.log(`  ${correctCacheTimes ? '✓' : '✗'} First paragraph has shorter cache (${firstMaxAge}s vs ${remainingMaxAge}s)`);
    console.log(`  ${hasDifferentStrategies ? '✓' : '✗'} Different cache strategies for each endpoint`);
    console.log(`  ${bothHaveStale ? '✓' : '✗'} Both use stale-while-revalidate`);
    
  } catch (error) {
    tests.push({
      name: 'Cache Strategies',
      passed: false,
      details: `Error: ${error.message}`
    });
    console.log(chalk.red(`  ✗ Error: ${error.message}`));
  }
}

async function testServiceWorkerIntegration() {
  console.log(chalk.yellow('\n📋 Test 5: Service Worker Integration'));
  
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  const swExists = fs.existsSync(swPath);
  
  if (!swExists) {
    tests.push({
      name: 'Service Worker Integration',
      passed: false,
      details: 'Service worker file not found'
    });
    console.log(chalk.red('  ✗ sw.js not found'));
    return;
  }
  
  const swContent = fs.readFileSync(swPath, 'utf-8');
  
  // Check for progressive loading support
  const cachesArticleAPIs = swContent.includes('/api/articles');
  const hasNetworkFirst = swContent.includes('networkFirst');
  const hasStaleWhileRevalidate = swContent.includes('staleWhileRevalidate');
  const hasCacheFirst = swContent.includes('cacheFirst');
  const hasContentCache = swContent.includes('CONTENT_CACHE');
  
  const passed = cachesArticleAPIs && hasNetworkFirst && hasStaleWhileRevalidate;
  
  tests.push({
    name: 'Service Worker Integration',
    passed,
    details: `Article APIs: ${cachesArticleAPIs ? '✓' : '✗'} | Strategies: ${hasNetworkFirst && hasStaleWhileRevalidate ? '✓' : '✗'}`
  });
  
  console.log(`  ${swExists ? '✓' : '✗'} Service worker exists`);
  console.log(`  ${cachesArticleAPIs ? '✓' : '✗'} Caches article APIs`);
  console.log(`  ${hasNetworkFirst ? '✓' : '✗'} Network-first strategy for fresh content`);
  console.log(`  ${hasStaleWhileRevalidate ? '✓' : '✗'} Stale-while-revalidate for performance`);
  console.log(`  ${hasContentCache ? '✓' : '✗'} Dedicated content cache`);
}

async function testPerformanceMetrics() {
  console.log(chalk.yellow('\n📋 Test 6: Performance Metrics'));
  
  if (!await checkDevServer()) {
    tests.push({
      name: 'Performance Metrics',
      passed: false,
      details: 'Dev server not running - skipped'
    });
    console.log(chalk.yellow('  ⚠ Skipped - dev server not running'));
    return;
  }
  
  // Test loading performance
  const metrics = {
    firstParagraph: [] as number[],
    remainingContent: [] as number[]
  };
  
  // Run 3 tests to get average
  console.log('  Running performance tests...');
  
  for (let i = 0; i < 3; i++) {
    // Test first paragraph
    const fp_start = Date.now();
    await fetch(`${BASE_URL}/api/articles/article-${i + 1}/first-paragraph`);
    metrics.firstParagraph.push(Date.now() - fp_start);
    
    // Test remaining content
    const rc_start = Date.now();
    await fetch(`${BASE_URL}/api/articles/article-${i + 1}/remaining-content`);
    metrics.remainingContent.push(Date.now() - rc_start);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Calculate averages
  const avgFirst = Math.round(metrics.firstParagraph.reduce((a, b) => a + b, 0) / 3);
  const avgRemaining = Math.round(metrics.remainingContent.reduce((a, b) => a + b, 0) / 3);
  
  // Performance thresholds
  const firstFastEnough = avgFirst < 200; // Should be very fast
  const remainingAcceptable = avgRemaining < 1000; // Can be slower (includes dev delay)
  const firstIsFaster = avgFirst < avgRemaining; // First should always be faster
  
  const passed = firstFastEnough && remainingAcceptable && firstIsFaster;
  
  tests.push({
    name: 'Performance Metrics',
    passed,
    details: `First: ${avgFirst}ms avg | Remaining: ${avgRemaining}ms avg`,
    responseTime: avgFirst
  });
  
  console.log(`  ${firstFastEnough ? '✓' : '✗'} First paragraph fast enough (${avgFirst}ms avg < 200ms)`);
  console.log(`  ${remainingAcceptable ? '✓' : '✗'} Remaining content acceptable (${avgRemaining}ms avg < 1000ms)`);
  console.log(`  ${firstIsFaster ? '✓' : '✗'} First paragraph faster than remaining`);
}

async function testLoadingStates() {
  console.log(chalk.yellow('\n📋 Test 7: Loading States & UX'));
  
  // Check for skeleton loaders and loading states in components
  const componentsDir = path.join(process.cwd(), 'app', 'components');
  
  let hasSkeletonComponents = false;
  let hasLoadingStates = false;
  let hasErrorStates = false;
  
  // Check ArticleCard for skeleton
  const articleCardPath = path.join(componentsDir, 'ArticleCard.tsx');
  if (fs.existsSync(articleCardPath)) {
    const content = fs.readFileSync(articleCardPath, 'utf-8');
    if (content.includes('ArticleCardSkeleton') || content.includes('skeleton')) {
      hasSkeletonComponents = true;
    }
  }
  
  // Check ProgressiveArticle for states
  const progressivePath = path.join(componentsDir, 'ProgressiveArticle.tsx');
  if (fs.existsSync(progressivePath)) {
    const content = fs.readFileSync(progressivePath, 'utf-8');
    hasLoadingStates = content.includes('isLoading') || content.includes('loading');
    hasErrorStates = content.includes('error') || content.includes('Error');
  }
  
  const passed = hasSkeletonComponents && hasLoadingStates;
  
  tests.push({
    name: 'Loading States & UX',
    passed,
    details: `Skeleton: ${hasSkeletonComponents ? '✓' : '✗'} | Loading: ${hasLoadingStates ? '✓' : '✗'} | Error: ${hasErrorStates ? '✓' : '✗'}`
  });
  
  console.log(`  ${hasSkeletonComponents ? '✓' : '✗'} Skeleton loaders implemented`);
  console.log(`  ${hasLoadingStates ? '✓' : '✗'} Loading states managed`);
  console.log(`  ${hasErrorStates ? '✓' : '✗'} Error states handled`);
}

// Main execution
async function runTests() {
  console.log(chalk.blue('🔍 Progressive Loading Verification Tests\n'));
  console.log('='.repeat(60));
  
  // Check if dev server is running
  const devServerRunning = await checkDevServer();
  
  if (devServerRunning) {
    console.log(chalk.green('✓ Dev server is running\n'));
    
    // Run API tests
    await testFirstParagraphAPI();
    await testRemainingContentAPI();
    await testPerformanceMetrics();
  } else {
    console.log(chalk.yellow('⚠ Dev server not running - skipping API tests'));
    console.log(chalk.gray('  Start with: yarn dev\n'));
  }
  
  // Run static analysis tests (don't need server)
  await testProgressiveComponent();
  await testCacheStrategies();
  await testServiceWorkerIntegration();
  await testLoadingStates();
  
  // Summary
  console.log(chalk.blue('\n📊 Test Summary'));
  console.log('='.repeat(60));
  
  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  const total = tests.length;
  
  tests.forEach(test => {
    const status = test.passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
    console.log(`${status}  ${test.name}`);
    if (test.details) {
      console.log(chalk.gray(`        ${test.details}`));
    }
  });
  
  console.log('='.repeat(60));
  console.log(`\nResults: ${chalk.green(passed + ' passed')}, ${failed > 0 ? chalk.red(failed + ' failed') : '0 failed'} (${total} total)`);
  
  const percentage = Math.round((passed / total) * 100);
  
  if (percentage === 100) {
    console.log(chalk.green('\n✅ All tests passed! Progressive loading is fully functional.'));
  } else if (percentage >= 70) {
    console.log(chalk.yellow(`\n⚠️  ${percentage}% passed. Progressive loading mostly working with some issues.`));
  } else {
    console.log(chalk.red(`\n❌ Only ${percentage}% passed. Progressive loading needs attention.`));
  }
  
  // Performance summary
  const perfTest = tests.find(t => t.name === 'Performance Metrics');
  if (perfTest && perfTest.responseTime) {
    console.log(chalk.blue('\n⚡ Performance Summary:'));
    console.log(`  First paragraph average: ${perfTest.responseTime}ms`);
    console.log(`  Target: <200ms for optimal UX`);
  }
  
  // Manual testing instructions
  console.log(chalk.blue('\n📝 Manual Testing Instructions:'));
  console.log('1. Start dev server: ' + chalk.cyan('yarn dev'));
  console.log('2. Open article page with Network tab open');
  console.log('3. Observe two separate API calls:');
  console.log('   - First paragraph loads immediately');
  console.log('   - Remaining content loads on scroll or button click');
  console.log('4. Check loading animations and transitions');
  console.log('5. Test with slow 3G throttling for real progressive experience');
  console.log('6. Verify offline mode shows cached content progressively');
  
  return percentage === 100;
}

// Execute tests
(async () => {
  try {
    const success = await runTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('\n❌ Test execution failed:'), error);
    process.exit(1);
  }
})();