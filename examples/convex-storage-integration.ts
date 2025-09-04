/**
 * Integration example: Replace Firebase Storage with Convex Storage
 * 
 * This example shows how to integrate the new uploadToStorage function
 * into the existing episode generation pipeline in pages/api/episodes.ts
 */

import { uploadToStorage } from '../src/lib/convex-storage';
import { ConvexHttpClient } from 'convex/browser';

/**
 * Example 1: Replace Firebase upload in episode generation
 * 
 * Original code (pages/api/episodes.ts:732):
 * ```
 * await bucket.upload(mergedFilename, {
 *   destination: `${timestamp}-episode.mp3`,
 * });
 * ```
 */
async function replaceFirebaseUpload(mergedFilename: string, timestamp: string) {
  // New Convex storage approach
  const uploadResult = await uploadToStorage(mergedFilename, {
    fileName: `${timestamp}-episode.mp3`,
    contentType: 'audio/mpeg',
    metadata: {
      timestamp,
      type: 'podcast-episode',
      generatedAt: Date.now(),
    }
  });

  if (!uploadResult.success) {
    throw new Error(`Failed to upload episode: ${uploadResult.error}`);
  }

  console.log('✅ Episode uploaded to Convex storage');
  console.log(`📄 Storage ID: ${uploadResult.storageId}`);
  console.log(`🔗 File URL: ${uploadResult.fileUrl}`);

  return {
    storageId: uploadResult.storageId,
    audioUrl: uploadResult.fileUrl,
    fileSize: uploadResult.fileSize,
  };
}

/**
 * Example 2: Store episode with both storage ID and URL
 */
async function storeEpisodeWithConvexStorage(episodeData: any) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('Convex not configured');
  }

  const client = new ConvexHttpClient(convexUrl);

  // Store episode with both audioUrl (for backward compatibility) and audioStorageId
  // @ts-ignore - Function reference will be available when Convex is configured
  const episodeId = await client.mutation('functions:storeEpisodeWithStorage' as any, {
    ...episodeData,
    audioUrl: episodeData.fileUrl, // Public URL for immediate access
    audioStorageId: episodeData.storageId, // Storage ID for Convex file management
  });

  return episodeId;
}

/**
 * Example 3: Complete integration replacing the Firebase section
 */
export async function integrateConvexStorageInEpisodeGeneration(
  mergedFilename: string, 
  timestamp: string,
  episodeData: {
    transcript: string;
    stories: any[];
    costs: { generation: number; audio: number; total: number };
  }
) {
  try {
    // 1. Upload to Convex storage (replaces Firebase upload)
    console.log('📁 Uploading episode to Convex storage...');
    const uploadResult = await uploadToStorage(mergedFilename, {
      fileName: `${timestamp}-episode.mp3`,
      contentType: 'audio/mpeg',
      metadata: {
        timestamp,
        type: 'podcast-episode',
        generatedAt: Date.now(),
      }
    });

    if (!uploadResult.success) {
      throw new Error(`Storage upload failed: ${uploadResult.error}`);
    }

    // 2. Store episode data in Convex database
    console.log('💾 Storing episode data in Convex...');
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL not configured');
    }

    const client = new ConvexHttpClient(convexUrl);
    
    // @ts-ignore - Function reference will be available when Convex is configured
  const episodeId = await client.mutation('functions:storeEpisodeWithStorage' as any, {
      date: new Date().toISOString().split('T')[0],
      audioUrl: uploadResult.fileUrl!,
      audioStorageId: uploadResult.storageId,
      transcript: episodeData.transcript,
      stories: episodeData.stories,
      costs: episodeData.costs,
    });

    console.log('✅ Episode generation complete!');
    console.log(`📄 Episode ID: ${episodeId}`);
    console.log(`🎵 Audio URL: ${uploadResult.fileUrl}`);
    console.log(`💾 Storage ID: ${uploadResult.storageId}`);
    console.log(`📊 File size: ${(uploadResult.fileSize! / 1024 / 1024).toFixed(2)} MB`);

    return {
      episodeId,
      audioUrl: uploadResult.fileUrl,
      storageId: uploadResult.storageId,
      fileSize: uploadResult.fileSize,
    };

  } catch (error) {
    console.error('❌ Episode storage integration failed:', error);
    throw error;
  }
}

/**
 * Example 4: Backward compatibility wrapper
 * 
 * This function can be used as a drop-in replacement for the Firebase upload
 * while maintaining the same interface for existing code
 */
export async function uploadEpisodeAudio(
  filePath: string, 
  destinationName: string
): Promise<{ audioUrl: string; storageId?: string }> {
  // Try Convex storage first
  const uploadResult = await uploadToStorage(filePath, {
    fileName: destinationName,
    contentType: 'audio/mpeg',
  });

  if (uploadResult.success) {
    return {
      audioUrl: uploadResult.fileUrl!,
      storageId: uploadResult.storageId,
    };
  }

  // Fallback to Firebase if needed (original implementation)
  console.warn('⚠️ Convex upload failed, consider fallback implementation');
  throw new Error(`Upload failed: ${uploadResult.error}`);
}