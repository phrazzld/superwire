import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  episodes: defineTable({
    date: v.string(), // ISO date string
    audioUrl: v.string(),
    audioStorageId: v.optional(v.id("_storage")), // Convex storage ID for audio file
    transcript: v.string(),
    stories: v.array(
      v.object({
        headline: v.string(),
        summary: v.string(),
        source: v.string(),
        url: v.optional(v.string()),
      })
    ),
    costs: v.object({
      generation: v.number(),
      audio: v.number(),
      total: v.number(),
    }),
    createdAt: v.number(), // Unix timestamp
  })
    .index("by_date", ["date"])
    .index("by_created", ["createdAt"]),

  articles: defineTable({
    date: v.string(), // ISO date string
    headline: v.string(),
    content: v.string(),
    sources: v.array(v.string()),
    model: v.string(),
    costs: v.object({
      inputTokens: v.number(),
      outputTokens: v.number(),
      totalCost: v.number(),
    }),
    editorialScore: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(), // Unix timestamp
  })
    .index("by_date", ["date"])
    .index("by_headline", ["headline"])
    .index("by_created", ["createdAt"]),

  rawContent: defineTable({
    date: v.string(), // ISO date string
    source: v.string(), // e.g., "reuters", "ap", "bbc"
    url: v.string(),
    content: v.string(),
    processed: v.boolean(),
    title: v.optional(v.string()),
    pubDate: v.optional(v.string()),
    author: v.optional(v.string()),
    extractedAt: v.number(), // Unix timestamp
  })
    .index("by_date", ["date"])
    .index("by_source", ["source"])
    .index("by_processed", ["processed"])
    .index("by_url", ["url"])
    .index("by_extracted", ["extractedAt"]),
});