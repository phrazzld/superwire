// Test endpoint for verifying conclusion generation with OpenRouter
import { NextRequest, NextResponse } from "next/server";
import { OpenRouterClient, TaskType } from "../../../src/lib/openrouter";
import { HOSTS, PROMPTS } from "../../../constants";

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

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

export async function POST(request: NextRequest) {
  try {
    // Test headlines
    const testHeadlines = [
      "Tech Giants Report Record Earnings Despite Economic Uncertainty",
      "Climate Summit Reaches Historic Agreement on Carbon Reduction",
      "New Study Reveals Breakthrough in Quantum Computing"
    ];

    console.log("Testing conclusion generation with OpenRouter...");
    const conclusion = await writeConclusion(testHeadlines);
    
    console.log("Conclusion generated successfully!");
    
    return NextResponse.json(
      { 
        success: true, 
        conclusion,
        length: conclusion.length,
        model: "GPT-4o via OpenRouter"
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Test failed:", error);
    return NextResponse.json(
      { 
        error: error.message || "Test failed",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Also support GET for simple testing (returns info only)
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: "Test conclusion endpoint",
      description: "POST to this endpoint to test conclusion generation with OpenRouter",
      testHeadlines: [
        "Tech Giants Report Record Earnings Despite Economic Uncertainty",
        "Climate Summit Reaches Historic Agreement on Carbon Reduction",
        "New Study Reveals Breakthrough in Quantum Computing"
      ],
      model: "GPT-4o via OpenRouter"
    },
    { status: 200 }
  );
}

// This is a test endpoint, so we want it to be dynamic
export const dynamic = 'force-dynamic';