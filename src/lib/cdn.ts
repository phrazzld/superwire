/**
 * CDN integration for serving audio files through Cloudflare CDN
 * 
 * Provides URL transformation from storage providers (Firebase/Convex) to CDN endpoints,
 * cache control configuration, and fallback mechanisms for high availability.
 * 
 * Architecture:
 * - Cloudflare CDN for audio files (primary)
 * - Vercel Edge Network for static assets
 * - Direct storage URLs as fallback
 */

import { EnhancedError, ErrorCategory, retryWithBackoff, RetryOptions } from './error-handler';

/**
 * CDN provider types
 */
export enum CDNProvider {
  CLOUDFLARE = 'cloudflare',
  VERCEL = 'vercel',
  DIRECT = 'direct' // Fallback to direct storage URLs
}

/**
 * Storage provider types
 */
export enum StorageProvider {
  FIREBASE = 'firebase',
  CONVEX = 'convex',
  VERCEL_BLOB = 'vercel_blob'
}

/**
 * CDN configuration interface
 */
export interface CDNConfig {
  provider: CDNProvider;
  domain?: string;
  cacheControl?: string;
  enabled: boolean;
  fallbackToDirectUrl: boolean;
  customHeaders?: Record<string, string>;
}

/**
 * Cache control strategies
 */
export const CacheStrategies = {
  // Audio files - long cache with revalidation
  AUDIO: 'public, max-age=86400, stale-while-revalidate=604800', // 1 day, stale ok for 7 days
  
  // Dynamic content - short cache
  DYNAMIC: 'public, max-age=300, stale-while-revalidate=600', // 5 min, stale ok for 10 min
  
  // Static assets - immutable long cache
  STATIC: 'public, max-age=31536000, immutable', // 1 year immutable
  
  // No cache
  NO_CACHE: 'no-cache, no-store, must-revalidate'
} as const;

/**
 * Default CDN configuration
 */
const defaultConfig: CDNConfig = {
  provider: CDNProvider.CLOUDFLARE,
  domain: process.env.CLOUDFLARE_CDN_DOMAIN,
  cacheControl: CacheStrategies.AUDIO,
  enabled: !!process.env.CLOUDFLARE_CDN_DOMAIN,
  fallbackToDirectUrl: true,
  customHeaders: {
    'CDN-Cache-Control': CacheStrategies.AUDIO,
    'X-Content-Type-Options': 'nosniff'
  }
};

/**
 * CDN service class for URL transformation and management
 */
export class CDNService {
  private config: CDNConfig;
  private healthCheckCache: Map<string, { status: boolean; timestamp: number }> = new Map();
  private readonly HEALTH_CHECK_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<CDNConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Transform a storage URL to CDN URL
   */
  async transformUrl(
    storageUrl: string,
    options: {
      storageProvider?: StorageProvider;
      fileType?: 'audio' | 'image' | 'document';
      forceDirectUrl?: boolean;
    } = {}
  ): Promise<string> {
    // If CDN is disabled or force direct URL, return original
    if (!this.config.enabled || options.forceDirectUrl) {
      return storageUrl;
    }

    // Check CDN health
    const isHealthy = await this.checkCDNHealth();
    if (!isHealthy && this.config.fallbackToDirectUrl) {
      console.warn('[CDN] CDN health check failed, falling back to direct URL');
      return storageUrl;
    }

    try {
      // Parse the storage URL
      const url = new URL(storageUrl);
      
      // Transform based on CDN provider
      switch (this.config.provider) {
        case CDNProvider.CLOUDFLARE:
          return this.transformToCloudflare(url, options.fileType);
        
        case CDNProvider.VERCEL:
          return this.transformToVercel(url, options.fileType);
        
        case CDNProvider.DIRECT:
        default:
          return storageUrl;
      }
    } catch (error) {
      console.error('[CDN] URL transformation failed:', error);
      
      if (this.config.fallbackToDirectUrl) {
        return storageUrl;
      }
      
      throw new EnhancedError(
        `Failed to transform URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.VALIDATION,
        { originalUrl: storageUrl, error }
      );
    }
  }

  /**
   * Transform URL to Cloudflare CDN format
   */
  private transformToCloudflare(url: URL, fileType?: string): string {
    if (!this.config.domain) {
      throw new Error('Cloudflare CDN domain not configured');
    }

    // Extract path from Firebase Storage URL
    // Pattern: firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded-path}
    if (url.hostname.includes('firebasestorage.googleapis.com')) {
      const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
      if (pathMatch) {
        const encodedPath = pathMatch[1];
        const decodedPath = decodeURIComponent(encodedPath);
        return `https://${this.config.domain}/${decodedPath}`;
      }
    }

    // Extract path from Convex Storage URL
    // Pattern: {convex-domain}/api/storage/{storage-id}
    if (url.pathname.includes('/api/storage/')) {
      const storageId = url.pathname.split('/api/storage/')[1];
      return `https://${this.config.domain}/convex/${storageId}`;
    }

    // Default: use pathname
    return `https://${this.config.domain}${url.pathname}`;
  }

  /**
   * Transform URL to Vercel Edge Network format
   */
  private transformToVercel(url: URL, fileType?: string): string {
    // Vercel Edge Network handles static assets automatically
    // This is mainly for custom routing rules
    
    // For audio files, use dedicated audio subdomain if configured
    if (fileType === 'audio' && process.env.VERCEL_AUDIO_DOMAIN) {
      const path = url.pathname.replace(/^\//, '');
      return `https://${process.env.VERCEL_AUDIO_DOMAIN}/${path}`;
    }

    // Return original URL (Vercel handles CDN automatically)
    return url.toString();
  }

  /**
   * Check CDN health status
   */
  private async checkCDNHealth(): Promise<boolean> {
    const cacheKey = `${this.config.provider}-${this.config.domain}`;
    
    // Check cache
    const cached = this.healthCheckCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.HEALTH_CHECK_TTL) {
      return cached.status;
    }

    try {
      // Perform health check based on provider
      const isHealthy = await this.performHealthCheck();
      
      // Cache result
      this.healthCheckCache.set(cacheKey, {
        status: isHealthy,
        timestamp: Date.now()
      });

      return isHealthy;
    } catch (error) {
      console.error('[CDN] Health check failed:', error);
      
      // Cache failure
      this.healthCheckCache.set(cacheKey, {
        status: false,
        timestamp: Date.now()
      });

      return false;
    }
  }

  /**
   * Perform actual health check
   */
  private async performHealthCheck(): Promise<boolean> {
    if (!this.config.domain) {
      return false;
    }

    const healthCheckUrl = `https://${this.config.domain}/health`;
    
    const options: RetryOptions = {
      maxAttempts: 2,
      delays: [1000, 2000],
      timeout: 3000
    };

    const result = await retryWithBackoff(
      async () => {
        const response = await fetch(healthCheckUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000)
        });
        return response.ok;
      },
      options
    );

    return result.success && (result.data ?? false);
  }

  /**
   * Generate cache headers for a response
   */
  getCacheHeaders(fileType?: 'audio' | 'image' | 'document'): Record<string, string> {
    const headers: Record<string, string> = {};

    // Set cache control based on file type
    switch (fileType) {
      case 'audio':
        headers['Cache-Control'] = CacheStrategies.AUDIO;
        headers['Content-Type'] = 'audio/mpeg';
        break;
      
      case 'image':
        headers['Cache-Control'] = CacheStrategies.STATIC;
        break;
      
      case 'document':
        headers['Cache-Control'] = CacheStrategies.DYNAMIC;
        break;
      
      default:
        headers['Cache-Control'] = this.config.cacheControl || CacheStrategies.DYNAMIC;
    }

    // Add custom headers
    if (this.config.customHeaders) {
      Object.assign(headers, this.config.customHeaders);
    }

    // Add security headers
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['X-Frame-Options'] = 'DENY';

    return headers;
  }

  /**
   * Purge CDN cache for a specific URL or pattern
   */
  async purgeCache(urlOrPattern: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      switch (this.config.provider) {
        case CDNProvider.CLOUDFLARE:
          return await this.purgeCloudflareCache(urlOrPattern);
        
        case CDNProvider.VERCEL:
          // Vercel handles cache invalidation automatically on deployment
          console.log('[CDN] Vercel cache invalidation happens on deployment');
          return true;
        
        default:
          return false;
      }
    } catch (error) {
      console.error('[CDN] Cache purge failed:', error);
      return false;
    }
  }

  /**
   * Purge Cloudflare cache
   */
  private async purgeCloudflareCache(urlOrPattern: string): Promise<boolean> {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;

    if (!apiToken || !zoneId) {
      console.warn('[CDN] Cloudflare API credentials not configured');
      return false;
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: [urlOrPattern]
        })
      }
    );

    const result = await response.json();
    return result.success === true;
  }

  /**
   * Update CDN configuration
   */
  updateConfig(config: Partial<CDNConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Clear health check cache when config changes
    this.healthCheckCache.clear();
  }

  /**
   * Get current configuration
   */
  getConfig(): CDNConfig {
    return { ...this.config };
  }

  /**
   * Check if CDN is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.config.domain;
  }
}

/**
 * Singleton CDN service instance
 */
export const cdn = new CDNService();

/**
 * Helper function to get CDN URL for audio files
 */
export async function getCDNAudioUrl(storageUrl: string): Promise<string> {
  return cdn.transformUrl(storageUrl, {
    fileType: 'audio',
    storageProvider: StorageProvider.FIREBASE
  });
}

/**
 * Helper function to get CDN URL with fallback
 */
export async function getCDNUrlWithFallback(
  storageUrl: string,
  options?: {
    fileType?: 'audio' | 'image' | 'document';
    storageProvider?: StorageProvider;
  }
): Promise<string> {
  try {
    return await cdn.transformUrl(storageUrl, options);
  } catch (error) {
    console.error('[CDN] Failed to get CDN URL, using direct URL:', error);
    return storageUrl;
  }
}

/**
 * Express/Next.js middleware to set cache headers
 */
export function cdnCacheMiddleware(fileType?: 'audio' | 'image' | 'document') {
  return (_req: any, res: any, next: any) => {
    const headers = cdn.getCacheHeaders(fileType);
    
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    next();
  };
}