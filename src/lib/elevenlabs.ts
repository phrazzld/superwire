/**
 * ElevenLabs Text-to-Speech Integration
 * Handles voice synthesis, cost estimation, and tracking
 */

// Conditionally import fs and path only in Node.js environment
const fs = typeof window === 'undefined' ? require('fs') : null;
const path = typeof window === 'undefined' ? require('path') : null;
import crypto from 'crypto';

// ElevenLabs API Configuration
export const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
export const ELEVENLABS_COST_PER_CHARACTER = 0.00018; // $0.00018 per character

/**
 * Audio cost tracking entry for ElevenLabs usage
 */
export interface AudioCostEntry {
  timestamp: string;
  voiceId: string;
  voiceName?: string;
  characterCount: number;
  cost: number;
  taskType?: string;
  textPreview?: string; // First 100 chars for debugging
  duration?: string; // Estimated speaking duration
}

/**
 * Audio cost tracking structure
 */
export interface AudioCostTracking {
  entries: AudioCostEntry[];
  dailyTotals: { [date: string]: number };
  voiceTotals: { [voiceId: string]: number };
  taskTypeTotals: { [taskType: string]: number };
  grandTotal: number;
}

/**
 * Voice configuration for ElevenLabs
 */
export interface VoiceConfig {
  voiceId: string;
  name: string;
  description: string;
  stability: number;
  similarityBoost: number;
}

/**
 * Default voice configurations with optimal 2025 podcast settings
 * Updated for eleven_multilingual_v2 model with natural delivery
 */
export const VOICE_CONFIGS: { [key: string]: VoiceConfig } = {
  adam: {
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    description: 'Primary host - serious, analytical tone',
    stability: 0.4,
    similarityBoost: 0.75
  },
  dallas: {
    voiceId: 'AZnzlk1XvdvUeBnXmlld', 
    name: 'Dallas',
    description: 'Co-host - empathetic, human-interest focus',
    stability: 0.4,
    similarityBoost: 0.75
  },
  jordan: {
    voiceId: 'VR6AewLTigWG4xSOukaG',
    name: 'Jordan', 
    description: 'Dynamic host - energetic, culture/human rights focus',
    stability: 0.4,
    similarityBoost: 0.75
  }
};

/**
 * Estimate cost for text-to-speech conversion
 * @param text - Text to convert to speech
 * @returns Cost in USD for ElevenLabs conversion
 */
export function estimateAudioCost(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  const characterCount = text.length;
  return characterCount * ELEVENLABS_COST_PER_CHARACTER;
}

/**
 * Estimate character count and cost for multiple text segments
 * @param texts - Array of text segments
 * @returns Object with total characters, cost, and breakdown
 */
export function estimateBatchAudioCost(texts: string[]): {
  totalCharacters: number;
  totalCost: number;
  segments: Array<{ characters: number; cost: number; preview: string }>;
} {
  const segments = texts.map(text => ({
    characters: text.length,
    cost: estimateAudioCost(text),
    preview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
  }));

  const totalCharacters = segments.reduce((sum, seg) => sum + seg.characters, 0);
  const totalCost = segments.reduce((sum, seg) => sum + seg.cost, 0);

  return {
    totalCharacters,
    totalCost,
    segments
  };
}

/**
 * Track audio generation usage and costs
 * @param voiceId - ElevenLabs voice ID used
 * @param characterCount - Number of characters processed
 * @param options - Additional tracking options
 */
export async function trackAudioUsage(
  voiceId: string,
  characterCount: number,
  options: {
    taskType?: string;
    textPreview?: string;
    duration?: string;
    costsFilePath?: string;
  } = {}
): Promise<void> {
  const {
    taskType = 'audio_generation',
    textPreview,
    duration,
    costsFilePath = 'costs.json'
  } = options;

  const cost = characterCount * ELEVENLABS_COST_PER_CHARACTER;
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];

  // Find voice name from config
  const voiceConfig = Object.values(VOICE_CONFIGS).find(v => v.voiceId === voiceId);
  const voiceName = voiceConfig?.name || voiceId;

  // Create audio cost entry
  const audioEntry: AudioCostEntry = {
    timestamp,
    voiceId,
    voiceName,
    characterCount,
    cost,
    taskType,
    textPreview: textPreview?.substring(0, 100),
    duration
  };

  // Skip cost tracking if not in Node.js environment
  if (!fs || !path) {
    return;
  }

  try {
    // Read existing costs file or create structure
    const costsPath = path.resolve(process.cwd(), costsFilePath);
    let costsData: any = { entries: [], dailyTotals: {}, modelTotals: {}, taskTypeTotals: {}, grandTotal: 0 };

    if (fs.existsSync(costsPath)) {
      const fileContent = fs.readFileSync(costsPath, 'utf8');
      costsData = JSON.parse(fileContent);
    }

    // Initialize audio costs section if it doesn't exist
    if (!costsData.audioCosts) {
      costsData.audioCosts = {
        entries: [],
        dailyTotals: {},
        voiceTotals: {},
        taskTypeTotals: {},
        grandTotal: 0
      };
    }

    const audioCosts = costsData.audioCosts as AudioCostTracking;

    // Add new entry
    audioCosts.entries.push(audioEntry);

    // Update totals
    audioCosts.dailyTotals[date] = (audioCosts.dailyTotals[date] || 0) + cost;
    audioCosts.voiceTotals[voiceId] = (audioCosts.voiceTotals[voiceId] || 0) + cost;
    audioCosts.taskTypeTotals[taskType] = (audioCosts.taskTypeTotals[taskType] || 0) + cost;
    audioCosts.grandTotal += cost;

    // Update overall grand total
    costsData.grandTotal = (costsData.grandTotal || 0) + cost;

    // Write updated costs back to file
    fs.writeFileSync(costsPath, JSON.stringify(costsData, null, 2));

    // Log cost warning if daily audio costs exceed threshold
    const dailyAudioTotal = audioCosts.dailyTotals[date];
    if (dailyAudioTotal > 1.0) { // Warn if daily audio costs exceed $1
      console.warn(`⚠️ Daily audio costs: $${dailyAudioTotal.toFixed(4)} (${characterCount} characters)`);
    }

  } catch (error) {
    console.error('Failed to track audio usage:', error);
  }
}

/**
 * Get audio cost summary for analysis
 * @param costsFilePath - Path to costs.json file
 * @returns Audio cost summary and analysis
 */
export function getAudioCostSummary(costsFilePath: string = 'costs.json'): {
  todaysAudioCosts: number;
  totalAudioCosts: number;
  voiceBreakdown: { [voiceId: string]: number };
  averageCostPerRequest: number;
  totalCharactersProcessed: number;
} {
  // Return empty summary if not in Node.js environment
  if (!fs || !path) {
    return {
      todaysAudioCosts: 0,
      totalAudioCosts: 0,
      voiceBreakdown: {},
      averageCostPerRequest: 0,
      totalCharactersProcessed: 0
    };
  }

  try {
    const costsPath = path.resolve(process.cwd(), costsFilePath);
    if (!fs.existsSync(costsPath)) {
      return {
        todaysAudioCosts: 0,
        totalAudioCosts: 0,
        voiceBreakdown: {},
        averageCostPerRequest: 0,
        totalCharactersProcessed: 0
      };
    }

    const costsData = JSON.parse(fs.readFileSync(costsPath, 'utf8'));
    const audioCosts = costsData.audioCosts as AudioCostTracking;

    if (!audioCosts) {
      return {
        todaysAudioCosts: 0,
        totalAudioCosts: 0,
        voiceBreakdown: {},
        averageCostPerRequest: 0,
        totalCharactersProcessed: 0
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const todaysAudioCosts = audioCosts.dailyTotals[today] || 0;
    
    const totalCharactersProcessed = audioCosts.entries.reduce(
      (sum, entry) => sum + entry.characterCount, 0
    );

    const averageCostPerRequest = audioCosts.entries.length > 0 
      ? audioCosts.grandTotal / audioCosts.entries.length 
      : 0;

    return {
      todaysAudioCosts,
      totalAudioCosts: audioCosts.grandTotal,
      voiceBreakdown: audioCosts.voiceTotals,
      averageCostPerRequest,
      totalCharactersProcessed
    };

  } catch (error) {
    console.error('Failed to get audio cost summary:', error);
    return {
      todaysAudioCosts: 0,
      totalAudioCosts: 0,
      voiceBreakdown: {},
      averageCostPerRequest: 0,
      totalCharactersProcessed: 0
    };
  }
}

/**
 * Check if audio generation should be limited due to cost constraints
 * @param dailyLimit - Daily spending limit (default $2.00)
 * @returns Whether to limit audio generation
 */
export function shouldLimitAudioGeneration(dailyLimit: number = 2.0): boolean {
  const summary = getAudioCostSummary();
  return summary.todaysAudioCosts >= dailyLimit * 0.8; // Limit at 80% of budget
}

/**
 * Audio generation result interface
 */
export interface AudioGenerationResult {
  success: boolean;
  audioBuffer?: Buffer;
  cost: number;
  characterCount: number;
  voiceId: string;
  duration?: string;
  fromCache: boolean;
  error?: string;
  retryCount?: number;
}

/**
 * Audio generation options
 */
export interface AudioGenerationOptions {
  stability?: number;
  similarityBoost?: number;
  modelId?: string;
  style?: number;
  useSpeakerBoost?: boolean;
  enableCaching?: boolean;
  maxRetries?: number;
  taskType?: string;
}

/**
 * Generate audio segment using ElevenLabs TTS API
 * @param text - Text to convert to speech
 * @param voiceId - ElevenLabs voice ID
 * @param options - Generation options
 * @returns Audio generation result with buffer and metadata
 */
export async function generateAudioSegment(
  text: string,
  voiceId: string,
  options: AudioGenerationOptions = {}
): Promise<AudioGenerationResult> {
  const {
    stability = 0.4,
    similarityBoost = 0.75,
    modelId = 'eleven_multilingual_v2',
    style = 0.0,
    useSpeakerBoost = true,
    enableCaching = true,
    maxRetries = 3,
    taskType = 'audio_generation'
  } = options;

  // Input validation
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      success: false,
      cost: 0,
      characterCount: 0,
      voiceId,
      fromCache: false,
      error: 'Invalid or empty text provided'
    };
  }

  if (!voiceId || typeof voiceId !== 'string') {
    return {
      success: false,
      cost: 0,
      characterCount: text.length,
      voiceId: voiceId || '',
      fromCache: false,
      error: 'Invalid voice ID provided'
    };
  }

  // Check budget constraints
  if (shouldLimitAudioGeneration()) {
    return {
      success: false,
      cost: estimateAudioCost(text),
      characterCount: text.length,
      voiceId,
      fromCache: false,
      error: 'Daily audio generation budget limit reached'
    };
  }

  const characterCount = text.length;
  const estimatedCost = estimateAudioCost(text);

  try {
    // Check cache first if enabled
    if (enableCaching && audioCache.shouldCache(text)) {
      const cached = audioCache.getCachedAudio(text, voiceId, stability, similarityBoost);
      if (cached) {
        console.log(`🎵 Using cached audio for ${text.substring(0, 50)}...`);
        
        // Still track usage for cache hits (with zero cost)
        await trackAudioUsage(voiceId, characterCount, {
          taskType: `${taskType}_cached`,
          textPreview: text.substring(0, 100),
          duration: 'cached'
        });

        return {
          success: true,
          audioBuffer: cached.buffer,
          cost: 0, // Cache hits are free
          characterCount,
          voiceId,
          duration: 'cached',
          fromCache: true
        };
      }
    }

    // Get API key from environment
    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVEN_LABS_API_KEY environment variable not set');
    }

    // Prepare API request
    const endpoint = `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`;
    const requestBody = {
      text: text.trim(),
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: useSpeakerBoost
      }
    };

    const requestHeaders = {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    };

    // Implement retry logic following OpenRouter pattern
    const retryDelays = [1000, 2000, 4000]; // Exponential backoff
    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🎙️  Generating audio (attempt ${attempt + 1}/${maxRetries + 1}): ${text.substring(0, 50)}...`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'Unknown error');
          throw new Error(`ElevenLabs API error ${response.status}: ${errorBody}`);
        }

        // Get audio buffer
        const audioBuffer = Buffer.from(await response.arrayBuffer());

        // Validate audio quality
        const validation = validateAudio(audioBuffer, {
          minimumDuration: 0.1,
          requiredFormat: 'mp3'
        });

        if (!validation.isValid) {
          throw new Error(`Invalid audio generated: ${validation.issues.join(', ')}`);
        }

        // Track successful usage and cost
        const duration = validation.duration ? `${validation.duration.toFixed(1)}s` : undefined;
        await trackAudioUsage(voiceId, characterCount, {
          taskType,
          textPreview: text.substring(0, 100),
          duration
        });

        // Cache the result if caching is enabled and appropriate
        if (enableCaching && audioCache.shouldCache(text)) {
          const cacheResult = audioCache.cacheAudio(text, voiceId, audioBuffer, stability, similarityBoost);
          if (!cacheResult.success) {
            console.warn('Failed to cache audio:', cacheResult.error);
          }
        }

        console.log(`✅ Audio generated successfully: ${characterCount} chars, $${estimatedCost.toFixed(4)}, ${duration}`);

        return {
          success: true,
          audioBuffer,
          cost: estimatedCost,
          characterCount,
          voiceId,
          duration,
          fromCache: false,
          retryCount: attempt
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount = attempt;
        
        console.warn(`❌ Audio generation attempt ${attempt + 1} failed:`, lastError.message);

        // Don't retry on final attempt
        if (attempt < maxRetries) {
          const delay = retryDelays[Math.min(attempt, retryDelays.length - 1)];
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    const errorMessage = `Failed to generate audio after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`;
    console.error(`💥 ${errorMessage}`);

    return {
      success: false,
      cost: 0, // Don't charge for failed generations
      characterCount,
      voiceId,
      fromCache: false,
      error: errorMessage,
      retryCount
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('💥 Audio generation error:', errorMessage);

    return {
      success: false,
      cost: 0,
      characterCount,
      voiceId,
      fromCache: false,
      error: errorMessage
    };
  }
}

/**
 * Generate audio for multiple text segments in batch
 * @param segments - Array of {text, voiceId} segments
 * @param options - Generation options
 * @returns Array of audio generation results
 */
export async function generateAudioSegmentsBatch(
  segments: Array<{ text: string; voiceId: string; taskType?: string }>,
  options: AudioGenerationOptions = {}
): Promise<AudioGenerationResult[]> {
  console.log(`🎵 Starting batch audio generation for ${segments.length} segments`);
  
  const results: AudioGenerationResult[] = [];
  const batchCost = estimateBatchAudioCost(segments.map(s => s.text));
  
  console.log(`💰 Estimated batch cost: $${batchCost.totalCost.toFixed(4)} (${batchCost.totalCharacters} characters)`);

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    console.log(`🎙️  Processing segment ${i + 1}/${segments.length}`);
    
    const result = await generateAudioSegment(segment.text, segment.voiceId, {
      ...options,
      taskType: segment.taskType || options.taskType || `batch_segment_${i + 1}`
    });
    
    results.push(result);
    
    // Add small delay between requests to be respectful to API
    if (i < segments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const successful = results.filter(r => r.success).length;
  const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
  
  console.log(`✅ Batch complete: ${successful}/${segments.length} successful, $${totalCost.toFixed(4)} total cost`);
  
  return results;
}

/**
 * Audio validation result interface
 */
export interface AudioValidationResult {
  isValid: boolean;
  duration: number | null; // Duration in seconds
  format: string | null;
  sampleRate: number | null;
  channels: number | null;
  bitrate: number | null;
  issues: string[];
  warnings: string[];
  fileSize: number;
}

/**
 * Validate audio buffer for quality and format requirements
 * @param buffer - Audio buffer (MP3, WAV, etc.)
 * @param options - Validation options
 * @returns Validation result with detailed analysis
 */
export function validateAudio(
  buffer: Buffer,
  options: {
    minimumDuration?: number; // Minimum duration in seconds (default 1)
    maximumDuration?: number; // Maximum duration in seconds (default 300 = 5 minutes)
    requiredFormat?: string; // Required format (default 'mp3')
    minimumSampleRate?: number; // Minimum sample rate (default 22050)
    minimumChannels?: number; // Minimum channels (default 1)
  } = {}
): AudioValidationResult {
  const {
    minimumDuration = 1,
    maximumDuration = 300,
    requiredFormat = 'mp3',
    minimumSampleRate = 22050,
    minimumChannels = 1
  } = options;

  const result: AudioValidationResult = {
    isValid: false,
    duration: null,
    format: null,
    sampleRate: null,
    channels: null,
    bitrate: null,
    issues: [],
    warnings: [],
    fileSize: buffer.length
  };

  try {
    // Basic buffer validation
    if (!buffer || buffer.length === 0) {
      result.issues.push('Empty or null audio buffer');
      return result;
    }

    if (buffer.length < 1024) {
      result.issues.push('Audio buffer too small (< 1KB), likely corrupted');
      return result;
    }

    // Check file format by examining magic bytes
    const formatInfo = detectAudioFormat(buffer);
    result.format = formatInfo.format;
    
    if (!formatInfo.format) {
      result.issues.push('Unable to detect audio format');
      return result;
    }

    if (requiredFormat && formatInfo.format.toLowerCase() !== requiredFormat.toLowerCase()) {
      result.issues.push(`Expected ${requiredFormat} format, got ${formatInfo.format}`);
    }

    // Extract audio metadata
    const metadata = extractAudioMetadata(buffer, formatInfo.format);
    result.duration = metadata.duration;
    result.sampleRate = metadata.sampleRate;
    result.channels = metadata.channels;
    result.bitrate = metadata.bitrate;

    // Duration validation
    if (result.duration === null) {
      result.issues.push('Unable to determine audio duration');
    } else {
      if (result.duration < minimumDuration) {
        result.issues.push(`Duration too short: ${result.duration}s (minimum: ${minimumDuration}s)`);
      }
      
      if (result.duration > maximumDuration) {
        result.warnings.push(`Duration very long: ${result.duration}s (maximum: ${maximumDuration}s)`);
      }

      if (result.duration < 0.1) {
        result.issues.push('Audio duration impossibly short, likely corrupted');
      }
    }

    // Sample rate validation
    if (result.sampleRate && result.sampleRate < minimumSampleRate) {
      result.warnings.push(`Low sample rate: ${result.sampleRate}Hz (recommended: >${minimumSampleRate}Hz)`);
    }

    // Channel validation
    if (result.channels && result.channels < minimumChannels) {
      result.issues.push(`Insufficient channels: ${result.channels} (minimum: ${minimumChannels})`);
    }

    // File size validation
    const expectedMinSize = Math.max(1000, (result.duration || 1) * 1000); // ~1KB per second minimum
    if (buffer.length < expectedMinSize) {
      result.issues.push(`File size suspiciously small for duration: ${buffer.length} bytes`);
    }

    // Check for corruption indicators
    const corruptionCheck = checkAudioCorruption(buffer, formatInfo.format);
    if (corruptionCheck.isCorrupted) {
      result.issues.push(`Potential corruption detected: ${corruptionCheck.reason}`);
    }

    // Determine overall validity
    result.isValid = result.issues.length === 0;

  } catch (error) {
    result.issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Detect audio format from buffer magic bytes
 * @param buffer - Audio buffer
 * @returns Format information
 */
function detectAudioFormat(buffer: Buffer): { format: string | null; confidence: number } {
  if (buffer.length < 12) {
    return { format: null, confidence: 0 };
  }

  // MP3 format detection
  if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) {
    return { format: 'mp3', confidence: 0.9 };
  }

  // Check for ID3 tag (common in MP3)
  if (buffer.subarray(0, 3).toString() === 'ID3') {
    return { format: 'mp3', confidence: 0.8 };
  }

  // WAV format detection
  if (buffer.subarray(0, 4).toString() === 'RIFF' && 
      buffer.subarray(8, 12).toString() === 'WAVE') {
    return { format: 'wav', confidence: 1.0 };
  }

  // OGG format detection
  if (buffer.subarray(0, 4).toString() === 'OggS') {
    return { format: 'ogg', confidence: 1.0 };
  }

  // M4A/AAC format detection
  if (buffer.subarray(4, 8).toString() === 'ftyp') {
    return { format: 'm4a', confidence: 0.9 };
  }

  return { format: null, confidence: 0 };
}

/**
 * Extract basic audio metadata from buffer
 * @param buffer - Audio buffer
 * @param format - Detected format
 * @returns Audio metadata
 */
function extractAudioMetadata(buffer: Buffer, format: string): {
  duration: number | null;
  sampleRate: number | null;
  channels: number | null;
  bitrate: number | null;
} {
  const metadata = {
    duration: null as number | null,
    sampleRate: null as number | null,
    channels: null as number | null,
    bitrate: null as number | null
  };

  try {
    if (format === 'mp3') {
      // Basic MP3 frame analysis for metadata
      const frameInfo = parseMp3Frame(buffer);
      if (frameInfo) {
        metadata.sampleRate = frameInfo.sampleRate;
        metadata.channels = frameInfo.channels;
        metadata.bitrate = frameInfo.bitrate;
        
        // Estimate duration based on file size and bitrate
        if (frameInfo.bitrate > 0) {
          metadata.duration = (buffer.length * 8) / (frameInfo.bitrate * 1000);
        }
      }
    } else if (format === 'wav') {
      // Parse WAV header for metadata
      const wavInfo = parseWavHeader(buffer);
      if (wavInfo) {
        metadata.sampleRate = wavInfo.sampleRate;
        metadata.channels = wavInfo.channels;
        metadata.bitrate = wavInfo.bitrate;
        metadata.duration = wavInfo.duration;
      }
    }
  } catch (error) {
    // If parsing fails, return null values
    console.warn('Failed to extract audio metadata:', error);
  }

  return metadata;
}

/**
 * Check for audio corruption indicators
 * @param buffer - Audio buffer
 * @param format - Audio format
 * @returns Corruption check result
 */
function checkAudioCorruption(buffer: Buffer, format: string): {
  isCorrupted: boolean;
  reason: string | null;
} {
  // Check for completely null buffer
  if (buffer.every(byte => byte === 0)) {
    return { isCorrupted: true, reason: 'Buffer contains only null bytes' };
  }

  // Check for repeated pattern (potential corruption)
  const pattern = buffer.subarray(0, 4);
  let repeatedCount = 0;
  for (let i = 0; i < Math.min(buffer.length - 4, 1000); i += 4) {
    if (buffer.subarray(i, i + 4).equals(pattern as any)) {
      repeatedCount++;
    }
  }

  if (repeatedCount > 100) {
    return { isCorrupted: true, reason: 'Repeated byte patterns detected' };
  }

  // Check for incomplete file (truncated)
  if (format === 'mp3' && buffer.length > 128) {
    // Check if file ends abruptly (no proper MP3 ending)
    const endBytes = buffer.subarray(-10);
    if (endBytes.every(byte => byte === 0xFF || byte === 0x00)) {
      return { isCorrupted: true, reason: 'Incomplete file (improper ending)' };
    }
  }

  return { isCorrupted: false, reason: null };
}

/**
 * Parse MP3 frame header for basic metadata
 * @param buffer - MP3 buffer
 * @returns MP3 frame information or null
 */
function parseMp3Frame(buffer: Buffer): {
  sampleRate: number;
  channels: number;
  bitrate: number;
} | null {
  try {
    // Find first MP3 frame
    for (let i = 0; i < Math.min(buffer.length - 4, 1000); i++) {
      if (buffer[i] === 0xFF && (buffer[i + 1] & 0xE0) === 0xE0) {
        const header = buffer.readUInt32BE(i);
        
        // Extract information from MP3 header
        const version = (header >> 19) & 0x3;
        const layer = (header >> 17) & 0x3;
        const bitrateIndex = (header >> 12) & 0xF;
        const sampleRateIndex = (header >> 10) & 0x3;
        const channelMode = (header >> 6) & 0x3;

        // Sample rate lookup table for MPEG-1
        const sampleRates = [44100, 48000, 32000];
        const sampleRate = version === 3 ? sampleRates[sampleRateIndex] : sampleRates[sampleRateIndex] / 2;

        // Bitrate lookup table for MPEG-1 Layer III
        const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
        const bitrate = bitrates[bitrateIndex];

        const channels = channelMode === 3 ? 1 : 2;

        if (sampleRate > 0 && bitrate > 0) {
          return { sampleRate, channels, bitrate };
        }
      }
    }
  } catch (error) {
    // Ignore parsing errors
  }

  return null;
}

/**
 * Parse WAV header for metadata
 * @param buffer - WAV buffer
 * @returns WAV metadata or null
 */
function parseWavHeader(buffer: Buffer): {
  sampleRate: number;
  channels: number;
  bitrate: number;
  duration: number;
} | null {
  try {
    if (buffer.length < 44) return null;

    // Check WAV header
    if (buffer.subarray(0, 4).toString() !== 'RIFF' || 
        buffer.subarray(8, 12).toString() !== 'WAVE') {
      return null;
    }

    const channels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const byteRate = buffer.readUInt32LE(28);
    const bitsPerSample = buffer.readUInt16LE(34);

    const bitrate = (byteRate * 8) / 1000; // Convert to kbps
    const duration = (buffer.length - 44) / byteRate;

    return { sampleRate, channels, bitrate, duration };
  } catch (error) {
    return null;
  }
}

// Audio Cache Configuration
export const AUDIO_CACHE_DIR = 'tmp/audio_cache';
export const CACHE_MAX_AGE_HOURS = 24 * 7; // Cache for 1 week
export const CACHE_MAX_SIZE_MB = 100; // Maximum cache size in MB

/**
 * Audio cache entry metadata
 */
export interface AudioCacheEntry {
  filePath: string;
  textHash: string;
  voiceId: string;
  originalText: string;
  fileSize: number;
  createdAt: string;
  lastAccessed: string;
  hitCount: number;
  settings: {
    stability: number;
    similarityBoost: number;
  };
}

/**
 * Audio cache manager
 */
export class AudioCache {
  private cacheDir: string;
  private metadataPath: string;

  constructor(cacheDir: string = AUDIO_CACHE_DIR) {
    if (path) {
      this.cacheDir = path.resolve(process.cwd(), cacheDir);
      this.metadataPath = path.join(this.cacheDir, 'cache-metadata.json');
      this.ensureCacheDirectory();
    } else {
      this.cacheDir = '';
      this.metadataPath = '';
    }
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDirectory(): void {
    if (!fs || !path) return;
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch (error) {
      console.warn('Failed to create audio cache directory:', error);
    }
  }

  /**
   * Generate cache key for text and voice combination
   * @param text - Text to be synthesized
   * @param voiceId - ElevenLabs voice ID
   * @param stability - Voice stability setting
   * @param similarityBoost - Voice similarity boost setting
   * @returns Cache key hash
   */
  private generateCacheKey(
    text: string,
    voiceId: string,
    stability: number = 0.75,
    similarityBoost: number = 0.85
  ): string {
    const content = `${text}|${voiceId}|${stability}|${similarityBoost}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get cached audio if available
   * @param text - Text to synthesize
   * @param voiceId - ElevenLabs voice ID
   * @param stability - Voice stability setting
   * @param similarityBoost - Voice similarity boost setting
   * @returns Cached audio buffer or null if not found
   */
  getCachedAudio(
    text: string,
    voiceId: string,
    stability: number = 0.75,
    similarityBoost: number = 0.85
  ): { buffer: Buffer; entry: AudioCacheEntry } | null {
    try {
      const textHash = this.generateCacheKey(text, voiceId, stability, similarityBoost);
      const metadata = this.loadMetadata();
      
      const entry = metadata.entries.find(e => e.textHash === textHash);
      if (!entry) {
        return null;
      }

      // Check if file still exists
      if (!fs.existsSync(entry.filePath)) {
        // Remove stale entry
        this.removeCacheEntry(textHash);
        return null;
      }

      // Check if entry is too old
      const entryAge = Date.now() - new Date(entry.createdAt).getTime();
      if (entryAge > CACHE_MAX_AGE_HOURS * 60 * 60 * 1000) {
        this.removeCacheEntry(textHash);
        return null;
      }

      // Update access statistics
      entry.lastAccessed = new Date().toISOString();
      entry.hitCount++;
      this.saveMetadata(metadata);

      // Load and return audio buffer
      const buffer = fs.readFileSync(entry.filePath);
      return { buffer, entry };

    } catch (error) {
      console.warn('Failed to get cached audio:', error);
      return null;
    }
  }

  /**
   * Cache audio buffer
   * @param text - Original text
   * @param voiceId - ElevenLabs voice ID  
   * @param audioBuffer - Audio buffer to cache
   * @param stability - Voice stability setting
   * @param similarityBoost - Voice similarity boost setting
   * @returns Success status and cache entry
   */
  cacheAudio(
    text: string,
    voiceId: string,
    audioBuffer: Buffer,
    stability: number = 0.75,
    similarityBoost: number = 0.85
  ): { success: boolean; entry?: AudioCacheEntry; error?: string } {
    try {
      const textHash = this.generateCacheKey(text, voiceId, stability, similarityBoost);
      const fileName = `${textHash}.mp3`;
      const filePath = path.join(this.cacheDir, fileName);

      // Check cache size limits before adding
      const currentSize = this.getCacheSizeBytes();
      const newFileSize = audioBuffer.length;
      
      if ((currentSize + newFileSize) / (1024 * 1024) > CACHE_MAX_SIZE_MB) {
        // Clean old entries to make space
        this.cleanOldEntries();
        
        // Check again after cleaning
        const updatedSize = this.getCacheSizeBytes();
        if ((updatedSize + newFileSize) / (1024 * 1024) > CACHE_MAX_SIZE_MB) {
          return { 
            success: false, 
            error: `Cache size limit exceeded (${CACHE_MAX_SIZE_MB}MB)` 
          };
        }
      }

      // Save audio file
      fs.writeFileSync(filePath, audioBuffer);

      // Create cache entry
      const entry: AudioCacheEntry = {
        filePath,
        textHash,
        voiceId,
        originalText: text.length > 200 ? text.substring(0, 200) + '...' : text,
        fileSize: audioBuffer.length,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        hitCount: 0,
        settings: { stability, similarityBoost }
      };

      // Update metadata
      const metadata = this.loadMetadata();
      
      // Remove existing entry if it exists
      metadata.entries = metadata.entries.filter(e => e.textHash !== textHash);
      metadata.entries.push(entry);
      
      this.saveMetadata(metadata);

      return { success: true, entry };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if text is likely to benefit from caching
   * @param text - Text to analyze
   * @returns Whether text should be cached
   */
  shouldCache(text: string): boolean {
    // Cache standard intros/outros and repeated segments
    const lowerText = text.toLowerCase();
    
    // Common intro/outro patterns
    const cachablePatterns = [
      /welcome to.*superwire/i,
      /this is.*superwire/i,
      /thank you for listening/i,
      /that's all for today/i,
      /join us next time/i,
      /i'm.*and this is/i,
      /breaking news/i,
      /in today's episode/i
    ];

    // Cache short, repeated segments
    if (text.length < 500 && text.length > 20) {
      return true;
    }

    // Cache segments matching common patterns
    return cachablePatterns.some(pattern => pattern.test(lowerText));
  }

  /**
   * Get cache statistics
   * @returns Cache usage statistics
   */
  getCacheStats(): {
    totalEntries: number;
    totalSizeBytes: number;
    totalSizeMB: number;
    hitRate: number;
    oldestEntry: string | null;
    newestEntry: string | null;
  } {
    try {
      const metadata = this.loadMetadata();
      const totalSizeBytes = this.getCacheSizeBytes();
      
      const totalHits = metadata.entries.reduce((sum, entry) => sum + entry.hitCount, 0);
      const totalRequests = metadata.entries.length + totalHits;
      const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

      const sortedByDate = metadata.entries.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      return {
        totalEntries: metadata.entries.length,
        totalSizeBytes,
        totalSizeMB: totalSizeBytes / (1024 * 1024),
        hitRate: hitRate * 100, // Convert to percentage
        oldestEntry: sortedByDate.length > 0 ? sortedByDate[0].createdAt : null,
        newestEntry: sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1].createdAt : null
      };
    } catch (error) {
      return {
        totalEntries: 0,
        totalSizeBytes: 0,
        totalSizeMB: 0,
        hitRate: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
  }

  /**
   * Clean old cache entries to free space
   * @param targetReductionMB - Target reduction in MB (default 20MB)
   */
  cleanOldEntries(targetReductionMB: number = 20): void {
    try {
      const metadata = this.loadMetadata();
      
      // Sort by last accessed time (oldest first)
      const sortedEntries = metadata.entries.sort(
        (a, b) => new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime()
      );

      let cleanedSizeBytes = 0;
      const targetBytes = targetReductionMB * 1024 * 1024;

      for (const entry of sortedEntries) {
        if (cleanedSizeBytes >= targetBytes) break;

        try {
          if (fs.existsSync(entry.filePath)) {
            fs.unlinkSync(entry.filePath);
          }
          cleanedSizeBytes += entry.fileSize;
        } catch (error) {
          console.warn('Failed to delete cache file:', entry.filePath, error);
        }
      }

      // Remove deleted entries from metadata
      metadata.entries = metadata.entries.filter(entry => {
        return fs.existsSync(entry.filePath);
      });

      this.saveMetadata(metadata);
      console.log(`Cleaned ${cleanedSizeBytes / (1024 * 1024)}MB from audio cache`);

    } catch (error) {
      console.warn('Failed to clean cache entries:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    try {
      const metadata = this.loadMetadata();
      
      for (const entry of metadata.entries) {
        try {
          if (fs.existsSync(entry.filePath)) {
            fs.unlinkSync(entry.filePath);
          }
        } catch (error) {
          console.warn('Failed to delete cache file:', entry.filePath);
        }
      }

      // Reset metadata
      this.saveMetadata({ entries: [] });
      console.log('Audio cache cleared');

    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Load cache metadata
   */
  private loadMetadata(): { entries: AudioCacheEntry[] } {
    try {
      if (fs.existsSync(this.metadataPath)) {
        const content = fs.readFileSync(this.metadataPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to load cache metadata:', error);
    }
    
    return { entries: [] };
  }

  /**
   * Save cache metadata
   */
  private saveMetadata(metadata: { entries: AudioCacheEntry[] }): void {
    try {
      fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.warn('Failed to save cache metadata:', error);
    }
  }

  /**
   * Get total cache size in bytes
   */
  private getCacheSizeBytes(): number {
    try {
      const metadata = this.loadMetadata();
      return metadata.entries.reduce((total, entry) => {
        try {
          if (fs.existsSync(entry.filePath)) {
            const stats = fs.statSync(entry.filePath);
            return total + stats.size;
          }
        } catch (error) {
          // File might not exist
        }
        return total;
      }, 0);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Remove specific cache entry
   */
  private removeCacheEntry(textHash: string): void {
    try {
      const metadata = this.loadMetadata();
      const entryIndex = metadata.entries.findIndex(e => e.textHash === textHash);
      
      if (entryIndex >= 0) {
        const entry = metadata.entries[entryIndex];
        
        // Delete file
        if (fs.existsSync(entry.filePath)) {
          fs.unlinkSync(entry.filePath);
        }
        
        // Remove from metadata
        metadata.entries.splice(entryIndex, 1);
        this.saveMetadata(metadata);
      }
    } catch (error) {
      console.warn('Failed to remove cache entry:', error);
    }
  }
}

/**
 * Default audio cache instance
 */
export const audioCache = new AudioCache();