import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import {
  uploadEpisodeToBlob,
  listEpisodes,
  deleteEpisode,
  getEpisodeMetadata,
  getAllEpisodes,
  isBlobStorageConfigured,
  uploadEpisodesBatch,
  testBlobStorage,
  UploadResult,
  ListEpisodesResult,
  EpisodeMetadata
} from '../src/lib/vercel-blob';

// Mock the @vercel/blob module
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn(),
  list: jest.fn(),
  head: jest.fn(),
}));

const { put, del, list, head } = require('@vercel/blob');

describe('Vercel Blob Storage Operations', () => {
  const originalEnv = process.env;
  const mockBlobUrl = 'https://test.blob.vercel-storage.com/episodes/test-episode.mp3';
  const testBuffer = Buffer.from('test audio data');
  const testFilename = 'test-episode.mp3';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment to original state
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Configuration Validation', () => {
    it('should detect when Blob storage is not configured', () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      expect(isBlobStorageConfigured()).toBe(false);
    });

    it('should detect when Blob storage is configured', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token';
      expect(isBlobStorageConfigured()).toBe(true);
    });

    it('should reject invalid token format', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'invalid_token';
      expect(isBlobStorageConfigured()).toBe(false);
    });
  });

  describe('Upload Operations', () => {
    beforeEach(() => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token';
    });

    it('should upload an episode successfully', async () => {
      (put as jest.Mock).mockResolvedValueOnce({
        url: mockBlobUrl,
        pathname: `episodes/${testFilename}`,
        contentType: 'audio/mpeg',
        contentDisposition: 'inline'
      });

      const result = await uploadEpisodeToBlob(testBuffer, testFilename);

      expect(result.success).toBe(true);
      expect(result.url).toBe(mockBlobUrl);
      expect(result.size).toBe(testBuffer.length);
      expect(result.uploadedAt).toBeInstanceOf(Date);

      expect(put).toHaveBeenCalledWith(
        `episodes/${testFilename}`,
        testBuffer,
        expect.objectContaining({
          access: 'public',
          cacheControlMaxAge: 31536000,
          contentType: 'audio/mpeg',
          token: 'vercel_blob_rw_test_token'
        })
      );
    });

    it('should handle upload failures gracefully', async () => {
      (put as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await uploadEpisodeToBlob(testBuffer, testFilename);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(result.url).toBeUndefined();
    });

    it('should validate input buffer', async () => {
      const result = await uploadEpisodeToBlob(Buffer.alloc(0), testFilename);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid audio buffer');
      expect(put).not.toHaveBeenCalled();
    });

    it('should validate filename format', async () => {
      const result = await uploadEpisodeToBlob(testBuffer, 'invalid-file.txt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('must end with .mp3');
      expect(put).not.toHaveBeenCalled();
    });

    it('should handle missing configuration', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;

      const result = await uploadEpisodeToBlob(testBuffer, testFilename);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
      expect(put).not.toHaveBeenCalled();
    });

    it('should retry on failure with exponential backoff', async () => {
      // First two attempts fail, third succeeds
      (put as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ url: mockBlobUrl });

      const startTime = Date.now();
      const result = await uploadEpisodeToBlob(testBuffer, testFilename);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(put).toHaveBeenCalledTimes(3);
      // Should have delays of 1000ms and 2000ms between retries
      expect(duration).toBeGreaterThanOrEqual(3000);
    }, 10000);
  });

  describe('List Operations', () => {
    beforeEach(() => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token';
    });

    it('should list episodes successfully', async () => {
      const mockEpisodes = [
        {
          url: 'https://blob.vercel-storage.com/episodes/ep1.mp3',
          pathname: 'episodes/ep1.mp3',
          size: 1024,
          uploadedAt: new Date().toISOString()
        },
        {
          url: 'https://blob.vercel-storage.com/episodes/ep2.mp3',
          pathname: 'episodes/ep2.mp3',
          size: 2048,
          uploadedAt: new Date().toISOString()
        }
      ];

      (list as jest.Mock).mockResolvedValueOnce({
        blobs: mockEpisodes,
        hasMore: false,
        cursor: null
      });

      const result = await listEpisodes(100);

      expect(result.episodes).toHaveLength(2);
      expect(result.episodes[0].url).toBe(mockEpisodes[0].url);
      expect(result.hasMore).toBe(false);

      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({
          prefix: 'episodes/',
          limit: 100,
          token: 'vercel_blob_rw_test_token'
        })
      );
    });

    it('should handle pagination with cursor', async () => {
      (list as jest.Mock).mockResolvedValueOnce({
        blobs: [],
        hasMore: true,
        cursor: 'next-page-cursor'
      });

      const result = await listEpisodes(50, 'current-cursor');

      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBe('next-page-cursor');

      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: 'current-cursor'
        })
      );
    });

    it('should return empty list when storage is not configured', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;

      const result = await listEpisodes();

      expect(result.episodes).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(list).not.toHaveBeenCalled();
    });

    it('should sort episodes by upload date (newest first)', async () => {
      const oldDate = new Date('2024-01-01').toISOString();
      const newDate = new Date('2024-12-01').toISOString();

      (list as jest.Mock).mockResolvedValueOnce({
        blobs: [
          { url: 'url1', pathname: 'ep1', size: 1024, uploadedAt: oldDate },
          { url: 'url2', pathname: 'ep2', size: 2048, uploadedAt: newDate }
        ],
        hasMore: false
      });

      const result = await listEpisodes();

      expect(result.episodes[0].uploadedAt.getTime()).toBeGreaterThan(
        result.episodes[1].uploadedAt.getTime()
      );
    });
  });

  describe('Delete Operations', () => {
    beforeEach(() => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token';
    });

    it('should delete an episode successfully', async () => {
      (del as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await deleteEpisode(mockBlobUrl);

      expect(result).toBe(true);
      expect(del).toHaveBeenCalledWith(
        mockBlobUrl,
        expect.objectContaining({
          token: 'vercel_blob_rw_test_token'
        })
      );
    });

    it('should handle delete failures', async () => {
      (del as jest.Mock).mockRejectedValueOnce(new Error('Not found'));

      const result = await deleteEpisode(mockBlobUrl);

      expect(result).toBe(false);
    });

    it('should validate URL format', async () => {
      const result = await deleteEpisode('invalid-url');

      expect(result).toBe(false);
      expect(del).not.toHaveBeenCalled();
    });

    it('should handle missing configuration', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;

      const result = await deleteEpisode(mockBlobUrl);

      expect(result).toBe(false);
      expect(del).not.toHaveBeenCalled();
    });
  });

  describe('Metadata Operations', () => {
    beforeEach(() => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token';
    });

    it('should retrieve episode metadata successfully', async () => {
      const mockMetadata = {
        url: mockBlobUrl,
        size: 1024000,
        uploadedAt: new Date().toISOString(),
        contentType: 'audio/mpeg',
        cacheControl: 'public, max-age=31536000'
      };

      (head as jest.Mock).mockResolvedValueOnce(mockMetadata);

      const result = await getEpisodeMetadata(mockBlobUrl);

      expect(result).not.toBeNull();
      expect(result?.url).toBe(mockBlobUrl);
      expect(result?.size).toBe(mockMetadata.size);
      expect(result?.contentType).toBe('audio/mpeg');
      expect(result?.uploadedAt).toBeInstanceOf(Date);

      expect(head).toHaveBeenCalledWith(
        mockBlobUrl,
        expect.objectContaining({
          token: 'vercel_blob_rw_test_token'
        })
      );
    });

    it('should handle metadata retrieval failures', async () => {
      (head as jest.Mock).mockRejectedValueOnce(new Error('Not found'));

      const result = await getEpisodeMetadata(mockBlobUrl);

      expect(result).toBeNull();
    });

    it('should validate URL format', async () => {
      const result = await getEpisodeMetadata('invalid-url');

      expect(result).toBeNull();
      expect(head).not.toHaveBeenCalled();
    });
  });

  describe('Batch Operations', () => {
    beforeEach(() => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token';
    });

    it('should upload multiple episodes with concurrency control', async () => {
      const episodes = [
        { buffer: Buffer.from('audio1'), filename: 'ep1.mp3' },
        { buffer: Buffer.from('audio2'), filename: 'ep2.mp3' },
        { buffer: Buffer.from('audio3'), filename: 'ep3.mp3' },
        { buffer: Buffer.from('audio4'), filename: 'ep4.mp3' }
      ];

      (put as jest.Mock).mockResolvedValue({ url: mockBlobUrl });

      const results = await uploadEpisodesBatch(episodes, 2);

      expect(results).toHaveLength(4);
      expect(results.filter(r => r.success)).toHaveLength(4);
      
      // With concurrency of 2, should process in 2 batches
      // Total calls should be 4
      expect(put).toHaveBeenCalledTimes(4);
    });

    it('should handle partial batch failures', async () => {
      const episodes = [
        { buffer: Buffer.from('audio1'), filename: 'ep1.mp3' },
        { buffer: Buffer.from('audio2'), filename: 'ep2.mp3' }
      ];

      (put as jest.Mock)
        .mockResolvedValueOnce({ url: mockBlobUrl })
        .mockRejectedValueOnce(new Error('Upload failed'));

      const results = await uploadEpisodesBatch(episodes);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('Get All Episodes', () => {
    beforeEach(() => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token';
    });

    it('should retrieve all episodes across multiple pages', async () => {
      // First page
      (list as jest.Mock).mockResolvedValueOnce({
        blobs: [
          { url: 'url1', pathname: 'ep1', size: 1024, uploadedAt: new Date().toISOString() },
          { url: 'url2', pathname: 'ep2', size: 2048, uploadedAt: new Date().toISOString() }
        ],
        hasMore: true,
        cursor: 'page2'
      });

      // Second page
      (list as jest.Mock).mockResolvedValueOnce({
        blobs: [
          { url: 'url3', pathname: 'ep3', size: 3072, uploadedAt: new Date().toISOString() }
        ],
        hasMore: false
      });

      const episodes = await getAllEpisodes();

      expect(episodes).toHaveLength(3);
      expect(list).toHaveBeenCalledTimes(2);
    });
  });

  describe('Test Function', () => {
    it('should run comprehensive storage tests', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test_token';

      (list as jest.Mock).mockResolvedValueOnce({
        blobs: [
          {
            url: mockBlobUrl,
            pathname: 'episodes/test.mp3',
            size: 1024000,
            uploadedAt: new Date().toISOString()
          }
        ],
        hasMore: false
      });

      (head as jest.Mock).mockResolvedValueOnce({
        url: mockBlobUrl,
        size: 1024000,
        uploadedAt: new Date().toISOString(),
        contentType: 'audio/mpeg',
        cacheControl: 'public, max-age=31536000'
      });

      // Should not throw
      await expect(testBlobStorage()).resolves.not.toThrow();

      expect(list).toHaveBeenCalled();
      expect(head).toHaveBeenCalled();
    });

    it('should handle test function without configuration', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;

      // Should not throw, just log warnings
      await expect(testBlobStorage()).resolves.not.toThrow();

      expect(list).not.toHaveBeenCalled();
      expect(head).not.toHaveBeenCalled();
    });
  });
});