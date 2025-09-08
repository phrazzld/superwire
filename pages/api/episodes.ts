// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import * as cheerio from "cheerio";
import firebase from "firebase-admin";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import type { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi } from "openai";
import path from "path";
import { HOSTS, PROMPTS } from "../../constants";
import { OpenRouterClient, TaskType } from "../../src/lib/openrouter";
import { generateAudioForHost, shouldUseTTS } from "../../src/lib/openai-tts";
import { uploadEpisodeToBlob, isBlobStorageConfigured } from "../../src/lib/vercel-blob";

// Firebase initialization (optional - being migrated to Vercel Blob)
let firebaseInitialized = false;
if (process.env.GOOGLE_SERVICE_KEY) {
  try {
    const credential = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_KEY, "base64").toString()
    );
    
    if (firebase.apps.length === 0) {
      firebase.initializeApp({
        projectId: "super-wire",
        credential: firebase.credential.cert(credential),
        storageBucket: "gs://super-wire.appspot.com/",
      });
    }
    firebaseInitialized = true;
  } catch (error) {
    console.warn("Firebase initialization failed (migration to Vercel Blob in progress):", error);
  }
}

const openaiConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(openaiConfig);

const TEXT_TO_SPEECH_BASE_ENDPOINT =
  "https://api.elevenlabs.io/v1/text-to-speech";

const TOP_HEADLINES_ENDPOINT = `https://newsapi.org/v2/top-headlines`;

const NEWS_SOURCES = [
  "bbc-news",
  /* "politico", */
  /* "financial-times", */
  /* "fox-news", */
  /* "cnn", */
  /* "pbs", */
  /* "independent", */
  /* "ars-technica", */
  "associated-press",
  /* "bloomberg", */
  /* "axios", */
  /* "breitbart-news", */
  /* "business-insider", */
  /* "cbs-news", */
  /* "fortune", */
  /* "google-news", */
  /* "hacker-news", */
  /* "national-geographic", */
  /* "national-review", */
  /* "nbc-news", */
  /* "new-scientist", */
  /* "newsweek", */
  /* "new-york-magazine", */
  "reuters",
  /* "techcrunch", */
  /* "the-american-conservative", */
  /* "the-jerusalem-post", */
  /* "the-verge", */
  /* "the-wall-street-journal", */
  /* "wired", */
];

const NEWS_PAGE_SIZE = 3;

const getTopHeadlines = async () => {
  console.log("Getting top headlines...");
  const response = await fetch(
    TOP_HEADLINES_ENDPOINT +
    `?sources=${NEWS_SOURCES.join(",")}` +
    `&pageSize=${NEWS_PAGE_SIZE}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.NEWS_API_KEY}`,
      },
    }
  );
  const json = await response.json();

  if (json.status !== "ok") {
    console.error("Error fetching top headlines", json);
    throw new Error("Error fetching top headlines");
  }

  return json.articles;
};

const getMaxTokens = (prompt: string): number => {
  const wordCount = prompt.split(" ").length;
  return 4000 - Math.round(wordCount * 1.5);
};

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

const writeIntroduction = async (headlines: any[]): Promise<string> => {
  console.log("Writing introduction...");

  // Initialize OpenRouter client
  const openRouterClient = new OpenRouterClient();
  
  let retries = 0;
  let response;

  while (retries < MAX_RETRIES) {
    try {
      // TODO: Link the prompt host with the audio host to guarantee consistency
      const basePrompt = PROMPTS.EP_INTRO.replace(
        "{HEADLINES}",
        headlines.join("\n")
      )
        .replace("{HOST_PERSONALITY}", HOSTS.ADAM.personality)
        .replace("{HOST_NAME}", HOSTS.ADAM.name);
      
      // Convert to modern chat completion format
      const systemPrompt = `You are ${HOSTS.ADAM.name}, an expert podcast host with the following personality: ${HOSTS.ADAM.personality}. You are writing the introduction segment for the Super Wire podcast.`;
      const userPrompt = basePrompt;
      
      // Use OpenRouter with GPT-4o for script generation
      response = await openRouterClient.completeTask(
        'script' as TaskType, // Routes to GPT-4o - using string literal due to enum issue
        userPrompt,
        {
          systemPrompt,
          temperature: 0.7,
          maxTokens: 500, // Reasonable limit for podcast intro
          trackCosts: true
        }
      );
      break;
    } catch (error: any) {
      console.error(`Error writing intro: ${error.message}`);
      retries++;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }

  if (retries === MAX_RETRIES) {
    throw new Error(`Failed to write intro after ${MAX_RETRIES} retries`);
  }

  if (!response || !response.content) {
    throw new Error("No intro generated");
  }

  // Log cost information for monitoring
  if (response.cost) {
    console.log(`Introduction generation cost: $${response.cost.toFixed(4)} using ${response.model}`);
  }

  return response.content;
};

type Host = {
  name: string;
  voiceId: string;
  personality: string;
};

interface SegmentOptions {
  includeHistoricalContext?: boolean;
  includePredictions?: boolean;
  targetLength?: number;
}

/**
 * Build enhanced system prompt for segment generation with host personality and capabilities
 */
const buildSegmentSystemPrompt = (
  host: Host,
  includeHistoricalContext: boolean,
  includePredictions: boolean,
  targetLength: number
): string => {
  let systemPrompt = `You are ${host.name}, an expert podcast host with the following personality: ${host.personality}.

You are creating a news segment for the Super Wire podcast that provides thoughtful, engaging analysis of current events.

SEGMENT REQUIREMENTS:
- Target length: ${targetLength} words
- Professional yet conversational tone matching your personality
- Focus on why this story matters to listeners
- Provide clear, accessible explanations of complex topics
- Maintain journalistic integrity while offering insights`;

  if (includeHistoricalContext) {
    systemPrompt += `
- Include relevant historical context and parallels to similar past events
- Draw connections between current developments and historical precedents
- Help listeners understand patterns and recurring themes`;
  }

  if (includePredictions) {
    systemPrompt += `
- Offer thoughtful analysis of likely future implications
- Discuss potential outcomes and what to watch for next
- Provide expert perspective on where this story might lead`;
  }

  systemPrompt += `

SEGMENT STRUCTURE:
1. Hook: Engaging opening that captures the essence of the story
2. Context: Essential background information listeners need
3. Analysis: Your insights on why this matters and what it means`;

  if (includeHistoricalContext) {
    systemPrompt += `
4. Historical Perspective: Relevant parallels and lessons from the past`;
  }

  if (includePredictions) {
    systemPrompt += `
${includeHistoricalContext ? '5' : '4'}. Future Outlook: What this could mean going forward`;
  }

  systemPrompt += `
${(includeHistoricalContext && includePredictions) ? '6' : 
    (includeHistoricalContext || includePredictions) ? '5' : '4'}. Conclusion: Why listeners should care and key takeaways

Write in your distinctive voice and style, making complex topics accessible while maintaining depth and credibility.`;

  return systemPrompt;
};

/**
 * Build enhanced user prompt with story content and enhancement instructions
 */
const buildSegmentUserPrompt = (
  content: string,
  includeHistoricalContext: boolean,
  includePredictions: boolean
): string => {
  let userPrompt = `Create an engaging podcast segment based on the following news story:

STORY CONTENT:
"""
${content}
"""

Your task is to transform this raw news content into a compelling podcast segment that:
- Explains the story clearly and engagingly
- Provides your expert analysis and perspective
- Helps listeners understand why this matters`;

  if (includeHistoricalContext) {
    userPrompt += `
- Draws relevant historical parallels and context
- Shows how this fits into broader historical patterns`;
  }

  if (includePredictions) {
    userPrompt += `
- Analyzes potential future implications and outcomes
- Discusses what to watch for as this story develops`;
  }

  userPrompt += `

Remember to write in your distinctive hosting style and make the content accessible to a general audience while maintaining analytical depth.`;

  return userPrompt;
};

const writeSegment = async (
  content: string, 
  host: Host, 
  options: SegmentOptions = {}
): Promise<string> => {
  console.log("Writing segment...");

  const {
    includeHistoricalContext = false,
    includePredictions = false,
    targetLength = 800
  } = options;

  // Initialize OpenRouter client
  const openRouterClient = new OpenRouterClient();
  
  let retries = 0;
  let response;

  while (retries < MAX_RETRIES) {
    try {
      // Build enhanced system prompt with host personality
      const systemPrompt = buildSegmentSystemPrompt(host, includeHistoricalContext, includePredictions, targetLength);
      
      // Build enhanced user prompt with story content
      const userPrompt = buildSegmentUserPrompt(content, includeHistoricalContext, includePredictions);

      // Use OpenRouter with GPT-4o for enhanced script generation
      response = await openRouterClient.completeTask(
        TaskType.SCRIPT_GENERATION, // Routes to GPT-4o
        userPrompt,
        {
          systemPrompt,
          temperature: 0.7,
          maxTokens: Math.min(targetLength * 1.5, 1200), // Allow for richer content
          trackCosts: true
        }
      );
      break;
    } catch (error: any) {
      console.error(`Error writing segment: ${error.message}`);
      console.error(error);
      retries++;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }

  if (retries === MAX_RETRIES) {
    throw new Error(`Failed to write segment after ${MAX_RETRIES} retries`);
  }

  if (!response || !response.content) {
    throw new Error("No segment generated");
  }

  // Log cost information for monitoring
  if (response.cost) {
    console.log(`Segment generation cost: $${response.cost.toFixed(4)} using ${response.model}`);
  }

  return response.content;
};

/**
 * Generate smooth transitions between podcast segments for better flow
 */
const generateTransitions = async (
  segments: string[],
  stories: any[],
  hosts: Host[]
): Promise<string[]> => {
  console.log("Generating transitions...");

  if (segments.length <= 1) {
    return []; // No transitions needed for single segment
  }

  const openRouterClient = new OpenRouterClient();
  const transitions: string[] = [];

  // Generate transitions between consecutive segments
  for (let i = 0; i < segments.length - 1; i++) {
    let retries = 0;
    let response;

    // Determine hosts for current and next segments
    const currentHost = hosts[i % hosts.length];
    const nextHost = hosts[(i + 1) % hosts.length];
    
    // Use the next segment's host for the transition (they're introducing their segment)
    const transitionHost = nextHost;

    while (retries < MAX_RETRIES) {
      try {
        // Build system prompt for transition generation
        const systemPrompt = buildTransitionSystemPrompt(transitionHost, currentHost, nextHost);
        
        // Build user prompt with segment context
        const userPrompt = buildTransitionUserPrompt(
          segments[i],
          segments[i + 1], 
          stories[i],
          stories[i + 1],
          currentHost,
          nextHost
        );

        response = await openRouterClient.completeTask(
          TaskType.SCRIPT_GENERATION, // Routes to GPT-4o
          userPrompt,
          {
            systemPrompt,
            temperature: 0.6, // Slightly lower for smoother transitions
            maxTokens: 200, // Transitions should be concise
            trackCosts: true
          }
        );
        break;
      } catch (error: any) {
        console.error(`Error generating transition ${i}: ${error.message}`);
        retries++;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }

    if (retries === MAX_RETRIES) {
      console.warn(`Failed to generate transition ${i}, using fallback`);
      transitions.push(generateFallbackTransition(transitionHost, stories[i], stories[i + 1]));
    } else if (!response || !response.content) {
      console.warn(`No transition generated for ${i}, using fallback`);  
      transitions.push(generateFallbackTransition(transitionHost, stories[i], stories[i + 1]));
    } else {
      // Log cost information
      if (response.cost) {
        console.log(`Transition ${i} cost: $${response.cost.toFixed(4)} using ${response.model}`);
      }
      transitions.push(response.content);
    }
  }

  console.log(`Generated ${transitions.length} transitions`);
  return transitions;
};

/**
 * Build system prompt for transition generation with host personality
 */
const buildTransitionSystemPrompt = (
  transitionHost: Host,
  currentHost: Host, 
  nextHost: Host
): string => {
  const transitionPhrases = transitionHost.personality.includes('energetic') 
    ? ['Building on that', 'Speaking of which', 'This connects to'] // Jordan-style
    : transitionHost.personality.includes('empathetic')
    ? ['What this means for people is', 'The human side of this', 'Looking at the impact'] // Dallas-style  
    : ['The data shows', 'What\'s particularly interesting', 'Let me break this down']; // Adam-style

  return `You are ${transitionHost.name}, a podcast host with this personality: ${transitionHost.personality}.

You are creating a smooth transition between two news segments in the Super Wire podcast. Your job is to bridge from the conclusion of ${currentHost.name}'s segment to naturally introduce ${nextHost.name}'s upcoming segment.

TRANSITION REQUIREMENTS:
- Length: 30-50 words (10-15 seconds when spoken)
- Acknowledge the previous segment briefly
- Create natural bridge to the next topic
- Use your distinctive voice and style
- Include one of your signature transition phrases: ${transitionPhrases.join(', ')}
- Maintain professional yet conversational tone
- Create thematic connection between different stories when possible

TRANSITION STYLE:
- Concise and purposeful - every word counts
- Natural conversational flow
- Professional broadcast quality
- Host personality should come through clearly
- Should feel spontaneous, not scripted

Generate ONLY the transition text - no introductory phrases or explanations.`;
};

/**
 * Build user prompt for transition generation with story context
 */
const buildTransitionUserPrompt = (
  currentSegment: string,
  nextSegment: string,
  currentStory: any,
  nextStory: any,
  currentHost: Host,
  nextHost: Host
): string => {
  // Extract key themes from segments (first 200 chars of each for context)
  const currentTheme = currentSegment.substring(0, 200) + '...';
  const nextTheme = nextSegment.substring(0, 200) + '...';

  return `Create a smooth transition from ${currentHost.name}'s segment to ${nextHost.name}'s segment.

CURRENT SEGMENT CONCLUSION (${currentHost.name}):
"${currentTheme}"

NEXT SEGMENT OPENING (${nextHost.name}):  
"${nextTheme}"

STORY CONTEXT:
- Current story: "${currentStory.title || 'Current topic'}"
- Next story: "${nextStory.title || 'Next topic'}"

Your task is to create a natural bridge that:
1. Briefly acknowledges the current segment's key point
2. Creates a logical connection to the next topic
3. Smoothly hands off to ${nextHost.name}
4. Uses your distinctive hosting style

Generate a concise transition (30-50 words) that makes the flow feel seamless and professional.`;
};

/**
 * Generate fallback transition if AI generation fails
 */
const generateFallbackTransition = (
  host: Host,
  currentStory: any,
  nextStory: any
): string => {
  const transitions = [
    `And speaking of change, let's look at another development that's been making waves.`,
    `That's not the only story shaping our world today. Let's turn to another important development.`,
    `This connects to a broader pattern we're seeing. Here's another piece of the puzzle.`,
    `While we're on this topic, there's another angle worth exploring.`,
    `And that brings us to our next story, which adds another dimension to what we're seeing.`
  ];
  
  return transitions[Math.floor(Math.random() * transitions.length)];
};

const writeConclusion = async (headlines: any[]): Promise<string> => {
  console.log("Writing conclusion...");

  // Initialize OpenRouter client
  const openRouterClient = new OpenRouterClient();
  
  let retries = 0;
  let response;

  while (retries < MAX_RETRIES) {
    try {
      const basePrompt = PROMPTS.EP_OUTRO.replace(
        "{HEADLINES}",
        headlines.join("\n")
      )
        .replace("{HOST_PERSONALITY}", HOSTS.ADAM.personality)
        .replace("{HOST_NAME}", HOSTS.ADAM.name);
      
      // Convert to modern chat completion format
      const systemPrompt = `You are ${HOSTS.ADAM.name}, an expert podcast host with the following personality: ${HOSTS.ADAM.personality}. You are writing the conclusion segment for the Super Wire podcast.`;
      const userPrompt = basePrompt;
      
      // Use OpenRouter with GPT-4o for script generation
      response = await openRouterClient.completeTask(
        'script' as TaskType, // Routes to GPT-4o - using string literal due to enum issue
        userPrompt,
        {
          systemPrompt,
          temperature: 0.7,
          maxTokens: 500, // Reasonable limit for podcast conclusion
          trackCosts: true
        }
      );
      break;
    } catch (error: any) {
      console.error(`Error writing conclusion: ${error.message}`);
      retries++;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }

  if (retries === MAX_RETRIES) {
    throw new Error(`Failed to write conclusion after ${MAX_RETRIES} retries`);
  }

  if (!response || !response.content) {
    throw new Error("No conclusion generated");
  }

  // Log cost information for monitoring
  if (response.cost) {
    console.log(`Conclusion generation cost: $${response.cost.toFixed(4)} using ${response.model}`);
  }

  return response.content;
};

type Episode = {
  intro: string;
  segments: string[];
  conclusion: string;
};

const writeEpisode = async (stories: any[]): Promise<Episode> => {
  console.log("Writing episode...");

  const headlines = stories.map(
    (story) => story.title + " :: " + story.description
  );
  const intro = await writeIntroduction(headlines);

  let segments = [];

  // Generate segments with enhanced narratives - enhanced with historical context and predictions
  let hosts = [];
  for (let i = 0; i < stories.length; i++) {
    const host = i % 2 === 0 ? HOSTS.DALLAS : HOSTS.JORDAN;
    hosts.push(host);
    const segment = await writeSegment(stories[i].content, host, {
      includeHistoricalContext: true,
      includePredictions: true,
      targetLength: 800 // Richer narratives with more content
    });
    segments.push(segment);
  }

  // Generate smooth transitions between segments
  const transitions = await generateTransitions(segments, stories, hosts);
  console.log(`Generated ${transitions.length} transitions for smoother flow`);

  const conclusion = await writeConclusion(headlines);

  const episode = { intro, segments, transitions, conclusion };
  console.log(episode);

  return episode;
};

const EPISODES_DIR = "./public/episodes";

const recordEpisode = async (episode: Episode): Promise<void> => {
  console.log("Recording episode...");

  const { intro, segments, conclusion } = episode;

  const timestamp = new Date().toISOString();

  // Process intro
  let introData: ArrayBuffer;
  
  if (shouldUseTTS()) {
    // Use OpenAI TTS (12x cheaper)
    console.log("Using OpenAI TTS for intro generation");
    const result = await generateAudioForHost(intro, 'ADAM', 'hd');
    if (result.success && result.audioBuffer) {
      introData = result.audioBuffer.buffer;
      console.log(`Intro generated with OpenAI TTS: ${result.characterCount} chars, $${result.cost?.toFixed(4)}`);
    } else {
      throw new Error(`Failed to generate intro audio: ${result.error}`);
    }
  } else {
    // Fallback to ElevenLabs
    console.log("Using ElevenLabs for intro generation");
    const introRes = await fetch(
      `${TEXT_TO_SPEECH_BASE_ENDPOINT}/${HOSTS.ADAM.voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVEN_LABS_API_KEY,
        } as HeadersInit,
        body: JSON.stringify({
          text: intro,
        }),
      }
    );
    introData = await introRes.arrayBuffer();
  }

  // Generate filename
  let filename = `${timestamp}-00-intro.mp3`;

  fs.writeFile(`${EPISODES_DIR}/${filename}`, Buffer.from(introData), (err) => {
    if (err) throw err;
    console.log("The intro audio has been saved!");
  });

  // Process segments
  // TODO: Alternate segments between hosts Adam, Domi, Arnold, Elli, maybe Bella and Antoni
  for (let i = 0; i < segments.length; i++) {
    let segmentData: ArrayBuffer;
    const hostName = i % 2 === 0 ? 'DALLAS' : 'JORDAN';
    
    if (shouldUseTTS()) {
      // Use OpenAI TTS (12x cheaper)
      console.log(`Using OpenAI TTS for segment ${i + 1} with host ${hostName}`);
      const result = await generateAudioForHost(segments[i], hostName, 'standard');
      if (result.success && result.audioBuffer) {
        segmentData = result.audioBuffer.buffer;
        console.log(`Segment ${i + 1} generated with OpenAI TTS: ${result.characterCount} chars, $${result.cost?.toFixed(4)}`);
      } else {
        throw new Error(`Failed to generate segment ${i + 1} audio: ${result.error}`);
      }
    } else {
      // Fallback to ElevenLabs
      console.log(`Using ElevenLabs for segment ${i + 1}`);
      const hostEndpoint =
        i % 2 === 0
          ? `${TEXT_TO_SPEECH_BASE_ENDPOINT}/${HOSTS.DALLAS.voiceId}`
          : `${TEXT_TO_SPEECH_BASE_ENDPOINT}/${HOSTS.JORDAN.voiceId}`;
      const segmentRes = await fetch(hostEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVEN_LABS_API_KEY,
        } as HeadersInit,
        body: JSON.stringify({
          text: segments[i],
        }),
      });
      segmentData = await segmentRes.arrayBuffer();
    }

    // Generate filename
    filename = `${timestamp}-0${i}-segment.mp3`;

    fs.writeFile(
      `${EPISODES_DIR}/${filename}`,
      Buffer.from(segmentData),
      (err) => {
        if (err) throw err;
        console.log("The segment audio has been saved!");
      }
    );
  }

  // Process conclusion
  let conclusionData: ArrayBuffer;
  
  if (shouldUseTTS()) {
    // Use OpenAI TTS (12x cheaper)
    console.log("Using OpenAI TTS for conclusion generation");
    const result = await generateAudioForHost(conclusion, 'ADAM', 'hd');
    if (result.success && result.audioBuffer) {
      conclusionData = result.audioBuffer.buffer;
      console.log(`Conclusion generated with OpenAI TTS: ${result.characterCount} chars, $${result.cost?.toFixed(4)}`);
    } else {
      throw new Error(`Failed to generate conclusion audio: ${result.error}`);
    }
  } else {
    // Fallback to ElevenLabs
    console.log("Using ElevenLabs for conclusion generation");
    const conclusionRes = await fetch(
      `${TEXT_TO_SPEECH_BASE_ENDPOINT}/${HOSTS.ADAM.voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVEN_LABS_API_KEY,
        } as HeadersInit,
        body: JSON.stringify({
          text: conclusion,
        }),
      }
    );
    conclusionData = await conclusionRes.arrayBuffer();
  }

  // Generate filename
  filename = `${timestamp}-99-conclusion.mp3`;

  fs.writeFile(
    `${EPISODES_DIR}/${filename}`,
    Buffer.from(conclusionData),
    (err) => {
      if (err) throw err;
      console.log("The conclusion audio has been saved!");
    }
  );

  console.log("Stitching files together with enhanced quality...");

  let filenames: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    filenames.push(`${EPISODES_DIR}/${timestamp}-0${i}-segment.mp3`);
  }

  filenames.unshift(`${EPISODES_DIR}/${timestamp}-00-intro.mp3`);
  filenames.push(`${EPISODES_DIR}/${timestamp}-99-conclusion.mp3`);
  const mergedFilename = `${EPISODES_DIR}/${timestamp}-episode.mp3`;

  // Build filter_complex chain for enhanced audio concatenation
  let filterComplex = '';
  let inputMap = '';
  
  // Create FFmpeg command with multiple inputs
  const ffmpegCommand = ffmpeg();
  
  // Add each file as separate input for filter_complex processing
  filenames.forEach((filename, index) => {
    ffmpegCommand.input(filename);
    inputMap += `[${index}:a]`;
  });
  
  // Build concat filter with proper audio stream concatenation
  // concat=n=X:v=0:a=1 where X is number of files, v=0 means no video, a=1 means audio output
  filterComplex = `${inputMap}concat=n=${filenames.length}:v=0:a=1[out]`;
  
  ffmpegCommand
    .complexFilter([filterComplex])
    .map('[out]') // Map the output of the filter
    .audioCodec('libmp3lame') // Use high-quality MP3 encoder instead of copy
    .audioBitrate('128k') // Set consistent 128kbps bitrate for podcast quality
    .audioFrequency(44100) // Standard 44.1kHz sample rate
    .format('mp3')
    .on("start", (commandLine) => {
      console.log("FFmpeg command:", commandLine);
    })
    .on("end", async () => {
      console.log("Enhanced audio merging complete!");
      
      try {
        // Upload to Vercel Blob Storage (preferred) or Firebase (fallback)
        if (isBlobStorageConfigured()) {
          // Read the merged file
          const audioBuffer = await fs.promises.readFile(mergedFilename);
          const episodeFilename = `episode-${timestamp}.mp3`;
          
          const result = await uploadEpisodeToBlob(audioBuffer, episodeFilename);
          
          if (result.success) {
            console.log("Episode uploaded to Vercel Blob Storage:", result.url);
          } else {
            console.error("Failed to upload to Vercel Blob:", result.error);
            // Fall through to Firebase fallback if available
            if (firebaseInitialized) {
              const bucket = firebase.storage().bucket();
              await bucket.upload(mergedFilename, {
                destination: `${timestamp}-episode.mp3`,
              });
              console.log("Episode uploaded to Firebase Storage (fallback)");
            }
          }
        } else if (firebaseInitialized) {
          // Fallback to Firebase if Vercel Blob not configured
          const bucket = firebase.storage().bucket();
          await bucket.upload(mergedFilename, {
            destination: `${timestamp}-episode.mp3`,
          });
          console.log("Episode uploaded to Firebase Storage");
        } else {
          console.log("No storage configured - episode saved locally at:", mergedFilename);
        }

        // Delete all files in EPISODES_DIR
        fs.readdir(EPISODES_DIR, (err, files) => {
          if (err) {
            console.error("Error reading episodes directory for cleanup:", err);
            return;
          }

          files.forEach((file) => {
            const filePath = path.join(EPISODES_DIR, file);

            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Error deleting file ${filePath}:`, err);
              } else {
                console.log(`Deleted file ${filePath}`);
              }
            });
          });
        });
      } catch (error) {
        console.error("Error in post-processing:", error);
      }
    })
    .on("error", (err) => {
      console.error("Error merging files with filter_complex:", err);
      console.error("FFmpeg error details:", err.message);
      
      // Fallback to simple concatenation if filter_complex fails
      console.log("Falling back to simple concatenation...");
      ffmpeg()
        .input("concat:" + filenames.join("|"))
        .audioCodec("copy")
        .on("end", async () => {
          console.log("Fallback merging complete!");
          try {
            // Upload to Vercel Blob Storage (preferred) or Firebase (fallback)
            if (isBlobStorageConfigured()) {
              const audioBuffer = await fs.promises.readFile(mergedFilename);
              const episodeFilename = `episode-${timestamp}.mp3`;
              
              const result = await uploadEpisodeToBlob(audioBuffer, episodeFilename);
              
              if (result.success) {
                console.log("Episode uploaded to Vercel Blob Storage:", result.url);
              } else if (firebaseInitialized) {
                // Fallback to Firebase if Blob upload fails
                const bucket = firebase.storage().bucket();
                await bucket.upload(mergedFilename, {
                  destination: `${timestamp}-episode.mp3`,
                });
                console.log("Episode uploaded to Firebase Storage (fallback)");
              }
            } else if (firebaseInitialized) {
              const bucket = firebase.storage().bucket();
              await bucket.upload(mergedFilename, {
                destination: `${timestamp}-episode.mp3`,
              });
            } else {
              console.log("Firebase not initialized - fallback episode saved locally at:", mergedFilename);
            }
          } catch (error) {
            console.error("Error uploading fallback file:", error);
          }
        })
        .on("error", (fallbackErr) => console.error("Fallback merge also failed:", fallbackErr))
        .saveToFile(mergedFilename);
    })
    .on("progress", (progress) => {
      console.log(`Processing: ${Math.round(progress.percent || 0)}% done`);
    })
    .saveToFile(mergedFilename);
};

const scrapeStoryContent = async (headlines: any[]): Promise<any[]> => {
  console.log("Scraping story content...");
  console.log("headlines:", headlines);
  let stories = [];

  // Collect source content for headlines
  for (const headline of headlines) {
    console.log("headline:", headline);
    const url = headline.url;
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    let article = $("article").text();
    console.log("article:", article);

    // If article contains no content, look for divs with class "Article"
    if (article.length === 0) {
      article = $(".Article").text();
      console.log(".Article :: article:", article);
      if (article.length === 0) {
        article = $(".article").text();
        console.log(".article :: article:", article);
        if (article.length === 0) {
          article = $(".ArticleBody").text();
          console.log(".ArticleBody :: article:", article);
          if (article.length === 0) {
            article = $(".article-body").text();
            console.log(".article-body :: article:", article);
            if (article.length === 0) {
              // If no article content is found, use the description
              article = headline.description;
              console.log("headline.description :: article:", article);
            }
          }
        }
      }
    }

    // Format the article
    // - Remove newlines
    // - Remove extra spaces
    // - Remove HTML tags
    article = article.replace(/(\r\n|\n|\r)/gm, "");
    article = article.replace(/\s+/g, " ");
    article = article.replace(/<[^>]*>/g, "");
    article = article.replace(/ADVERTISEMENT/g, "");
    console.log("article, post-replacements:", article);

    stories.push({
      source: headline.source.name,
      title: headline.title,
      description: headline.description,
      publishedAt: headline.publishedAt,
      url: headline.url,
      content: article.trim(),
    });
  }

  return stories;
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const headlines = await getTopHeadlines();
    const stories = await scrapeStoryContent(headlines);
    const episode = await writeEpisode(stories);
    await recordEpisode(episode);
    res.status(200).json({ message: "Episode recorded!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error });
  }
};

// Get all of the mp3 files in the public directory
const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log("Handling GET request");

  // Get episodes from Firebase Storage
  const bucket = firebase.storage().bucket();
  const [files] = await bucket.getFiles();

  const episodes = files.map((file) => {
    return {
      name: file.name,
      url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
    };
  });

  res.status(200).json({ episodes });
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      return handleGet(req, res);
    case "POST":
      return handlePost(req, res);
    default:
      res.status(405).json({ name: "Method Not Allowed" });
  }
}
