import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate upload URL for file uploads
export const generateUploadUrl = mutation({
  handler: async (ctx: any) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get public URL for a stored file
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx: any, args: any) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Delete a stored file
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx: any, args: any) => {
    await ctx.storage.delete(args.storageId);
    return args.storageId;
  },
});