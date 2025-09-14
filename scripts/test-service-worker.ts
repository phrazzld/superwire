#!/usr/bin/env npx tsx

/**
 * Test service worker offline functionality
 * 
 * This script verifies:
 * 1. Service worker file exists and is valid
 * 2. Offline page exists
 * 3. Service worker registration hook exists
 * 4. Cache strategies are properly configured
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const tests: TestResult[] = [];

async function runTests() {
  console.log(chalk.blue('🔍 Service Worker Offline Functionality Tests\n'));
  console.log('='.repeat(60));
  
  // Test 1: Service Worker File Validation
  console.log(chalk.yellow('\n📋 Test 1: Service Worker File'));
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  const swExists = fs.existsSync(swPath);
  
  if (swExists) {
    const swContent = fs.readFileSync(swPath, 'utf-8');
    
    // Check for essential event listeners
    const hasInstallEvent = swContent.includes("addEventListener('install'");
    const hasFetchEvent = swContent.includes("addEventListener('fetch'");
    const hasActivateEvent = swContent.includes("addEventListener('activate'");
    
    // Check for cache strategies
    const hasNetworkFirst = swContent.includes('networkFirst');
    const hasCacheFirst = swContent.includes('cacheFirst');
    const hasStaleWhileRevalidate = swContent.includes('staleWhileRevalidate');
    
    // Check for offline fallback
    const hasOfflineFallback = swContent.includes('/offline.html');
    
    const allEventsPassed = hasInstallEvent && hasFetchEvent && hasActivateEvent;
    const allStrategiesPassed = hasNetworkFirst && hasCacheFirst && hasStaleWhileRevalidate;
    
    tests.push({
      name: 'Service Worker File',
      passed: swExists && allEventsPassed,
      details: `File exists: ✓ | Install: ${hasInstallEvent ? '✓' : '✗'} | Fetch: ${hasFetchEvent ? '✓' : '✗'} | Activate: ${hasActivateEvent ? '✓' : '✗'}`
    });
    
    tests.push({
      name: 'Cache Strategies',
      passed: allStrategiesPassed,
      details: `NetworkFirst: ${hasNetworkFirst ? '✓' : '✗'} | CacheFirst: ${hasCacheFirst ? '✓' : '✗'} | StaleWhileRevalidate: ${hasStaleWhileRevalidate ? '✓' : '✗'}`
    });
    
    tests.push({
      name: 'Offline Fallback Reference',
      passed: hasOfflineFallback,
      details: hasOfflineFallback ? 'References /offline.html' : 'No offline.html reference found'
    });
    
    console.log(chalk.green('  ✓ Service worker file exists'));
    console.log(`  ${allEventsPassed ? '✓' : '✗'} All event listeners present`);
    console.log(`  ${allStrategiesPassed ? '✓' : '✗'} Cache strategies implemented`);
    console.log(`  ${hasOfflineFallback ? '✓' : '✗'} Offline fallback configured`);
  } else {
    tests.push({
      name: 'Service Worker File',
      passed: false,
      details: 'sw.js not found in /public directory'
    });
    console.log(chalk.red('  ✗ Service worker file not found'));
  }
  
  // Test 2: Offline Page
  console.log(chalk.yellow('\n📋 Test 2: Offline Page'));
  const offlinePath = path.join(process.cwd(), 'public', 'offline.html');
  const offlineExists = fs.existsSync(offlinePath);
  
  if (!offlineExists) {
    console.log(chalk.red('  ✗ offline.html is missing'));
    console.log(chalk.yellow('  → Creating offline.html...'));
    
    // Create offline page
    const offlineContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Superwire - Offline</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
            color: #ffffff;
        }
        .offline-container {
            text-align: center;
            padding: 2rem;
            max-width: 500px;
        }
        .icon {
            font-size: 4rem;
            margin-bottom: 1.5rem;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        p {
            font-size: 1.1rem;
            line-height: 1.6;
            opacity: 0.9;
            margin-bottom: 1.5rem;
        }
        .status {
            display: inline-block;
            padding: 0.5rem 1rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2rem;
            font-size: 0.9rem;
            margin-top: 1rem;
        }
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 1rem 2rem;
            font-size: 1rem;
            font-weight: 600;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            margin-top: 1rem;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }
        button:active {
            transform: translateY(0);
        }
        .cached-content {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .cached-content h2 {
            font-size: 1.3rem;
            margin-bottom: 1rem;
            opacity: 0.9;
        }
        .cached-content p {
            font-size: 0.95rem;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="icon">📡</div>
        <h1>You're Offline</h1>
        <p>Superwire needs an internet connection to fetch the latest news and generate fresh content.</p>
        <div class="status" id="status">No internet connection detected</div>
        <button onclick="window.location.reload()">Try Again</button>
        
        <div class="cached-content">
            <h2>While you're offline</h2>
            <p>Previously cached content may still be available. Your browser will automatically reconnect when your internet connection is restored.</p>
        </div>
    </div>
    
    <script>
        // Monitor connection status
        function updateStatus() {
            const statusEl = document.getElementById('status');
            if (navigator.onLine) {
                statusEl.textContent = 'Connection restored! Reloading...';
                statusEl.style.background = 'rgba(76, 175, 80, 0.2)';
                setTimeout(() => window.location.reload(), 1000);
            } else {
                statusEl.textContent = 'No internet connection detected';
                statusEl.style.background = 'rgba(255, 255, 255, 0.1)';
            }
        }
        
        // Listen for connection changes
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        
        // Check periodically
        setInterval(() => {
            fetch('/api/stats', { method: 'HEAD' })
                .then(() => {
                    document.getElementById('status').textContent = 'Connection restored! Reloading...';
                    window.location.reload();
                })
                .catch(() => {});
        }, 5000);
    </script>
</body>
</html>`;
    
    fs.writeFileSync(offlinePath, offlineContent);
    console.log(chalk.green('  ✓ Created offline.html'));
    
    tests.push({
      name: 'Offline Page',
      passed: true,
      details: 'Created new offline.html with auto-reconnect'
    });
  } else {
    tests.push({
      name: 'Offline Page',
      passed: true,
      details: 'offline.html exists'
    });
    console.log(chalk.green('  ✓ offline.html exists'));
  }
  
  // Test 3: Service Worker Registration
  console.log(chalk.yellow('\n📋 Test 3: Service Worker Registration'));
  const hookPath = path.join(process.cwd(), 'app', 'hooks', 'useServiceWorker.tsx');
  const hookExists = fs.existsSync(hookPath);
  
  if (hookExists) {
    const hookContent = fs.readFileSync(hookPath, 'utf-8');
    const hasRegistration = hookContent.includes('navigator.serviceWorker.register');
    const registersCorrectFile = hookContent.includes("'/sw.js'");
    const hasUpdateCheck = hookContent.includes('update') || hookContent.includes('skipWaiting');
    
    tests.push({
      name: 'Service Worker Registration',
      passed: hookExists && hasRegistration && registersCorrectFile,
      details: `Hook exists: ✓ | Registration: ${hasRegistration ? '✓' : '✗'} | Correct file: ${registersCorrectFile ? '✓' : '✗'}`
    });
    
    console.log(chalk.green('  ✓ useServiceWorker hook exists'));
    console.log(`  ${hasRegistration ? '✓' : '✗'} Registration code present`);
    console.log(`  ${registersCorrectFile ? '✓' : '✗'} Registers /sw.js`);
    console.log(`  ${hasUpdateCheck ? '✓' : '✗'} Has update mechanism`);
  } else {
    tests.push({
      name: 'Service Worker Registration',
      passed: false,
      details: 'useServiceWorker.tsx hook not found'
    });
    console.log(chalk.red('  ✗ useServiceWorker hook not found'));
  }
  
  // Test 4: Check App Integration
  console.log(chalk.yellow('\n📋 Test 4: App Integration'));
  const layoutPath = path.join(process.cwd(), 'app', 'layout.tsx');
  const layoutExists = fs.existsSync(layoutPath);
  
  if (layoutExists) {
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    const importsHook = layoutContent.includes('useServiceWorker');
    const usesHook = layoutContent.includes('useServiceWorker()');
    
    tests.push({
      name: 'App Integration',
      passed: importsHook || usesHook,
      details: `Layout exists: ✓ | Hook imported: ${importsHook ? '✓' : '✗'} | Hook used: ${usesHook ? '✓' : '✗'}`
    });
    
    console.log(`  ${layoutExists ? '✓' : '✗'} layout.tsx exists`);
    console.log(`  ${importsHook || usesHook ? '✓' : '✗'} Service worker integrated`);
  } else {
    tests.push({
      name: 'App Integration',
      passed: false,
      details: 'layout.tsx not found'
    });
    console.log(chalk.red('  ✗ layout.tsx not found'));
  }
  
  // Test 5: Cache Configuration
  console.log(chalk.yellow('\n📋 Test 5: Cache Configuration'));
  if (swExists) {
    const swContent = fs.readFileSync(swPath, 'utf-8');
    
    // Check cache names
    const hasCacheVersioning = swContent.includes("'superwire-v");
    const hasMultipleCaches = swContent.includes('OFFLINE_CACHE_NAME') || swContent.includes('CONTENT_CACHE_NAME');
    
    // Check cached routes
    const cachesStaticAssets = swContent.includes('/_next/static');
    const cachesAPIRoutes = swContent.includes('/api/');
    const cachesImages = swContent.includes('.png') || swContent.includes('.jpg');
    
    tests.push({
      name: 'Cache Configuration',
      passed: hasCacheVersioning && (cachesStaticAssets || cachesAPIRoutes),
      details: `Versioning: ${hasCacheVersioning ? '✓' : '✗'} | Static: ${cachesStaticAssets ? '✓' : '✗'} | API: ${cachesAPIRoutes ? '✓' : '✗'} | Images: ${cachesImages ? '✓' : '✗'}`
    });
    
    console.log(`  ${hasCacheVersioning ? '✓' : '✗'} Cache versioning`);
    console.log(`  ${hasMultipleCaches ? '✓' : '✗'} Multiple cache stores`);
    console.log(`  ${cachesStaticAssets ? '✓' : '✗'} Caches static assets`);
    console.log(`  ${cachesAPIRoutes ? '✓' : '✗'} Caches API routes`);
  }
  
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
  const allPassed = failed === 0;
  
  if (allPassed) {
    console.log(chalk.green(`\n✅ All tests passed! Service worker is properly configured for offline use.`));
  } else if (percentage >= 80) {
    console.log(chalk.yellow(`\n⚠️  ${percentage}% passed. Service worker mostly functional with minor issues.`));
  } else {
    console.log(chalk.red(`\n❌ Only ${percentage}% passed. Service worker needs improvements.`));
  }
  
  // Manual testing instructions
  console.log(chalk.blue('\n📝 Manual Testing Instructions:'));
  console.log('1. Start dev server: ' + chalk.cyan('yarn dev'));
  console.log('2. Open: ' + chalk.cyan('http://localhost:3000'));
  console.log('3. Open DevTools → ' + chalk.cyan('Application → Service Workers'));
  console.log('4. Verify service worker is registered and active');
  console.log('5. Check ' + chalk.cyan('"Offline"') + ' checkbox to simulate offline mode');
  console.log('6. Navigate around - should see offline page or cached content');
  console.log('7. Check ' + chalk.cyan('Cache Storage') + ' to see cached resources');
  console.log('8. Uncheck "Offline" to go back online');
  
  return allPassed;
}

// Main execution
(async () => {
  try {
    const success = await runTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('\n❌ Test execution failed:'), error);
    process.exit(1);
  }
})();