import { ConvexHttpClient } from 'convex/browser';
import fs from 'fs';
import path from 'path';
// Import will be available once Convex is properly configured
// import { api } from '../../convex/_generated/api';

// Temporary direct function calls for development - will be replaced with api.storage calls
const STORAGE_FUNCTIONS = {
  generateUploadUrl: 'storage:generateUploadUrl',
  getFileUrl: 'storage:getFileUrl', 
  deleteFile: 'storage:deleteFile',
} as const;

/**
 * File upload result interface
 */
export interface UploadResult {
  success: boolean;
  storageId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

/**
 * File upload options
 */
export interface UploadOptions {
  fileName?: string;
  contentType?: string;
  metadata?: Record<string, any>;
}

/**
 * Initialize Convex client with environment validation
 */
function getConvexClient(): ConvexHttpClient | null {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  
  if (!convexUrl) {
    console.warn('⚠️ NEXT_PUBLIC_CONVEX_URL not configured, file storage unavailable');
    return null;
  }

  return new ConvexHttpClient(convexUrl);
}

/**
 * Upload file to Convex storage
 * 
 * @param filePath - Path to the file to upload
 * @param options - Upload options including fileName and contentType
 * @returns Upload result with success status and file details
 */
export async function uploadToStorage(
  filePath: string, 
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const client = getConvexClient();
    
    if (!client) {
      return {
        success: false,
        error: 'Convex client not available - check NEXT_PUBLIC_CONVEX_URL configuration'
      };
    }

    // Validate file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: `File not found: ${filePath}`
      };
    }

    // Get file information
    const fileStats = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = options.fileName || path.basename(filePath);
    const contentType = options.contentType || getContentType(filePath);

    console.log(`📁 Uploading ${fileName} (${(fileStats.size / 1024 / 1024).toFixed(2)}MB) to Convex storage...`);

    // Generate upload URL from Convex  
    const uploadUrl = await client.mutation(STORAGE_FUNCTIONS.generateUploadUrl);
    
    if (!uploadUrl) {
      return {
        success: false,
        error: 'Failed to generate upload URL from Convex'
      };
    }

    // Upload file to Convex storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStats.size.toString(),
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return {
        success: false,
        error: `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`
      };
    }

    // Get the storage ID from the response
    const uploadResult = await uploadResponse.json();
    const storageId = uploadResult.storageId;

    if (!storageId) {
      return {
        success: false,
        error: 'Upload succeeded but no storage ID returned'
      };
    }

    // Get the public URL for the uploaded file
    const fileUrl = await client.query(STORAGE_FUNCTIONS.getFileUrl, { storageId });

    console.log(`✅ File uploaded successfully: ${fileName}`);
    console.log(`📄 Storage ID: ${storageId}`);
    console.log(`🔗 File URL: ${fileUrl}`);

    return {
      success: true,
      storageId,
      fileUrl,
      fileName,
      fileSize: fileStats.size,
    };

  } catch (error) {
    console.error('❌ File upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
}

/**
 * Upload multiple files in batch with optional concurrency control
 */
export async function uploadMultipleFiles(
  filePaths: string[], 
  options: UploadOptions = {},
  concurrency: number = 3
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  console.log(`📁 Uploading ${filePaths.length} files with concurrency ${concurrency}...`);

  // Process files in chunks for controlled concurrency
  for (let i = 0; i < filePaths.length; i += concurrency) {
    const chunk = filePaths.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(filePath => uploadToStorage(filePath, options))
    );
    results.push(...chunkResults);

    // Add small delay between chunks to avoid overwhelming the server
    if (i + concurrency < filePaths.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  console.log(`✅ Batch upload complete: ${successful} successful, ${failed} failed`);
  
  return results;
}

/**
 * Get file URL from storage ID
 */
export async function getFileUrl(storageId: string): Promise<string | null> {
  try {
    const client = getConvexClient();
    
    if (!client) {
      console.warn('⚠️ Convex client not available');
      return null;
    }

    const fileUrl = await client.query(STORAGE_FUNCTIONS.getFileUrl, { storageId });
    return fileUrl;

  } catch (error) {
    console.error('❌ Failed to get file URL:', error);
    return null;
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(storageId: string): Promise<boolean> {
  try {
    const client = getConvexClient();
    
    if (!client) {
      console.warn('⚠️ Convex client not available');
      return false;
    }

    await client.mutation(STORAGE_FUNCTIONS.deleteFile, { storageId });
    console.log(`🗑️ File deleted: ${storageId}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to delete file:', error);
    return false;
  }
}

/**
 * Get content type based on file extension
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

/**
 * Validate file before upload
 */
export function validateFileForUpload(filePath: string, maxSizeMB: number = 50): { valid: boolean; error?: string } {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: `File not found: ${filePath}` };
    }

    const stats = fs.statSync(filePath);
    const sizeMB = stats.size / 1024 / 1024;

    if (sizeMB > maxSizeMB) {
      return { valid: false, error: `File too large: ${sizeMB.toFixed(2)}MB (max: ${maxSizeMB}MB)` };
    }

    return { valid: true };

  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'File validation error' 
    };
  }
}

/**
 * Get upload statistics
 */
export interface UploadStats {
  successful: number;
  failed: number;
  totalSize: number;
  avgSizeMB: number;
}

export function getUploadStats(results: UploadResult[]): UploadStats {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalSize = successful.reduce((sum, r) => sum + (r.fileSize || 0), 0);
  const avgSizeMB = successful.length > 0 ? (totalSize / 1024 / 1024) / successful.length : 0;

  return {
    successful: successful.length,
    failed: failed.length,
    totalSize,
    avgSizeMB,
  };
}