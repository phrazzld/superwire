/**
 * OpenAI Text-to-Speech Integration
 * Provides cost-effective TTS using OpenAI's API as alternative to ElevenLabs
 * 
 * Cost comparison:
 * - OpenAI TTS: $15/1M chars (standard) or $30/1M chars (HD)
 * - ElevenLabs: $180/1M chars
 * - Savings: 12x cheaper with OpenAI standard model
 */

import fs from 'fs';
import path from 'path';

// OpenAI TTS API Configuration
export const OPENAI_TTS_API_BASE = 'https://api.openai.com/v1/audio/speech';
export const OPENAI_TTS_COST_PER_MILLION = 15.00; // $15 per million characters for standard model
export const OPENAI_TTS_HD_COST_PER_MILLION = 30.00; // $30 per million characters for HD model

/**
 * OpenAI TTS voice types
 */
export type VoiceType = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * OpenAI TTS model types
 */
export type TTSModel = 'tts-1' | 'tts-1-hd';

/**
 * Host to voice mapping for consistent character voices
 */
export const HOST_TO_VOICE_MAP: Record<string, VoiceType> = {
  ADAM: 'onyx',    // Deep, authoritative voice for primary host
  DALLAS: 'nova',   // Warm, empathetic voice for co-host
  JORDAN: 'echo'    // Energetic, dynamic voice for culture host
};

/**
 * TTS cost tracking entry
 */
export interface TTSCostEntry {
  timestamp: string;
  model: TTSModel;
  voice: VoiceType;
  characterCount: number;
  cost: number;
  taskType?: string;
  textPreview?: string;
  hostName?: string;
}

/**
 * TTS cost tracking structure
 */
export interface TTSCostTracking {
  entries: TTSCostEntry[];
  dailyTotals: { [date: string]: number };
  modelTotals: { [model: string]: number };
  voiceTotals: { [voice: string]: number };
  grandTotal: number;
}

/**
 * TTS generation result
 */
export interface TTSResult {
  success: boolean;
  audioBuffer?: Buffer;
  cost?: number;
  characterCount?: number;
  voice?: VoiceType;
  model?: TTSModel;
  error?: string;
  retryCount?: number;
}

/**
 * Estimate TTS cost based on text and model
 */
export function estimateTTSCost(text: string, model: TTSModel = 'tts-1'): number {
  const characterCount = text.length;
  const costPerMillion = model === 'tts-1-hd' ? OPENAI_TTS_HD_COST_PER_MILLION : OPENAI_TTS_COST_PER_MILLION;
  return (characterCount * costPerMillion) / 1_000_000;
}

/**
 * Generate speech using OpenAI TTS API
 */
export async function generateSpeech(
  text: string,
  voice: VoiceType,
  model: TTSModel = 'tts-1',
  speed: number = 1.0
): Promise<TTSResult> {
  // Validate inputs
  if (!text || text.trim().length === 0) {
    return {
      success: false,
      error: 'Text cannot be empty'
    };
  }

  if (speed < 0.25 || speed > 4.0) {
    return {
      success: false,
      error: 'Speed must be between 0.25 and 4.0'
    };
  }

  const characterCount = text.length;
  const estimatedCost = estimateTTSCost(text, model);

  // Get API key from environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }

  // Prepare API request
  const requestBody = {
    model,
    input: text.trim(),
    voice,
    speed,
    response_format: 'mp3'
  };

  const requestHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  // Implement retry logic with exponential backoff (pattern from elevenlabs.ts:390-420)
  const maxRetries = 3;
  const retryDelays = [1000, 2000, 4000]; // Exponential backoff
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🎙️  Generating TTS audio (attempt ${attempt + 1}/${maxRetries + 1}): ${text.substring(0, 50)}...`);

      const response = await fetch(OPENAI_TTS_API_BASE, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        
        // Check for rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelays[attempt];
          
          if (attempt < maxRetries) {
            console.log(`⏳ Rate limited, retrying after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        throw new Error(`OpenAI TTS API error ${response.status}: ${errorBody}`);
      }

      // Return audio buffer from response.arrayBuffer() and handle errors
      const audioBuffer = Buffer.from(await response.arrayBuffer());

      // Validate audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Empty audio buffer received');
      }

      // Track successful usage
      await trackTTSUsage(text, model, voice);

      console.log(`✅ TTS audio generated successfully: ${characterCount} chars, $${estimatedCost.toFixed(4)}, model: ${model}, voice: ${voice}`);

      return {
        success: true,
        audioBuffer,
        cost: estimatedCost,
        characterCount,
        voice,
        model,
        retryCount: attempt
      };

    } catch (error) {
      lastError = error as Error;
      console.error(`❌ TTS generation attempt ${attempt + 1} failed:`, error);

      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delay = retryDelays[attempt] || 4000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed
  return {
    success: false,
    error: lastError?.message || 'TTS generation failed after all retries',
    characterCount,
    voice,
    model
  };
}

/**
 * Generate audio for a specific host
 */
export async function generateAudioForHost(
  text: string,
  hostName: string,
  quality: 'standard' | 'hd' = 'standard'
): Promise<TTSResult> {
  // Map host name to voice
  const voice = HOST_TO_VOICE_MAP[hostName.toUpperCase()];
  if (!voice) {
    return {
      success: false,
      error: `Unknown host: ${hostName}. Available hosts: ${Object.keys(HOST_TO_VOICE_MAP).join(', ')}`
    };
  }

  // Map quality to model
  const model: TTSModel = quality === 'hd' ? 'tts-1-hd' : 'tts-1';

  // Generate speech with host-specific voice
  const result = await generateSpeech(text, voice, model);

  // Add host name to result for tracking
  if (result.success) {
    console.log(`🎭 Generated audio for host ${hostName} using voice ${voice}`);
  }

  return result;
}

/**
 * Track TTS usage and costs
 */
export async function trackTTSUsage(
  text: string,
  model: TTSModel,
  voice: VoiceType,
  options: {
    taskType?: string;
    hostName?: string;
    costsFilePath?: string;
  } = {}
): Promise<void> {
  const {
    taskType = 'tts_generation',
    hostName,
    costsFilePath = 'costs.json'
  } = options;

  const characterCount = text.length;
  const cost = estimateTTSCost(text, model);
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];

  // Create TTS cost entry
  const ttsEntry: TTSCostEntry = {
    timestamp,
    model,
    voice,
    characterCount,
    cost,
    taskType,
    textPreview: text.substring(0, 100),
    hostName
  };

  try {
    // Read existing costs file or create structure
    const costsPath = path.resolve(process.cwd(), costsFilePath);
    let costsData: any = { entries: [], dailyTotals: {}, modelTotals: {}, taskTypeTotals: {}, grandTotal: 0 };

    if (fs.existsSync(costsPath)) {
      const fileContent = fs.readFileSync(costsPath, 'utf8');
      costsData = JSON.parse(fileContent);
    }

    // Initialize TTS costs section if it doesn't exist
    if (!costsData.ttsCosts) {
      costsData.ttsCosts = {
        entries: [],
        dailyTotals: {},
        modelTotals: {},
        voiceTotals: {},
        grandTotal: 0
      };
    }

    const ttsCosts = costsData.ttsCosts;

    // Add new entry
    ttsCosts.entries.push(ttsEntry);

    // Update daily totals
    ttsCosts.dailyTotals[date] = (ttsCosts.dailyTotals[date] || 0) + cost;

    // Update model totals
    ttsCosts.modelTotals[model] = (ttsCosts.modelTotals[model] || 0) + cost;

    // Update voice totals
    ttsCosts.voiceTotals[voice] = (ttsCosts.voiceTotals[voice] || 0) + cost;

    // Update grand total
    ttsCosts.grandTotal = (ttsCosts.grandTotal || 0) + cost;

    // Write updated costs back to file
    fs.writeFileSync(costsPath, JSON.stringify(costsData, null, 2));

    // Log daily spending if exceeding threshold
    const dailyTotal = ttsCosts.dailyTotals[date];
    if (dailyTotal > 0.50) {
      console.warn(`⚠️  Daily TTS spending has exceeded $0.50: $${dailyTotal.toFixed(2)}`);
    }

  } catch (error) {
    console.error('Failed to track TTS costs:', error);
    // Don't throw - cost tracking failure shouldn't break TTS generation
  }
}

/**
 * Check if OpenAI TTS should be used based on configuration and costs
 */
export function shouldUseTTS(): boolean {
  // Check if API key exists
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI TTS unavailable: OPENAI_API_KEY not set');
    return false;
  }

  try {
    // Check daily TTS costs
    const costsPath = path.resolve(process.cwd(), 'costs.json');
    if (fs.existsSync(costsPath)) {
      const fileContent = fs.readFileSync(costsPath, 'utf8');
      const costsData = JSON.parse(fileContent);
      
      if (costsData.ttsCosts) {
        const today = new Date().toISOString().split('T')[0];
        const dailyTotal = costsData.ttsCosts.dailyTotals[today] || 0;
        
        // Check if daily TTS costs are under $0.50
        if (dailyTotal >= 0.50) {
          console.warn(`⚠️  Daily TTS budget exceeded: $${dailyTotal.toFixed(2)} >= $0.50`);
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking TTS availability:', error);
    // If we can't check costs, allow TTS
    return true;
  }
}

/**
 * Get TTS cost summary
 */
export async function getTTSCostSummary(costsFilePath: string = 'costs.json'): Promise<TTSCostTracking | null> {
  try {
    const costsPath = path.resolve(process.cwd(), costsFilePath);
    if (!fs.existsSync(costsPath)) {
      return null;
    }

    const fileContent = fs.readFileSync(costsPath, 'utf8');
    const costsData = JSON.parse(fileContent);
    
    return costsData.ttsCosts || null;
  } catch (error) {
    console.error('Failed to get TTS cost summary:', error);
    return null;
  }
}

/**
 * Export voice configurations for reference
 */
export const VOICE_DESCRIPTIONS = {
  alloy: 'Neutral and balanced voice',
  echo: 'Energetic and dynamic voice',
  fable: 'British-accented voice',
  onyx: 'Deep and authoritative voice',
  nova: 'Warm and empathetic voice', 
  shimmer: 'Soft and gentle voice'
};