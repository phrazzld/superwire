/**
 * Audio Processing Utilities
 * Professional audio processing functions using FFmpeg for podcast production
 */

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

/**
 * Audio normalization result interface
 */
export interface AudioNormalizationResult {
  success: boolean;
  normalizedFile?: string;
  originalFile: string;
  originalLUFS?: number;
  normalizedLUFS?: number;
  duration?: number;
  error?: string;
  processingTime?: number;
  analysisData?: LoudnormAnalysisData;
}

/**
 * Loudnorm analysis data from FFmpeg first pass
 */
export interface LoudnormAnalysisData {
  input_i: string;    // Input integrated loudness
  input_tp: string;   // Input true peak
  input_lra: string;  // Input loudness range
  input_thresh: string; // Input threshold
  output_i: string;   // Output integrated loudness
  output_tp: string;  // Output true peak
  output_lra: string; // Output loudness range
  output_thresh: string; // Output threshold
  normalization_type: string; // dynamic or linear
  target_offset: string; // Offset from target
}

/**
 * Audio normalization options
 */
export interface AudioNormalizationOptions {
  targetLUFS?: number;      // Target integrated loudness (default: -16)
  truePeak?: number;        // True peak limit in dBTP (default: -1.5)
  loudnessRange?: number;   // Loudness range limit (default: 11)
  outputFormat?: string;    // Output format (default: 'mp3')
  outputBitrate?: string;   // Output bitrate (default: '128k')
  outputSampleRate?: number; // Output sample rate (default: 44100)
  tempDir?: string;         // Temporary directory (default: 'tmp/audio_processing')
  keepTempFiles?: boolean;  // Keep temporary files for debugging (default: false)
}

/**
 * Normalize audio file to -16 LUFS podcast standard using FFmpeg loudnorm
 * Uses professional two-pass process for accurate loudness normalization
 * 
 * @param inputFile - Path to input audio file
 * @param options - Normalization options
 * @returns Promise resolving to normalization result
 */
export async function normalizeAudio(
  inputFile: string,
  options: AudioNormalizationOptions = {}
): Promise<AudioNormalizationResult> {
  const startTime = Date.now();
  
  const {
    targetLUFS = -16,
    truePeak = -1.5,
    loudnessRange = 11,
    outputFormat = 'mp3',
    outputBitrate = '128k',
    outputSampleRate = 44100,
    tempDir = 'tmp/audio_processing',
    keepTempFiles = false
  } = options;

  // Input validation
  if (!inputFile || !fs.existsSync(inputFile)) {
    return {
      success: false,
      originalFile: inputFile,
      error: `Input file not found: ${inputFile}`
    };
  }

  // Ensure temp directory exists
  const tempDirPath = path.resolve(process.cwd(), tempDir);
  try {
    if (!fs.existsSync(tempDirPath)) {
      fs.mkdirSync(tempDirPath, { recursive: true });
    }
  } catch (error) {
    return {
      success: false,
      originalFile: inputFile,
      error: `Failed to create temp directory: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  // Generate output filename
  const inputExt = path.extname(inputFile);
  const inputBase = path.basename(inputFile, inputExt);
  const timestamp = Date.now();
  const outputFile = path.join(tempDirPath, `${inputBase}-normalized-${timestamp}.${outputFormat}`);

  console.log(`🎵 Starting audio normalization: ${inputFile}`);
  console.log(`📊 Target: ${targetLUFS} LUFS, TP: ${truePeak} dBTP, LRA: ${loudnessRange}`);

  try {
    // PASS 1: Analysis to get precise measurements
    console.log('🔍 Pass 1: Analyzing audio loudness...');
    const analysisData = await analyzeAudioLoudness(inputFile, targetLUFS, truePeak, loudnessRange);
    
    if (!analysisData) {
      throw new Error('Failed to analyze audio loudness');
    }

    console.log(`📋 Analysis complete: Input ${analysisData.input_i} LUFS → Target ${targetLUFS} LUFS`);

    // PASS 2: Apply normalization using measured values
    console.log('⚙️  Pass 2: Applying loudness normalization...');
    await applyAudioNormalization(
      inputFile,
      outputFile,
      analysisData,
      targetLUFS,
      truePeak,
      loudnessRange,
      outputBitrate,
      outputSampleRate,
      outputFormat
    );

    // Verify output file was created
    if (!fs.existsSync(outputFile)) {
      throw new Error('Normalized audio file was not created');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Audio normalization complete in ${processingTime}ms`);

    // Get file stats for duration
    const stats = fs.statSync(outputFile);
    
    const result: AudioNormalizationResult = {
      success: true,
      normalizedFile: outputFile,
      originalFile: inputFile,
      originalLUFS: parseFloat(analysisData.input_i),
      normalizedLUFS: parseFloat(analysisData.output_i),
      duration: undefined, // Would need additional analysis to get duration
      processingTime,
      analysisData
    };

    console.log(`📈 Normalized: ${result.originalLUFS?.toFixed(2)} → ${result.normalizedLUFS?.toFixed(2)} LUFS`);

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Audio normalization failed:', errorMessage);

    // Cleanup any partial files
    if (fs.existsSync(outputFile)) {
      try {
        fs.unlinkSync(outputFile);
      } catch (cleanupError) {
        console.warn('Failed to cleanup partial output file:', cleanupError);
      }
    }

    return {
      success: false,
      originalFile: inputFile,
      error: errorMessage,
      processingTime
    };
  }
}

/**
 * Perform loudnorm analysis pass to get precise measurements
 */
async function analyzeAudioLoudness(
  inputFile: string,
  targetLUFS: number,
  truePeak: number,
  loudnessRange: number
): Promise<LoudnormAnalysisData | null> {
  return new Promise((resolve, reject) => {
    let analysisOutput = '';
    
    ffmpeg(inputFile)
      .audioFilters([
        `loudnorm=I=${targetLUFS}:TP=${truePeak}:LRA=${loudnessRange}:print_format=json`
      ])
      .format('null')
      .output('-') // Null output - we only want the analysis
      .on('start', (commandLine) => {
        console.log('FFmpeg analysis command:', commandLine);
      })
      .on('stderr', (stderrLine) => {
        // Capture stderr where loudnorm JSON output appears
        analysisOutput += stderrLine + '\n';
      })
      .on('end', () => {
        try {
          // Extract JSON from the output
          const jsonMatch = analysisOutput.match(/\{[\s\S]*?\}/);
          if (jsonMatch) {
            const analysisData = JSON.parse(jsonMatch[0]) as LoudnormAnalysisData;
            resolve(analysisData);
          } else {
            console.error('No JSON analysis data found in output:', analysisOutput);
            reject(new Error('No analysis data found in FFmpeg output'));
          }
        } catch (parseError) {
          console.error('Failed to parse analysis JSON:', parseError);
          console.error('Raw output:', analysisOutput);
          reject(new Error('Failed to parse loudnorm analysis data'));
        }
      })
      .on('error', (err) => {
        console.error('FFmpeg analysis error:', err);
        reject(err);
      })
      .run();
  });
}

/**
 * Apply loudnorm normalization using analysis data
 */
async function applyAudioNormalization(
  inputFile: string,
  outputFile: string,
  analysisData: LoudnormAnalysisData,
  targetLUFS: number,
  truePeak: number,
  loudnessRange: number,
  outputBitrate: string,
  outputSampleRate: number,
  outputFormat: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Build loudnorm filter with measured values
    const loudnormFilter = `loudnorm=I=${targetLUFS}:TP=${truePeak}:LRA=${loudnessRange}:` +
      `measured_I=${analysisData.input_i}:measured_TP=${analysisData.input_tp}:` +
      `measured_LRA=${analysisData.input_lra}:measured_thresh=${analysisData.input_thresh}:` +
      `offset=${analysisData.target_offset}`;

    ffmpeg(inputFile)
      .audioFilters([loudnormFilter])
      .audioCodec(outputFormat === 'mp3' ? 'libmp3lame' : 'aac')
      .audioBitrate(outputBitrate)
      .audioFrequency(outputSampleRate)
      .format(outputFormat)
      .on('start', (commandLine) => {
        console.log('FFmpeg normalization command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`📊 Normalization progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('🎯 Normalization pass complete');
        resolve();
      })
      .on('error', (err) => {
        console.error('FFmpeg normalization error:', err);
        reject(err);
      })
      .save(outputFile);
  });
}

/**
 * Normalize multiple audio files in batch
 * Processes files sequentially to avoid overwhelming the system
 * 
 * @param inputFiles - Array of input file paths
 * @param options - Normalization options
 * @returns Promise resolving to array of normalization results
 */
export async function normalizeAudioBatch(
  inputFiles: string[],
  options: AudioNormalizationOptions = {}
): Promise<AudioNormalizationResult[]> {
  console.log(`🎵 Starting batch audio normalization for ${inputFiles.length} files`);
  
  const results: AudioNormalizationResult[] = [];
  
  for (let i = 0; i < inputFiles.length; i++) {
    const inputFile = inputFiles[i];
    console.log(`📁 Processing file ${i + 1}/${inputFiles.length}: ${path.basename(inputFile)}`);
    
    try {
      const result = await normalizeAudio(inputFile, options);
      results.push(result);
      
      // Add small delay between files to be gentle on system resources
      if (i < inputFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Failed to normalize ${inputFile}:`, error);
      results.push({
        success: false,
        originalFile: inputFile,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  const successful = results.filter(r => r.success).length;
  console.log(`✅ Batch normalization complete: ${successful}/${inputFiles.length} successful`);
  
  return results;
}

/**
 * Clean up temporary normalization files
 * 
 * @param tempDir - Temporary directory to clean (default: 'tmp/audio_processing')
 * @param maxAge - Maximum age of files to keep in hours (default: 24)
 */
export function cleanupNormalizationFiles(
  tempDir: string = 'tmp/audio_processing',
  maxAge: number = 24
): void {
  try {
    const tempDirPath = path.resolve(process.cwd(), tempDir);
    
    if (!fs.existsSync(tempDirPath)) {
      return; // Nothing to clean
    }
    
    const files = fs.readdirSync(tempDirPath);
    const cutoffTime = Date.now() - (maxAge * 60 * 60 * 1000);
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(tempDirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime.getTime() < cutoffTime) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    console.log(`🧹 Cleaned up ${deletedCount} temporary normalization files`);
  } catch (error) {
    console.warn('Failed to cleanup normalization files:', error);
  }
}

/**
 * Get recommended loudness targets for different podcast types
 */
export const LOUDNESS_TARGETS = {
  // Standard podcast (music + speech)
  PODCAST_STANDARD: { lufs: -16, truePeak: -1.5, lra: 11 },
  
  // Music-heavy podcast
  PODCAST_MUSIC: { lufs: -16, truePeak: -1.0, lra: 7 },
  
  // Speech-only podcast (higher compression)
  PODCAST_SPEECH: { lufs: -16, truePeak: -2.0, lra: 8 },
  
  // Broadcast standard
  BROADCAST: { lufs: -23, truePeak: -1.0, lra: 7 },
  
  // Streaming platform optimized
  STREAMING: { lufs: -14, truePeak: -1.0, lra: 11 }
} as const;

/**
 * Audio transition result interface
 */
export interface AudioTransitionResult {
  success: boolean;
  outputFile?: string;
  inputFiles: string[];
  crossfadeDuration: number;
  error?: string;
  processingTime?: number;
}

/**
 * Audio transition options
 */
export interface AudioTransitionOptions {
  crossfadeDuration?: number;  // Crossfade duration in seconds (default: 0.5)
  outputFormat?: string;       // Output format (default: 'mp3')
  outputBitrate?: string;      // Output bitrate (default: '128k')
  outputSampleRate?: number;   // Output sample rate (default: 44100)
  tempDir?: string;           // Temporary directory (default: 'tmp/audio_processing')
  keepTempFiles?: boolean;    // Keep temporary files for debugging (default: false)
}

/**
 * Create smooth crossfade transitions between audio segments
 * Uses FFmpeg acrossfade filter to blend segments with 500ms crossfades
 * 
 * @param inputFiles - Array of audio file paths to transition between
 * @param options - Transition options
 * @returns Promise resolving to transition result
 */
export async function addTransitions(
  inputFiles: string[],
  options: AudioTransitionOptions = {}
): Promise<AudioTransitionResult> {
  const startTime = Date.now();
  
  const {
    crossfadeDuration = 0.5,  // 500ms default
    outputFormat = 'mp3',
    outputBitrate = '128k',
    outputSampleRate = 44100,
    tempDir = 'tmp/audio_processing',
    keepTempFiles = false
  } = options;

  // Input validation
  if (!inputFiles || inputFiles.length < 2) {
    return {
      success: false,
      inputFiles: inputFiles || [],
      crossfadeDuration,
      error: 'At least 2 input files required for crossfade transitions'
    };
  }

  // Verify all input files exist
  for (const file of inputFiles) {
    if (!fs.existsSync(file)) {
      return {
        success: false,
        inputFiles,
        crossfadeDuration,
        error: `Input file not found: ${file}`
      };
    }
  }

  // Ensure temp directory exists
  const tempDirPath = path.resolve(process.cwd(), tempDir);
  try {
    if (!fs.existsSync(tempDirPath)) {
      fs.mkdirSync(tempDirPath, { recursive: true });
    }
  } catch (error) {
    return {
      success: false,
      inputFiles,
      crossfadeDuration,
      error: `Failed to create temp directory: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  // Generate output filename
  const timestamp = Date.now();
  const outputFile = path.join(tempDirPath, `crossfaded-episode-${timestamp}.${outputFormat}`);

  console.log(`🎵 Starting crossfade transitions for ${inputFiles.length} segments`);
  console.log(`⏱️  Crossfade duration: ${crossfadeDuration}s`);

  try {
    // Build crossfade filter complex chain
    const filterComplex = buildCrossfadeFilterChain(inputFiles, crossfadeDuration);
    
    if (!filterComplex) {
      throw new Error('Failed to build crossfade filter chain');
    }

    console.log(`🔧 Filter chain: ${filterComplex}`);

    // Execute FFmpeg crossfade processing
    await executeCrossfadeCommand(inputFiles, outputFile, filterComplex, outputBitrate, outputSampleRate, outputFormat);

    // Verify output file was created
    if (!fs.existsSync(outputFile)) {
      throw new Error('Crossfaded audio file was not created');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Crossfade transitions complete in ${processingTime}ms`);

    const result: AudioTransitionResult = {
      success: true,
      outputFile,
      inputFiles,
      crossfadeDuration,
      processingTime
    };

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Crossfade processing failed:', errorMessage);

    // Cleanup any partial files
    if (fs.existsSync(outputFile)) {
      try {
        fs.unlinkSync(outputFile);
      } catch (cleanupError) {
        console.warn('Failed to cleanup partial output file:', cleanupError);
      }
    }

    return {
      success: false,
      inputFiles,
      crossfadeDuration,
      error: errorMessage,
      processingTime
    };
  }
}

/**
 * Build FFmpeg filter complex chain for crossfading multiple segments
 * Creates chained acrossfade filters: [0:a][1:a]acrossfade=d=0.5[cf1]; [cf1][2:a]acrossfade=d=0.5[cf2]; etc.
 */
function buildCrossfadeFilterChain(inputFiles: string[], duration: number): string | null {
  if (inputFiles.length < 2) {
    return null;
  }

  // For 2 files: [0:a][1:a]acrossfade=d=0.5[out]
  if (inputFiles.length === 2) {
    return `[0:a][1:a]acrossfade=d=${duration}[out]`;
  }

  // For 3+ files, chain crossfades: [0:a][1:a]acrossfade=d=0.5[cf1]; [cf1][2:a]acrossfade=d=0.5[cf2]; etc.
  const filterParts: string[] = [];
  
  // First crossfade: [0:a][1:a]acrossfade=d=duration[cf1]
  filterParts.push(`[0:a][1:a]acrossfade=d=${duration}[cf1]`);
  
  // Subsequent crossfades: [cf1][2:a]acrossfade=d=duration[cf2]; [cf2][3:a]acrossfade=d=duration[cf3]; etc.
  for (let i = 2; i < inputFiles.length; i++) {
    const inputLabel = i === 2 ? '[cf1]' : `[cf${i-1}]`;
    const outputLabel = i === inputFiles.length - 1 ? '[out]' : `[cf${i}]`;
    filterParts.push(`${inputLabel}[${i}:a]acrossfade=d=${duration}${outputLabel}`);
  }
  
  return filterParts.join('; ');
}

/**
 * Execute FFmpeg crossfade command with proper error handling
 */
async function executeCrossfadeCommand(
  inputFiles: string[],
  outputFile: string,
  filterComplex: string,
  outputBitrate: string,
  outputSampleRate: number,
  outputFormat: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create FFmpeg command with multiple inputs
    const ffmpegCommand = ffmpeg();
    
    // Add each input file
    inputFiles.forEach(inputFile => {
      ffmpegCommand.input(inputFile);
    });
    
    // Apply crossfade filter complex
    ffmpegCommand
      .complexFilter([filterComplex])
      .map('[out]') // Map the final output
      .audioCodec('libmp3lame') // High-quality MP3 encoder
      .audioBitrate(outputBitrate)
      .audioFrequency(outputSampleRate)
      .format(outputFormat)
      .on('start', (commandLine) => {
        console.log('FFmpeg crossfade command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`🎵 Crossfade progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('🎯 Crossfade processing complete');
        resolve();
      })
      .on('error', (err) => {
        console.error('FFmpeg crossfade error:', err);
        reject(err);
      })
      .save(outputFile);
  });
}

/**
 * Create crossfaded version of existing concatenated audio
 * Alternative approach: Take existing concatenated file and add crossfades retroactively
 * 
 * @param concatenatedFile - Path to already concatenated audio file  
 * @param segmentTimings - Array of segment start times in seconds
 * @param options - Transition options
 * @returns Promise resolving to transition result
 */
export async function addTransitionsToExistingFile(
  concatenatedFile: string,
  segmentTimings: number[],
  options: AudioTransitionOptions = {}
): Promise<AudioTransitionResult> {
  const startTime = Date.now();
  
  const {
    crossfadeDuration = 0.5,
    outputFormat = 'mp3',
    outputBitrate = '128k',
    outputSampleRate = 44100,
    tempDir = 'tmp/audio_processing'
  } = options;

  if (!fs.existsSync(concatenatedFile)) {
    return {
      success: false,
      inputFiles: [concatenatedFile],
      crossfadeDuration,
      error: `Concatenated file not found: ${concatenatedFile}`
    };
  }

  const tempDirPath = path.resolve(process.cwd(), tempDir);
  const timestamp = Date.now();
  const outputFile = path.join(tempDirPath, `crossfaded-existing-${timestamp}.${outputFormat}`);

  console.log(`🎵 Adding crossfades to existing file: ${path.basename(concatenatedFile)}`);
  console.log(`📍 Segment boundaries: ${segmentTimings.join(', ')}s`);

  try {
    // Build filter to add crossfades at segment boundaries
    // This uses the afade filter to create crossfades at specific timestamps
    const fadeFilters = buildTimedCrossfadeFilters(segmentTimings, crossfadeDuration);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(concatenatedFile)
        .audioFilters(fadeFilters)
        .audioCodec('libmp3lame')
        .audioBitrate(outputBitrate)
        .audioFrequency(outputSampleRate)
        .format(outputFormat)
        .on('start', (commandLine) => {
          console.log('FFmpeg timed crossfade command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`🎵 Timed crossfade progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log('🎯 Timed crossfade complete');
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg timed crossfade error:', err);
          reject(err);
        })
        .save(outputFile);
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Timed crossfades added in ${processingTime}ms`);

    return {
      success: true,
      outputFile,
      inputFiles: [concatenatedFile],
      crossfadeDuration,
      processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Timed crossfade processing failed:', errorMessage);

    return {
      success: false,
      inputFiles: [concatenatedFile],
      crossfadeDuration,
      error: errorMessage,
      processingTime
    };
  }
}

/**
 * Build afade filters for adding crossfades at specific timestamps
 */
function buildTimedCrossfadeFilters(segmentTimings: number[], duration: number): string[] {
  const filters: string[] = [];
  const halfDuration = duration / 2;

  for (let i = 0; i < segmentTimings.length - 1; i++) {
    const segmentEnd = segmentTimings[i + 1];
    
    // Add fade out at end of current segment
    filters.push(`afade=t=out:st=${segmentEnd - halfDuration}:d=${halfDuration}`);
    
    // Add fade in at start of next segment  
    filters.push(`afade=t=in:st=${segmentEnd}:d=${halfDuration}`);
  }
  
  return filters;
}

/**
 * Audio compression result interface
 */
export interface AudioCompressionResult {
  success: boolean;
  compressedFile?: string;
  originalFile: string;
  originalSize?: number;      // Size in bytes
  compressedSize?: number;    // Size in bytes  
  compressionRatio?: number;  // Percentage reduction
  bitrate?: string;          // Target bitrate used
  error?: string;
  processingTime?: number;
}

/**
 * Audio compression options
 */
export interface AudioCompressionOptions {
  targetBitrate?: string;    // Target bitrate (default: VBR ~128k using -q:a 5)
  useVBR?: boolean;         // Use Variable Bitrate (default: true)
  forceMonoForVoice?: boolean; // Force mono for voice content (default: true)
  outputFormat?: string;    // Output format (default: 'mp3')
  outputSampleRate?: number; // Output sample rate (default: 44100)
  tempDir?: string;         // Temporary directory (default: 'tmp/audio_processing')
  preserveMetadata?: boolean; // Preserve file metadata (default: true)
  applyNormalization?: boolean; // Apply loudness normalization during compression (default: false)
}

/**
 * Compress audio file to reduce size while maintaining quality
 * Uses FFmpeg with optimized settings for podcast audio (VBR ~128kbps)
 * 
 * @param inputFile - Path to input audio file
 * @param options - Compression options
 * @returns Promise resolving to compression result
 */
export async function compressAudio(
  inputFile: string,
  options: AudioCompressionOptions = {}
): Promise<AudioCompressionResult> {
  const startTime = Date.now();
  
  const {
    targetBitrate = '128k', // Fallback for CBR mode
    useVBR = true,         // VBR is superior for podcast content
    forceMonoForVoice = true, // Significant size reduction for voice
    outputFormat = 'mp3',
    outputSampleRate = 44100,
    tempDir = 'tmp/audio_processing',
    preserveMetadata = true,
    applyNormalization = false
  } = options;

  // Input validation
  if (!inputFile || !fs.existsSync(inputFile)) {
    return {
      success: false,
      originalFile: inputFile,
      error: `Input file not found: ${inputFile}`
    };
  }

  // Ensure temp directory exists
  const tempDirPath = path.resolve(process.cwd(), tempDir);
  try {
    if (!fs.existsSync(tempDirPath)) {
      fs.mkdirSync(tempDirPath, { recursive: true });
    }
  } catch (error) {
    return {
      success: false,
      originalFile: inputFile,
      error: `Failed to create temp directory: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  // Generate output filename
  const inputExt = path.extname(inputFile);
  const inputBase = path.basename(inputFile, inputExt);
  const timestamp = Date.now();
  const outputFile = path.join(tempDirPath, `${inputBase}-compressed-${timestamp}.${outputFormat}`);

  // Get original file size
  let originalSize: number;
  try {
    const stats = fs.statSync(inputFile);
    originalSize = stats.size;
  } catch (error) {
    return {
      success: false,
      originalFile: inputFile,
      error: `Failed to get original file size: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  console.log(`🗜️  Starting audio compression: ${path.basename(inputFile)}`);
  console.log(`📊 Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`⚙️  Mode: ${useVBR ? 'VBR (~128kbps)' : `CBR (${targetBitrate})`}`);

  try {
    // Build compression command
    await executeCompressionCommand(
      inputFile,
      outputFile,
      useVBR,
      targetBitrate,
      forceMonoForVoice,
      outputSampleRate,
      outputFormat,
      preserveMetadata,
      applyNormalization
    );

    // Verify output file was created
    if (!fs.existsSync(outputFile)) {
      throw new Error('Compressed audio file was not created');
    }

    // Get compressed file size and calculate compression ratio
    const compressedStats = fs.statSync(outputFile);
    const compressedSize = compressedStats.size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

    const processingTime = Date.now() - startTime;
    
    console.log(`📉 Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`✅ Compression ratio: ${compressionRatio.toFixed(1)}% reduction`);
    console.log(`⏱️  Processing time: ${processingTime}ms`);

    const result: AudioCompressionResult = {
      success: true,
      compressedFile: outputFile,
      originalFile: inputFile,
      originalSize,
      compressedSize,
      compressionRatio,
      bitrate: useVBR ? 'VBR ~128k' : targetBitrate,
      processingTime
    };

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Audio compression failed:', errorMessage);

    // Cleanup any partial files
    if (fs.existsSync(outputFile)) {
      try {
        fs.unlinkSync(outputFile);
      } catch (cleanupError) {
        console.warn('Failed to cleanup partial output file:', cleanupError);
      }
    }

    return {
      success: false,
      originalFile: inputFile,
      originalSize,
      error: errorMessage,
      processingTime
    };
  }
}

/**
 * Execute FFmpeg compression command with optimized settings
 */
async function executeCompressionCommand(
  inputFile: string,
  outputFile: string,
  useVBR: boolean,
  targetBitrate: string,
  forceMonoForVoice: boolean,
  outputSampleRate: number,
  outputFormat: string,
  preserveMetadata: boolean,
  applyNormalization: boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputFile);

    // Apply loudness normalization during compression if requested
    if (applyNormalization) {
      // Use integrated loudnorm for podcast standard (-16 LUFS)
      command = command.audioFilters(['loudnorm=I=-16:TP=-1.5:LRA=11']);
    }

    // Configure audio codec and quality
    command = command.audioCodec('libmp3lame');

    if (useVBR) {
      // Use VBR with quality scale 5 (~128kbps average)
      // Quality scale: 0 (best) to 9 (worst), 5 is good balance for podcasts
      command = command.audioQuality(5);
    } else {
      // Use CBR with specified bitrate
      command = command.audioBitrate(targetBitrate);
    }

    // Set sample rate
    command = command.audioFrequency(outputSampleRate);

    // Force mono for voice content (significant size reduction)
    if (forceMonoForVoice) {
      command = command.audioChannels(1);
    }

    // Set output format
    command = command.format(outputFormat);

    // Preserve metadata if requested
    if (preserveMetadata) {
      command = command.outputOptions(['-map_metadata', '0']);
    }

    // Add event handlers
    command
      .on('start', (commandLine) => {
        console.log('FFmpeg compression command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`🗜️  Compression progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('🎯 Compression complete');
        resolve();
      })
      .on('error', (err) => {
        console.error('FFmpeg compression error:', err);
        reject(err);
      })
      .save(outputFile);
  });
}

/**
 * Compress multiple audio files in batch
 * Processes files sequentially to avoid overwhelming the system
 * 
 * @param inputFiles - Array of input file paths
 * @param options - Compression options
 * @returns Promise resolving to array of compression results
 */
export async function compressAudioBatch(
  inputFiles: string[],
  options: AudioCompressionOptions = {}
): Promise<AudioCompressionResult[]> {
  console.log(`🗜️  Starting batch audio compression for ${inputFiles.length} files`);
  
  const results: AudioCompressionResult[] = [];
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  
  for (let i = 0; i < inputFiles.length; i++) {
    const inputFile = inputFiles[i];
    console.log(`📁 Processing file ${i + 1}/${inputFiles.length}: ${path.basename(inputFile)}`);
    
    try {
      const result = await compressAudio(inputFile, options);
      results.push(result);
      
      if (result.success) {
        totalOriginalSize += result.originalSize || 0;
        totalCompressedSize += result.compressedSize || 0;
      }
      
      // Add small delay between files to be gentle on system resources
      if (i < inputFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Failed to compress ${inputFile}:`, error);
      results.push({
        success: false,
        originalFile: inputFile,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const overallCompressionRatio = totalOriginalSize > 0 
    ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100
    : 0;
  
  console.log(`✅ Batch compression complete: ${successful}/${inputFiles.length} successful`);
  console.log(`📊 Overall compression: ${overallCompressionRatio.toFixed(1)}% reduction`);
  console.log(`💾 Total size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB → ${(totalCompressedSize / 1024 / 1024).toFixed(2)} MB`);
  
  return results;
}

/**
 * Get optimal compression settings for different audio content types
 */
export const COMPRESSION_PRESETS = {
  // Voice-only content (podcasts, audiobooks)
  VOICE_ONLY: {
    useVBR: true,
    forceMonoForVoice: true,
    applyNormalization: true,
    expectedReduction: '40-60%'
  },
  
  // Music + voice content (music podcasts)
  MUSIC_VOICE: {
    useVBR: true,
    forceMonoForVoice: false, // Keep stereo for music
    applyNormalization: true,
    expectedReduction: '20-35%'
  },
  
  // High quality music
  MUSIC_QUALITY: {
    useVBR: true,
    forceMonoForVoice: false,
    targetBitrate: '160k', // Higher quality for music
    applyNormalization: false,
    expectedReduction: '15-25%'
  },
  
  // Maximum compression (acceptable quality loss)
  MAXIMUM_COMPRESSION: {
    useVBR: true,
    forceMonoForVoice: true,
    targetBitrate: '96k',
    outputSampleRate: 22050, // Lower sample rate
    applyNormalization: true,
    expectedReduction: '60-75%'
  },
  
  // Broadcast/streaming optimized
  BROADCAST: {
    useVBR: false, // CBR for consistent streaming
    targetBitrate: '128k',
    forceMonoForVoice: false,
    applyNormalization: true,
    expectedReduction: '25-40%'
  }
} as const;

/**
 * CROSSFADE INTEGRATION EXAMPLES
 * ==============================
 * 
 * Example 1: Replace simple concatenation with crossfaded transitions
 * 
 * ```typescript
 * import { addTransitions } from '../src/lib/audio';
 * 
 * // In pages/api/episodes.ts recordEpisode function, replace FFmpeg concatenation:
 * 
 * // OLD APPROACH: Simple concatenation
 * // ffmpegCommand.complexFilter([`${inputMap}concat=n=${filenames.length}:v=0:a=1[out]`])
 * 
 * // NEW APPROACH: Smooth crossfade transitions
 * const crossfadeEpisode = async (audioFiles: string[], timestamp: string) => {
 *   console.log("Creating episode with smooth crossfade transitions...");
 *   
 *   try {
 *     const result = await addTransitions(audioFiles, {
 *       crossfadeDuration: 0.5,  // 500ms crossfades
 *       outputFormat: 'mp3',
 *       outputBitrate: '128k',
 *       outputSampleRate: 44100,
 *       tempDir: 'tmp/audio_processing'
 *     });
 *     
 *     if (result.success) {
 *       // Move the crossfaded file to final episode location
 *       const finalEpisode = `./public/episodes/${timestamp}-episode.mp3`;
 *       fs.renameSync(result.outputFile!, finalEpisode);
 *       
 *       console.log(`✅ Episode with crossfades created: ${finalEpisode}`);
 *       return finalEpisode;
 *     } else {
 *       console.error(`❌ Crossfade failed: ${result.error}`);
 *       // Fallback to original simple concatenation
 *       return fallbackConcatenation(audioFiles, timestamp);
 *     }
 *   } catch (error) {
 *     console.error('Crossfade processing error:', error);
 *     return fallbackConcatenation(audioFiles, timestamp);
 *   }
 * };
 * ```
 * 
 * Example 2: Enhance existing episodes with retroactive crossfades
 * 
 * ```typescript
 * import { addTransitionsToExistingFile } from '../src/lib/audio';
 * 
 * // Add crossfades to already-created episodes
 * const enhanceExistingEpisode = async (episodeFile: string, segmentTimings: number[]) => {
 *   console.log('🎵 Enhancing existing episode with crossfades...');
 *   
 *   const result = await addTransitionsToExistingFile(episodeFile, segmentTimings, {
 *     crossfadeDuration: 0.5,
 *     outputBitrate: '128k'
 *   });
 *   
 *   if (result.success) {
 *     // Replace original with enhanced version
 *     fs.renameSync(result.outputFile!, episodeFile);
 *     console.log(`✅ Episode enhanced with crossfades`);
 *   } else {
 *     console.warn(`⚠️  Enhancement failed: ${result.error}, keeping original`);
 *   }
 * };
 * 
 * // Usage with known segment boundaries
 * await enhanceExistingEpisode(
 *   './public/episodes/episode-123.mp3',
 *   [0, 45, 120, 180, 250] // Intro at 0s, segments at 45s, 120s, 180s, outro at 250s
 * );
 * ```
 * 
 * Example 3: Integration with recordEpisode function
 * 
 * ```typescript
 * // Modified recordEpisode in pages/api/episodes.ts
 * const recordEpisode = async (episode: Episode): Promise<void> => {
 *   // ... existing TTS generation code ...
 *   
 *   // Collect all generated audio files
 *   const audioFiles = [
 *     `${EPISODES_DIR}/${timestamp}-00-intro.mp3`,
 *     ...segments.map((_, i) => `${EPISODES_DIR}/${timestamp}-0${i}-segment.mp3`),
 *     `${EPISODES_DIR}/${timestamp}-99-conclusion.mp3`
 *   ];
 *   
 *   // Option A: Use crossfade transitions instead of simple concatenation
 *   try {
 *     const crossfadeResult = await addTransitions(audioFiles, {
 *       crossfadeDuration: 0.5,
 *       outputBitrate: '128k',
 *       outputSampleRate: 44100
 *     });
 *     
 *     if (crossfadeResult.success) {
 *       const finalEpisode = `${EPISODES_DIR}/${timestamp}-episode.mp3`;
 *       fs.renameSync(crossfadeResult.outputFile!, finalEpisode);
 *       
 *       // Upload to Firebase Storage
 *       const bucket = firebase.storage().bucket();
 *       await bucket.upload(finalEpisode, {
 *         destination: `${timestamp}-episode.mp3`,
 *       });
 *       
 *       console.log("✅ Crossfaded episode created and uploaded");
 *     } else {
 *       // Fallback to existing concatenation logic
 *       console.warn("Crossfade failed, using simple concatenation");
 *       // ... existing FFmpeg concat code ...
 *     }
 *   } catch (error) {
 *     console.error("Crossfade processing error:", error);
 *     // ... existing FFmpeg concat code as fallback ...
 *   }
 *   
 *   // Cleanup individual segment files
 *   audioFiles.forEach(file => {
 *     if (fs.existsSync(file)) fs.unlinkSync(file);
 *   });
 * };
 * ```
 * 
 * Example 4: Batch processing with normalization and crossfades
 * 
 * ```typescript
 * import { normalizeAudioBatch, addTransitions, LOUDNESS_TARGETS } from '../src/lib/audio';
 * 
 * // Complete audio production pipeline
 * const processEpisodeWithFullPipeline = async (audioFiles: string[]) => {
 *   try {
 *     // Step 1: Normalize all segments to consistent loudness
 *     console.log('🎯 Step 1: Normalizing audio segments...');
 *     const normalizeResults = await normalizeAudioBatch(audioFiles, {
 *       targetLUFS: LOUDNESS_TARGETS.PODCAST_STANDARD.lufs,
 *       truePeak: LOUDNESS_TARGETS.PODCAST_STANDARD.truePeak,
 *       loudnessRange: LOUDNESS_TARGETS.PODCAST_STANDARD.lra
 *     });
 *     
 *     // Extract successfully normalized files
 *     const normalizedFiles = normalizeResults
 *       .filter(r => r.success)
 *       .map(r => r.normalizedFile!)
 *       .filter(Boolean);
 *       
 *     if (normalizedFiles.length < audioFiles.length) {
 *       console.warn(`⚠️  Only ${normalizedFiles.length}/${audioFiles.length} files normalized`);
 *     }
 *     
 *     // Step 2: Add smooth crossfade transitions
 *     console.log('🎵 Step 2: Adding crossfade transitions...');
 *     const crossfadeResult = await addTransitions(normalizedFiles, {
 *       crossfadeDuration: 0.5,
 *       outputBitrate: '128k',
 *       outputSampleRate: 44100
 *     });
 *     
 *     if (crossfadeResult.success) {
 *       console.log(`✅ Complete audio pipeline: ${audioFiles.length} → normalized → crossfaded`);
 *       return crossfadeResult.outputFile!;
 *     } else {
 *       throw new Error(`Crossfade failed: ${crossfadeResult.error}`);
 *     }
 *     
 *   } catch (error) {
 *     console.error('Audio pipeline error:', error);
 *     // Fallback to simple concatenation without processing
 *     throw error;
 *   }
 * };
 * ```
 * 
 * Example 5: Dynamic crossfade duration based on content
 * 
 * ```typescript
 * // Adaptive crossfade durations for different transition types
 * const addAdaptiveTransitions = async (audioFiles: string[], transitionTypes: string[]) => {
 *   // Different crossfade durations for different content types
 *   const getDynamicDuration = (transitionType: string) => {
 *     switch (transitionType) {
 *       case 'intro_to_news': return 0.3;     // Shorter for news urgency
 *       case 'news_to_analysis': return 0.5;  // Standard for content flow
 *       case 'host_change': return 0.7;       // Longer for voice transitions
 *       case 'topic_change': return 0.4;      // Medium for topic shifts
 *       default: return 0.5;                  // Default 500ms
 *     }
 *   };
 *   
 *   // Process pairs of files with adaptive durations
 *   let currentFile = audioFiles[0];
 *   
 *   for (let i = 1; i < audioFiles.length; i++) {
 *     const transitionType = transitionTypes[i - 1] || 'default';
 *     const duration = getDynamicDuration(transitionType);
 *     
 *     console.log(`🎵 Crossfading ${path.basename(currentFile)} → ${path.basename(audioFiles[i])} (${duration}s)`);
 *     
 *     const result = await addTransitions([currentFile, audioFiles[i]], {
 *       crossfadeDuration: duration,
 *       tempDir: 'tmp/adaptive_crossfades'
 *     });
 *     
 *     if (result.success) {
 *       currentFile = result.outputFile!;
 *     } else {
 *       console.warn(`⚠️  Crossfade failed, using simple concatenation for this pair`);
 *       // Would need fallback concatenation logic here
 *     }
 *   }
 *   
 *   return currentFile;
 * };
 * ```
 * 
 * AUDIO NORMALIZATION INTEGRATION EXAMPLES  
 * =========================================
 * 
 * Example 1: Normalize individual audio files before concatenation
 * 
 * ```typescript
 * import { normalizeAudio, LOUDNESS_TARGETS } from '../src/lib/audio';
 * 
 * // After TTS generation, before FFmpeg concatenation
 * const normalizeIndividualFiles = async (filenames: string[]) => {
 *   const normalizedFiles: string[] = [];
 *   
 *   for (const filename of filenames) {
 *     console.log(`Normalizing ${filename}...`);
 *     
 *     const result = await normalizeAudio(filename, {
 *       targetLUFS: LOUDNESS_TARGETS.PODCAST_STANDARD.lufs,
 *       truePeak: LOUDNESS_TARGETS.PODCAST_STANDARD.truePeak,
 *       loudnessRange: LOUDNESS_TARGETS.PODCAST_STANDARD.lra,
 *       outputFormat: 'mp3',
 *       outputBitrate: '128k'
 *     });
 *     
 *     if (result.success) {
 *       normalizedFiles.push(result.normalizedFile!);
 *       console.log(`✅ Normalized: ${result.originalLUFS?.toFixed(2)} → ${result.normalizedLUFS?.toFixed(2)} LUFS`);
 *     } else {
 *       console.error(`❌ Failed to normalize ${filename}: ${result.error}`);
 *       // Use original file as fallback
 *       normalizedFiles.push(filename);
 *     }
 *   }
 *   
 *   return normalizedFiles;
 * };
 * ```
 * 
 * Example 2: Normalize final concatenated episode
 * 
 * ```typescript
 * // After FFmpeg concatenation, final master normalization
 * const normalizeFinalEpisode = async (episodeFile: string) => {
 *   console.log('🎯 Final episode normalization...');
 *   
 *   const result = await normalizeAudio(episodeFile, {
 *     ...LOUDNESS_TARGETS.PODCAST_STANDARD,
 *     targetLUFS: LOUDNESS_TARGETS.PODCAST_STANDARD.lufs,
 *     outputBitrate: '128k',
 *     outputSampleRate: 44100
 *   });
 *   
 *   if (result.success) {
 *     // Replace original with normalized version
 *     fs.renameSync(result.normalizedFile!, episodeFile);
 *     console.log(`✅ Episode normalized to ${result.normalizedLUFS?.toFixed(2)} LUFS`);
 *   } else {
 *     console.warn(`⚠️  Episode normalization failed: ${result.error}`);
 *     console.warn('Continuing with original audio quality');
 *   }
 * };
 * ```
 * 
 * Example 3: Integration with existing recordEpisode function
 * 
 * ```typescript
 * // In pages/api/episodes.ts, after TTS generation:
 * 
 * // 1. Generate all audio files first (existing code)
 * // 2. Normalize all files for consistent loudness
 * const filesToNormalize = [
 *   `${EPISODES_DIR}/${timestamp}-00-intro.mp3`,
 *   ...segments.map((_, i) => `${EPISODES_DIR}/${timestamp}-0${i}-segment.mp3`),
 *   `${EPISODES_DIR}/${timestamp}-99-conclusion.mp3`
 * ];
 * 
 * console.log("Normalizing audio files for consistent loudness...");
 * const normalizedFiles = await normalizeIndividualFiles(filesToNormalize);
 * 
 * // 3. Use normalized files for FFmpeg concatenation (existing filter_complex code)
 * // 4. Optionally normalize final output for master quality
 * ```
 * 
 * Example 4: Batch processing with error handling
 * 
 * ```typescript
 * import { normalizeAudioBatch, cleanupNormalizationFiles } from '../src/lib/audio';
 * 
 * const processEpisodeAudio = async (audioFiles: string[]) => {
 *   try {
 *     // Batch normalize all files
 *     const results = await normalizeAudioBatch(audioFiles, {
 *       targetLUFS: -16,
 *       truePeak: -1.5,
 *       loudnessRange: 11,
 *       outputFormat: 'mp3',
 *       outputBitrate: '128k'
 *     });
 *     
 *     // Extract successful results
 *     const normalizedFiles = results
 *       .filter(r => r.success)
 *       .map(r => r.normalizedFile!)
 *       .filter(Boolean);
 *       
 *     console.log(`📊 Audio normalization: ${normalizedFiles.length}/${audioFiles.length} successful`);
 *     
 *     // Use normalized files in FFmpeg concatenation
 *     return normalizedFiles;
 *     
 *   } catch (error) {
 *     console.error('Audio normalization batch failed:', error);
 *     return audioFiles; // Fallback to original files
 *   } finally {
 *     // Cleanup old temporary files (run periodically)
 *     cleanupNormalizationFiles('tmp/audio_processing', 24);
 *   }
 * };
 * ```
 */