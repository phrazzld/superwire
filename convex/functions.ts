import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Mutation to store a new episode
export const storeEpisode = mutation({
  args: {
    date: v.string(),
    audioUrl: v.string(),
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
  },
  handler: async (ctx, args) => {
    const episodeId = await ctx.db.insert("episodes", {
      ...args,
      createdAt: Date.now(),
    });
    return episodeId;
  },
});

// Mutation to store a new article
export const storeArticle = mutation({
  args: {
    date: v.string(),
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
  },
  handler: async (ctx, args) => {
    const articleId = await ctx.db.insert("articles", {
      ...args,
      createdAt: Date.now(),
    });
    return articleId;
  },
});

// Mutation to store raw content from news sources
export const storeRawContent = mutation({
  args: {
    date: v.string(),
    source: v.string(),
    url: v.string(),
    content: v.string(),
    processed: v.boolean(),
    title: v.optional(v.string()),
    pubDate: v.optional(v.string()),
    author: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rawContentId = await ctx.db.insert("rawContent", {
      ...args,
      extractedAt: Date.now(),
    });
    return rawContentId;
  },
});

// Query to get episodes by date
export const getEpisodesByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const episodes = await ctx.db
      .query("episodes")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
    return episodes;
  },
});

// Query to get articles by date
export const getArticlesByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
    return articles;
  },
});

// Query to get unprocessed raw content
export const getUnprocessedContent = query({
  handler: async (ctx) => {
    const unprocessed = await ctx.db
      .query("rawContent")
      .withIndex("by_processed", (q) => q.eq("processed", false))
      .collect();
    return unprocessed;
  },
});

// Query to get raw content by source
export const getRawContentBySource = query({
  args: { source: v.string() },
  handler: async (ctx, args) => {
    const content = await ctx.db
      .query("rawContent")
      .withIndex("by_source", (q) => q.eq("source", args.source))
      .collect();
    return content;
  },
});

// Mutation to mark raw content as processed
export const markContentProcessed = mutation({
  args: { id: v.id("rawContent") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { processed: true });
    return args.id;
  },
});

// Query to get the latest episode
export const getLatestEpisode = query({
  handler: async (ctx) => {
    const episode = await ctx.db
      .query("episodes")
      .withIndex("by_created")
      .order("desc")
      .first();
    return episode;
  },
});

// Query to get recent articles with optional limit
export const getRecentArticles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("articles")
      .withIndex("by_created")
      .order("desc");
    
    const articles = args.limit 
      ? await query.take(args.limit)
      : await query.collect();
    
    return articles;
  },
});