#!/usr/bin/env npx tsx
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Missing NEXT_PUBLIC_CONVEX_URL environment variable");
  console.error("Please run 'npx convex dev' and add the URL to .env.local");
  process.exit(1);
}

async function testConvexConnection() {
  console.log("🔧 Testing Convex connection...");
  console.log(`📡 Convex URL: ${CONVEX_URL}`);

  try {
    // Initialize Convex client
    const client = new ConvexHttpClient(CONVEX_URL);

    // Test data for article
    const testArticle = {
      date: new Date().toISOString().split("T")[0],
      headline: "Test Article: Convex Integration Successful",
      content: "This is a test article to verify that our Convex database connection is working properly. If you can read this, the integration was successful!",
      sources: ["test-source", "integration-test"],
      model: "test-model",
      costs: {
        inputTokens: 100,
        outputTokens: 50,
        totalCost: 0.001,
      },
      editorialScore: 8.5,
      tags: ["test", "convex", "integration"],
    };

    // Store the test article
    console.log("\n📝 Storing test article...");
    const articleId = await client.mutation(api.functions.storeArticle, testArticle);
    console.log(`✅ Article stored successfully with ID: ${articleId}`);

    // Read back the articles for today
    console.log("\n📚 Reading articles for today...");
    const articles = await client.query(api.functions.getArticlesByDate, {
      date: testArticle.date,
    });
    console.log(`✅ Found ${articles.length} article(s) for today`);

    // Display the test article
    const ourArticle = articles.find((a) => a.headline === testArticle.headline);
    if (ourArticle) {
      console.log("\n📄 Test article details:");
      console.log(`  - Headline: ${ourArticle.headline}`);
      console.log(`  - Date: ${ourArticle.date}`);
      console.log(`  - Model: ${ourArticle.model}`);
      console.log(`  - Cost: $${ourArticle.costs.totalCost}`);
      console.log(`  - Tags: ${ourArticle.tags?.join(", ")}`);
    }

    // Test raw content storage
    const testRawContent = {
      date: new Date().toISOString().split("T")[0],
      source: "test-source",
      url: "https://test.example.com/article",
      content: "Raw test content from news source",
      processed: false,
      title: "Test Raw Content",
      pubDate: new Date().toISOString(),
    };

    console.log("\n📰 Storing test raw content...");
    const rawContentId = await client.mutation(api.functions.storeRawContent, testRawContent);
    console.log(`✅ Raw content stored successfully with ID: ${rawContentId}`);

    // Get unprocessed content
    console.log("\n🔍 Checking for unprocessed content...");
    const unprocessed = await client.query(api.functions.getUnprocessedContent);
    console.log(`✅ Found ${unprocessed.length} unprocessed item(s)`);

    // Test episode storage
    const testEpisode = {
      date: new Date().toISOString().split("T")[0],
      audioUrl: "https://storage.example.com/test-episode.mp3",
      transcript: "This is a test transcript for the episode.",
      stories: [
        {
          headline: "Test Story 1",
          summary: "Summary of test story 1",
          source: "test-source",
          url: "https://example.com/story1",
        },
        {
          headline: "Test Story 2",
          summary: "Summary of test story 2",
          source: "test-source",
        },
      ],
      costs: {
        generation: 0.5,
        audio: 1.5,
        total: 2.0,
      },
    };

    console.log("\n🎙️ Storing test episode...");
    const episodeId = await client.mutation(api.functions.storeEpisode, testEpisode);
    console.log(`✅ Episode stored successfully with ID: ${episodeId}`);

    // Get latest episode
    console.log("\n🎧 Getting latest episode...");
    const latestEpisode = await client.query(api.functions.getLatestEpisode);
    if (latestEpisode) {
      console.log(`✅ Latest episode:`);
      console.log(`  - Date: ${latestEpisode.date}`);
      console.log(`  - Stories: ${latestEpisode.stories.length}`);
      console.log(`  - Total cost: $${latestEpisode.costs.total}`);
    }

    console.log("\n🎉 All Convex tests passed successfully!");
    console.log("✨ Your Convex database is ready for use!");

  } catch (error) {
    console.error("\n❌ Convex test failed:");
    console.error(error);
    console.error("\n💡 Make sure you have:");
    console.error("  1. Run 'npx convex dev' to set up your project");
    console.error("  2. Added NEXT_PUBLIC_CONVEX_URL to .env.local");
    console.error("  3. The Convex dev server is running");
    process.exit(1);
  }
}

// Run the test
testConvexConnection().catch(console.error);