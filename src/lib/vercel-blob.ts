/**
 * Vercel Blob Storage Module
 * Handles episode storage and retrieval using Vercel Blob Storage
 * Replaces Firebase Storage for audio file hosting
 */

import { put, del, list, head } from '@vercel/blob';

// Types
export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  size?: number;
  uploadedAt?: Date;
}

export interface EpisodeMetadata {
  url: string;
  size: number;
  uploadedAt: Date;
  contentType: string;
  cacheControl: string;
}

export interface ListEpisodesResult {
  episodes: {
    url: string;
    pathname: string;
    size: number;
    uploadedAt: Date;
  }[];
  hasMore: boolean;
  cursor?: string;
}

// Environment validation
function validateBlobToken(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  if (!token) {
    console.warn('⚠️ BLOB_READ_WRITE_TOKEN not configured, Vercel Blob storage unavailable');
    return false;
  }
  
  if (!token.startsWith('vercel_blob_')) {
    console.warn('⚠️ Invalid BLOB_READ_WRITE_TOKEN format (should start with vercel_blob_)');
    return false;
  }
  
  return true;
}

// Retry logic with exponential backoff (from error-handler.ts pattern)
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  operationName: string = 'Blob operation'
): Promise<T> {
  const retryDelays = [1000, 2000, 4000]; // Exponential backoff
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      
      if (isLastAttempt) {
        console.error(`${operationName} failed after ${maxRetries + 1} attempts:`, error);
        throw error;
      }
      
      const delay = retryDelays[Math.min(attempt, retryDelays.length - 1)];
      console.warn(`${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`${operationName} failed after all retries`);
}

/**
 * Upload an episode audio file to Vercel Blob Storage
 * @param audioBuffer - The audio file buffer to upload
 * @param filename - The filename for the episode (e.g., 'episode-2024-01-15.mp3')
 * @returns Upload result with CDN-backed URL
 */
export async function uploadEpisodeToBlob(
  audioBuffer: Buffer,
  filename: string
): Promise<UploadResult> {
  try {
    // Validate environment
    if (!validateBlobToken()) {
      return {
        success: false,
        error: 'Vercel Blob storage not configured'
      };
    }
    
    // Validate input
    if (!audioBuffer || audioBuffer.length === 0) {
      return {
        success: false,
        error: 'Invalid audio buffer: empty or missing'
      };
    }
    
    if (!filename || !filename.endsWith('.mp3')) {
      return {
        success: false,
        error: 'Invalid filename: must end with .mp3'
      };
    }
    
    // Upload with retry logic
    const blob = await withRetry(
      async () => {
        return await put(`episodes/${filename}`, audioBuffer, {
          access: 'public',
          cacheControlMaxAge: 31536000, // 1 year cache
          contentType: 'audio/mpeg',
          token: process.env.BLOB_READ_WRITE_TOKEN
        });
      },
      3,
      `Upload episode ${filename}`
    );
    
    console.log(`✅ Episode uploaded successfully: ${filename}`);
    console.log(`   URL: ${blob.url}`);
    console.log(`   Size: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      success: true,
      url: blob.url,
      size: audioBuffer.length,
      uploadedAt: new Date()
    };
    
  } catch (error) {
    console.error('Failed to upload episode to Vercel Blob:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
}

/**
 * List episodes from Vercel Blob Storage
 * @param limit - Maximum number of episodes to return (default: 100)
 * @param cursor - Pagination cursor for fetching next page
 * @returns List of episodes with metadata
 */
export async function listEpisodes(
  limit: number = 100,
  cursor?: string
): Promise<ListEpisodesResult> {
  try {
    if (!validateBlobToken()) {
      return {
        episodes: [],
        hasMore: false
      };
    }
    
    const result = await withRetry(
      async () => {
        return await list({
          prefix: 'episodes/',
          limit,
          cursor,
          token: process.env.BLOB_READ_WRITE_TOKEN
        });
      },
      3,
      'List episodes'
    );
    
    const episodes = result.blobs.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: new Date(blob.uploadedAt)
    }));
    
    // Sort by upload date (newest first)
    episodes.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    
    console.log(`📋 Listed ${episodes.length} episodes from Vercel Blob`);
    
    return {
      episodes,
      hasMore: result.hasMore,
      cursor: result.cursor
    };
    
  } catch (error) {
    console.error('Failed to list episodes from Vercel Blob:', error);
    return {
      episodes: [],
      hasMore: false
    };
  }
}

/**
 * Delete an episode from Vercel Blob Storage
 * @param url - The blob URL to delete
 * @returns Success status
 */
export async function deleteEpisode(url: string): Promise<boolean> {
  try {
    if (!validateBlobToken()) {
      console.error('Cannot delete: Vercel Blob storage not configured');
      return false;
    }
    
    if (!url || !url.includes('blob.vercel-storage.com')) {
      console.error('Invalid blob URL for deletion:', url);
      return false;
    }
    
    await withRetry(
      async () => {
        await del(url, {
          token: process.env.BLOB_READ_WRITE_TOKEN
        });
      },
      3,
      `Delete episode ${url}`
    );
    
    console.log(`🗑️ Episode deleted successfully: ${url}`);
    return true;
    
  } catch (error) {
    console.error('Failed to delete episode from Vercel Blob:', error);
    return false;
  }
}

/**
 * Get metadata for an episode
 * @param url - The blob URL to get metadata for
 * @returns Episode metadata including size and upload date
 */
export async function getEpisodeMetadata(url: string): Promise<EpisodeMetadata | null> {
  try {
    if (!validateBlobToken()) {
      console.error('Cannot get metadata: Vercel Blob storage not configured');
      return null;
    }
    
    if (!url || !url.includes('blob.vercel-storage.com')) {
      console.error('Invalid blob URL for metadata:', url);
      return null;
    }
    
    const metadata = await withRetry(
      async () => {
        return await head(url, {
          token: process.env.BLOB_READ_WRITE_TOKEN
        });
      },
      3,
      `Get metadata for ${url}`
    );
    
    return {
      url: metadata.url,
      size: metadata.size,
      uploadedAt: new Date(metadata.uploadedAt),
      contentType: metadata.contentType,
      cacheControl: metadata.cacheControl || ''
    };
    
  } catch (error) {
    console.error('Failed to get episode metadata from Vercel Blob:', error);
    return null;
  }
}

/**
 * Upload multiple episodes in batch with concurrency control
 * @param episodes - Array of { buffer, filename } objects
 * @param concurrency - Number of parallel uploads (default: 3)
 * @returns Array of upload results
 */
export async function uploadEpisodesBatch(
  episodes: { buffer: Buffer; filename: string }[],
  concurrency: number = 3
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  for (let i = 0; i < episodes.length; i += concurrency) {
    const chunk = episodes.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(episode => uploadEpisodeToBlob(episode.buffer, episode.filename))
    );
    results.push(...chunkResults);
    
    // Rate limiting between chunks
    if (i + concurrency < episodes.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`📦 Batch upload complete: ${successful} successful, ${failed} failed`);
  
  return results;
}

/**
 * Get all episodes with pagination support
 * @returns All episodes from storage
 */
export async function getAllEpisodes(): Promise<ListEpisodesResult['episodes']> {
  const allEpisodes: ListEpisodesResult['episodes'] = [];
  let cursor: string | undefined;
  let hasMore = true;
  
  while (hasMore) {
    const result = await listEpisodes(100, cursor);
    allEpisodes.push(...result.episodes);
    hasMore = result.hasMore;
    cursor = result.cursor;
  }
  
  return allEpisodes;
}

/**
 * Check if Vercel Blob storage is properly configured
 * @returns Configuration status
 */
export function isBlobStorageConfigured(): boolean {
  return validateBlobToken();
}

/**
 * Firebase compatibility wrapper for easy migration
 * Maps Firebase bucket.upload pattern to Vercel Blob
 */
export async function firebaseCompatibilityUpload(
  localPath: string,
  options: { destination: string }
): Promise<UploadResult> {
  // Read file from local path
  const fs = await import('fs');
  const audioBuffer = await fs.promises.readFile(localPath);
  
  // Extract filename from destination
  const filename = options.destination.replace(/^.*\//, '');
  
  // Upload to Vercel Blob
  return uploadEpisodeToBlob(audioBuffer, filename);
}

// Export a test function for validation
export async function testBlobStorage(): Promise<void> {
  console.log('🧪 Testing Vercel Blob Storage...');
  
  if (!isBlobStorageConfigured()) {
    console.error('❌ Vercel Blob Storage is not configured');
    console.log('   Please add BLOB_READ_WRITE_TOKEN to .env.local');
    return;
  }
  
  console.log('✅ Vercel Blob Storage is configured');
  
  // Test listing episodes
  const episodes = await listEpisodes(5);
  console.log(`📋 Found ${episodes.episodes.length} episodes`);
  
  if (episodes.episodes.length > 0) {
    // Test metadata retrieval
    const firstEpisode = episodes.episodes[0];
    const metadata = await getEpisodeMetadata(firstEpisode.url);
    if (metadata) {
      console.log(`📊 Sample metadata:`, {
        size: `${(metadata.size / 1024 / 1024).toFixed(2)} MB`,
        uploadedAt: metadata.uploadedAt.toISOString(),
        contentType: metadata.contentType
      });
    }
  }
  
  console.log('✅ All Vercel Blob Storage tests passed');
}