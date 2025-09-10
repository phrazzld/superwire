#!/usr/bin/env npx tsx

/**
 * Content Consistency Validation Script
 * Verifies that content is represented consistently across all formats:
 * - RSS Feed
 * - JSON Feed
 * - Content API
 * - Stats API
 */

import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

interface ContentItem {
  title: string;
  description?: string;
  date: string;
  url?: string;
  author?: string;
  categories?: string[];
}

interface ValidationResult {
  format: string;
  status: 'pass' | 'fail' | 'warning';
  issues: string[];
  content?: ContentItem[];
}

async function fetchRSSContent(): Promise<ValidationResult> {
  const result: ValidationResult = {
    format: 'RSS Feed',
    status: 'pass',
    issues: [],
    content: []
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/rss`);
    if (!response.ok) {
      result.status = 'fail';
      result.issues.push(`HTTP ${response.status}: ${response.statusText}`);
      return result;
    }
    
    const rssText = await response.text();
    const rssData = await parseStringPromise(rssText);
    
    if (!rssData?.rss?.channel?.[0]) {
      result.status = 'fail';
      result.issues.push('Invalid RSS structure');
      return result;
    }
    
    const channel = rssData.rss.channel[0];
    const items = channel.item || [];
    
    // Validate RSS channel metadata
    if (!channel.title) result.issues.push('Missing channel title');
    if (!channel.description) result.issues.push('Missing channel description');
    if (!channel.link) result.issues.push('Missing channel link');
    
    // Parse items
    result.content = items.map((item: any) => ({
      title: item.title?.[0] || '',
      description: item.description?.[0] || '',
      date: item.pubDate?.[0] || '',
      url: item.link?.[0] || '',
      author: item['dc:creator']?.[0] || item.author?.[0] || '',
      categories: item.category || []
    }));
    
    // Check for consistency issues
    items.forEach((item: any, index: number) => {
      if (!item.title?.[0]) result.issues.push(`Item ${index}: Missing title`);
      if (!item.pubDate?.[0]) result.issues.push(`Item ${index}: Missing publication date`);
      if (!item.guid?.[0]) result.issues.push(`Item ${index}: Missing GUID`);
    });
    
    if (result.issues.length > 0) {
      result.status = 'warning';
    }
    
  } catch (error: any) {
    result.status = 'fail';
    result.issues.push(`Error fetching RSS: ${error.message}`);
  }
  
  return result;
}

async function fetchJSONFeedContent(): Promise<ValidationResult> {
  const result: ValidationResult = {
    format: 'JSON Feed',
    status: 'pass',
    issues: [],
    content: []
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/feed.json`);
    if (!response.ok) {
      result.status = 'fail';
      result.issues.push(`HTTP ${response.status}: ${response.statusText}`);
      return result;
    }
    
    const jsonFeed = await response.json() as any;
    
    // Validate JSON Feed structure
    if (!jsonFeed.version || !jsonFeed.version.startsWith('https://jsonfeed.org/version/')) {
      result.issues.push('Invalid or missing JSON Feed version');
    }
    if (!jsonFeed.title) result.issues.push('Missing feed title');
    if (!jsonFeed.home_page_url) result.issues.push('Missing home page URL');
    if (!jsonFeed.feed_url) result.issues.push('Missing feed URL');
    
    const items = jsonFeed.items || [];
    
    // Parse items
    result.content = items.map((item: any) => ({
      title: item.title || '',
      description: item.content_html || item.content_text || '',
      date: item.date_published || '',
      url: item.url || '',
      author: item.author?.name || '',
      categories: item.tags || []
    }));
    
    // Check for consistency issues
    items.forEach((item: any, index: number) => {
      if (!item.id) result.issues.push(`Item ${index}: Missing ID`);
      if (!item.title) result.issues.push(`Item ${index}: Missing title`);
      if (!item.date_published) result.issues.push(`Item ${index}: Missing publication date`);
      if (!item.content_html && !item.content_text) {
        result.issues.push(`Item ${index}: Missing content`);
      }
    });
    
    if (result.issues.length > 0) {
      result.status = 'warning';
    }
    
  } catch (error: any) {
    result.status = 'fail';
    result.issues.push(`Error fetching JSON Feed: ${error.message}`);
  }
  
  return result;
}

async function fetchContentAPI(): Promise<ValidationResult> {
  const result: ValidationResult = {
    format: 'Content API',
    status: 'pass',
    issues: [],
    content: []
  };
  
  try {
    // Try to fetch latest content
    const response = await fetch(`${BASE_URL}/api/content/latest`);
    
    if (response.status === 404) {
      // Try with today's date
      const today = new Date().toISOString().split('T')[0];
      const todayResponse = await fetch(`${BASE_URL}/api/content/${today}`);
      
      if (!todayResponse.ok && todayResponse.status !== 404) {
        result.status = 'fail';
        result.issues.push(`HTTP ${todayResponse.status}: ${todayResponse.statusText}`);
        return result;
      }
      
      if (todayResponse.status === 404) {
        result.status = 'warning';
        result.issues.push('No content available for today or latest');
        return result;
      }
    } else if (!response.ok) {
      result.status = 'fail';
      result.issues.push(`HTTP ${response.status}: ${response.statusText}`);
      return result;
    }
    
    const contentData = response.ok ? await response.json() as any : null;
    
    if (contentData) {
      // Check content structure
      if (!contentData.date) result.issues.push('Missing date field');
      if (!contentData.episodes && !contentData.articles && !contentData.briefs) {
        result.issues.push('No content types present (episodes/articles/briefs)');
      }
      
      // Parse episodes/articles into consistent format
      if (contentData.episodes) {
        contentData.episodes.forEach((ep: any) => {
          result.content?.push({
            title: ep.title || 'Untitled Episode',
            description: ep.description || '',
            date: ep.date || contentData.date,
            url: ep.url || '',
            author: 'Superwire AI'
          });
        });
      }
      
      if (contentData.articles) {
        contentData.articles.forEach((article: any) => {
          result.content?.push({
            title: article.title || '',
            description: article.summary || article.description || '',
            date: article.publishedAt || contentData.date,
            url: article.url || '',
            author: article.author || ''
          });
        });
      }
    }
    
    if (result.issues.length > 0) {
      result.status = 'warning';
    }
    
  } catch (error: any) {
    result.status = 'fail';
    result.issues.push(`Error fetching Content API: ${error.message}`);
  }
  
  return result;
}

async function fetchStatsAPI(): Promise<ValidationResult> {
  const result: ValidationResult = {
    format: 'Stats API',
    status: 'pass',
    issues: []
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/stats`);
    if (!response.ok) {
      result.status = 'fail';
      result.issues.push(`HTTP ${response.status}: ${response.statusText}`);
      return result;
    }
    
    const stats = await response.json() as any;
    
    // Validate stats structure
    if (!stats.daily) result.issues.push('Missing daily stats');
    if (!stats.weekly) result.issues.push('Missing weekly stats');
    if (!stats.monthly) result.issues.push('Missing monthly stats');
    if (!stats.health) result.issues.push('Missing health status');
    
    // Check data consistency
    if (stats.daily?.today) {
      const today = stats.daily.today;
      if (typeof today.ai_costs !== 'number') result.issues.push('Invalid AI costs format');
      if (typeof today.audio_costs !== 'number') result.issues.push('Invalid audio costs format');
      if (typeof today.total_costs !== 'number') result.issues.push('Invalid total costs format');
      
      // Verify cost calculation
      const calculatedTotal = today.ai_costs + today.audio_costs;
      if (Math.abs(calculatedTotal - today.total_costs) > 0.001) {
        result.issues.push(`Cost calculation mismatch: ${calculatedTotal} != ${today.total_costs}`);
      }
    }
    
    // Check health status
    if (stats.health?.api_status !== 'healthy') {
      result.status = 'warning';
      result.issues.push(`API health status: ${stats.health?.api_status}`);
    }
    
    if (result.issues.length > 0 && result.status === 'pass') {
      result.status = 'warning';
    }
    
  } catch (error: any) {
    result.status = 'fail';
    result.issues.push(`Error fetching Stats API: ${error.message}`);
  }
  
  return result;
}

function compareContentConsistency(results: ValidationResult[]): void {
  console.log('\n📊 CROSS-FORMAT CONSISTENCY CHECK\n');
  console.log('=' .repeat(50));
  
  // Extract content from RSS and JSON feeds
  const rssContent = results.find(r => r.format === 'RSS Feed')?.content || [];
  const jsonContent = results.find(r => r.format === 'JSON Feed')?.content || [];
  const apiContent = results.find(r => r.format === 'Content API')?.content || [];
  
  // Compare item counts
  console.log('\n📈 Content Counts:');
  console.log(`   RSS Feed: ${rssContent.length} items`);
  console.log(`   JSON Feed: ${jsonContent.length} items`);
  console.log(`   Content API: ${apiContent.length} items`);
  
  if (rssContent.length !== jsonContent.length) {
    console.log('   ⚠️ Item count mismatch between RSS and JSON feeds');
  }
  
  // Compare titles if both feeds have content
  if (rssContent.length > 0 && jsonContent.length > 0) {
    console.log('\n🔍 Title Consistency:');
    
    const rssTitles = new Set(rssContent.map(item => item.title));
    const jsonTitles = new Set(jsonContent.map(item => item.title));
    
    const commonTitles = [...rssTitles].filter(title => jsonTitles.has(title));
    const rssOnlyTitles = [...rssTitles].filter(title => !jsonTitles.has(title));
    const jsonOnlyTitles = [...jsonTitles].filter(title => !rssTitles.has(title));
    
    console.log(`   Common titles: ${commonTitles.length}`);
    if (rssOnlyTitles.length > 0) {
      console.log(`   RSS-only titles: ${rssOnlyTitles.length}`);
      rssOnlyTitles.slice(0, 3).forEach(title => {
        console.log(`     - ${title.substring(0, 50)}...`);
      });
    }
    if (jsonOnlyTitles.length > 0) {
      console.log(`   JSON-only titles: ${jsonOnlyTitles.length}`);
      jsonOnlyTitles.slice(0, 3).forEach(title => {
        console.log(`     - ${title.substring(0, 50)}...`);
      });
    }
  }
  
  // Check date format consistency
  console.log('\n📅 Date Format Consistency:');
  
  const dateFormats = new Set<string>();
  
  const checkDateFormat = (date: string): string => {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(date)) return 'ISO 8601';
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'YYYY-MM-DD';
    if (/^\w{3}, \d{2} \w{3} \d{4}/.test(date)) return 'RFC 2822';
    return 'Unknown';
  };
  
  rssContent.forEach(item => {
    if (item.date) dateFormats.add(`RSS: ${checkDateFormat(item.date)}`);
  });
  
  jsonContent.forEach(item => {
    if (item.date) dateFormats.add(`JSON: ${checkDateFormat(item.date)}`);
  });
  
  dateFormats.forEach(format => {
    console.log(`   ${format}`);
  });
  
  if (dateFormats.size > 2) {
    console.log('   ⚠️ Multiple date formats detected - consider standardization');
  }
}

async function validateContentConsistency() {
  console.log('🔍 CONTENT CONSISTENCY VALIDATION\n');
  console.log('=' .repeat(50));
  console.log('Checking content representation across all formats...\n');
  
  // Check if dev server is running
  try {
    const health = await fetch(`${BASE_URL}/api/stats`);
    if (!health.ok) {
      console.log('❌ Development server not responding');
      console.log('   Please ensure yarn dev is running');
      return;
    }
  } catch (error) {
    console.log('❌ Cannot connect to development server');
    console.log('   Please run: yarn dev');
    return;
  }
  
  // Run all validation checks
  const results: ValidationResult[] = [];
  const dateFormats = new Set<string>();  // Declare here for proper scope
  
  console.log('🔄 Fetching content from all endpoints...\n');
  
  // Fetch from all sources in parallel
  const [rss, json, content, stats] = await Promise.all([
    fetchRSSContent(),
    fetchJSONFeedContent(),
    fetchContentAPI(),
    fetchStatsAPI()
  ]);
  
  results.push(rss, json, content, stats);
  
  // Display results
  console.log('📋 VALIDATION RESULTS\n');
  console.log('=' .repeat(50));
  
  let totalPass = 0;
  let totalFail = 0;
  let totalWarning = 0;
  
  results.forEach(result => {
    const statusIcon = result.status === 'pass' ? '✅' : 
                       result.status === 'warning' ? '⚠️' : '❌';
    
    console.log(`\n${statusIcon} ${result.format}`);
    
    if (result.issues.length > 0) {
      console.log('   Issues:');
      result.issues.slice(0, 5).forEach(issue => {
        console.log(`   - ${issue}`);
      });
      if (result.issues.length > 5) {
        console.log(`   ... and ${result.issues.length - 5} more issues`);
      }
    } else {
      console.log('   No issues found');
    }
    
    if (result.content && result.content.length > 0) {
      console.log(`   Content items: ${result.content.length}`);
    }
    
    if (result.status === 'pass') totalPass++;
    else if (result.status === 'warning') totalWarning++;
    else totalFail++;
  });
  
  // Compare consistency across formats
  compareContentConsistency(results);
  
  // Overall summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 OVERALL SUMMARY\n');
  
  const totalChecks = results.length;
  const successRate = (totalPass / totalChecks) * 100;
  
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`Passed: ${totalPass}`);
  console.log(`Warnings: ${totalWarning}`);
  console.log(`Failed: ${totalFail}`);
  console.log(`Success Rate: ${successRate.toFixed(0)}%`);
  
  if (totalFail === 0 && totalWarning === 0) {
    console.log('\n🎉 Perfect consistency! All formats are properly aligned.');
  } else if (totalFail === 0) {
    console.log('\n✅ Good consistency with minor warnings to address.');
  } else {
    console.log('\n⚠️ Consistency issues detected. Please review failures.');
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS\n');
  console.log('=' .repeat(50));
  
  // Check for date format issues based on validation results
  const hasDateIssues = results.some(r => 
    r.issues.some(i => i.includes('date') || i.includes('Date'))
  );
  
  if (hasDateIssues) {
    console.log('• Standardize date formats across all endpoints (recommend ISO 8601)');
  }
  
  if (rss.content?.length !== json.content?.length) {
    console.log('• Ensure RSS and JSON feeds return the same content items');
  }
  
  if (totalWarning > 0) {
    console.log('• Address warning issues to improve data quality');
  }
  
  if (results.some(r => r.issues.some(i => i.includes('Missing')))) {
    console.log('• Add missing required fields to improve feed validity');
  }
  
  console.log('• Consider implementing data validation schemas');
  console.log('• Add integration tests for cross-format consistency');
  
  console.log('\n' + '=' .repeat(50));
  console.log('Content consistency validation complete ✅');
}

// Run validation
validateContentConsistency().catch(console.error);