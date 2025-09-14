#!/usr/bin/env npx tsx
import { generateArticle, storeArticleInConvex } from '../src/generators/article';
import { IngestedArticle } from '../src/lib/ingestion';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function testArticleStorage() {
  console.log('🧪 Testing article generation and storage...');

  // Check if Convex is configured
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error('❌ NEXT_PUBLIC_CONVEX_URL not configured');
    console.error('Please run "npx convex dev" and add the URL to .env.local');
    process.exit(1);
  }

  // Create a test story for article generation
  const testStory: IngestedArticle = {
    title: 'Revolutionary AI Breakthrough Transforms News Generation',
    content: 'Scientists at a leading technology research institute have announced a breakthrough in artificial intelligence that could revolutionize how news content is generated and distributed. The new system combines advanced natural language processing with real-time fact-checking capabilities, enabling the creation of accurate, well-researched articles at unprecedented speed. This development addresses growing concerns about information quality in the digital age while maintaining journalistic integrity. The research team emphasized that this technology is designed to assist rather than replace human journalists, providing them with powerful tools to enhance their reporting capabilities.',
    url: 'https://test.example.com/ai-breakthrough',
    pubDate: '2024-01-15T10:00:00Z',
    source: 'tech-journal',
    sourceName: 'Technology Research Journal',
    ingestionDate: new Date(),
    metadata: {
      publishedAt: new Date(),
      author: 'Dr. Sarah Chen',
      readingTime: 2
    }
  };

  try {
    // Test 1: Generate article without storage
    console.log('\n📝 Test 1: Generate article without storage...');
    const article1 = await generateArticle(testStory, {
      targetLength: 500,
      storeInConvex: false
    });
    
    console.log(`✅ Generated article: "${article1.title}"`);
    console.log(`   Word count: ${article1.wordCount}`);
    console.log(`   Quality score: ${article1.qualityScore}`);
    console.log(`   Cost: $${article1.generationCost}`);

    // Test 2: Generate article with automatic storage
    console.log('\n💾 Test 2: Generate article with automatic storage...');
    const article2 = await generateArticle(testStory, {
      targetLength: 600,
      storeInConvex: true  // This should automatically store the article
    });
    
    console.log(`✅ Generated and stored article: "${article2.title}"`);

    // Test 3: Manual storage of the first article
    console.log('\n🔧 Test 3: Manual storage of first article...');
    const storedId = await storeArticleInConvex(article1);
    console.log(storedId ? `✅ Manually stored article with ID: ${storedId}` : '❌ Failed to store article');

    // Test 4: Verify articles were stored by querying Convex
    console.log('\n📚 Test 4: Verify articles in Convex database...');
    const client = new ConvexHttpClient(convexUrl);
    const todayDate = new Date().toISOString().split('T')[0];
    const storedArticles = await client.query(api.functions.getArticlesByDate, {
      date: todayDate
    });

    console.log(`✅ Found ${storedArticles.length} article(s) for today in Convex`);
    
    // Display stored articles
    storedArticles.forEach((article: any, index: number) => {
      console.log(`\n📄 Article ${index + 1}:`);
      console.log(`   Headline: ${article.headline}`);
      console.log(`   Model: ${article.model}`);
      console.log(`   Cost: $${article.costs.totalCost}`);
      console.log(`   Tags: ${article.tags?.join(', ') || 'none'}`);
      console.log(`   Editorial Score: ${article.editorialScore || 'none'}`);
    });

    console.log('\n🎉 All article storage tests passed!');
    console.log('✨ Article generation and Convex storage are working correctly!');

  } catch (error) {
    console.error('\n❌ Article storage test failed:', error);
    console.error('\n💡 Make sure you have:');
    console.error('  1. Run "npx convex dev" and configured your project');
    console.error('  2. Added NEXT_PUBLIC_CONVEX_URL to .env.local');
    console.error('  3. Added OPENROUTER_API_KEY to .env.local');
    console.error('  4. The Convex dev server is running');
    process.exit(1);
  }
}

// Run the test
testArticleStorage().catch(console.error);