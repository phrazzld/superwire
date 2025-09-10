import { NextApiRequest, NextApiResponse } from "next";
import { getDownloadURL, ref, list } from "firebase/storage";
// Firebase storage removed - using Vercel Blob Storage

// Content type interfaces (matching app/page.tsx)
interface Article {
  id: string;
  headline: string;
  excerpt: string;
  content: string;
  readTime: number;
  sources: string[];
  createdAt: string;
}

interface OpEd {
  id: string;
  title: string;
  thesis: string;
  content: string;
  author: string;
  readTime: number;
  createdAt: string;
}

interface DailyBrief {
  id: string;
  summary: string;
  keyPoints: string[];
  date: string;
}

interface Episode {
  name: string;
  url: string;
  date: string;
  duration?: number;
}

interface ContentByDate {
  date: string;
  articles: Article[];
  opeds: OpEd[];
  brief: DailyBrief | null;
  episodes: Episode[];
}

// Validate date format (YYYY-MM-DD)
function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}

// Fetch episodes from Vercel Blob Storage for the date
async function fetchEpisodesForDate(date: string): Promise<Episode[]> {
  // TODO: Implement Vercel Blob storage fetching
  // Firebase storage has been deprecated in favor of Vercel Blob
  // For now, returning empty array until Blob storage is configured
  return [];
}

// Generate mock data for demonstration
function generateMockContent(date: string): ContentByDate {
  const parsedDate = new Date(date);
  const isToday = new Date().toDateString() === parsedDate.toDateString();
  
  // No content for future dates
  if (parsedDate > new Date()) {
    return {
      date,
      articles: [],
      opeds: [],
      brief: null,
      episodes: []
    };
  }
  
  // Generate some mock content for past/present dates
  const articles: Article[] = isToday ? [
    {
      id: `${date}-1`,
      headline: "Major Climate Summit Reaches Historic Agreement",
      excerpt: "World leaders commit to unprecedented action on climate change with binding targets for 2030.",
      content: "Full article content would go here...",
      readTime: 5,
      sources: ["Reuters", "AP"],
      createdAt: `${date}T09:00:00Z`
    },
    {
      id: `${date}-2`,
      headline: "Tech Giants Report Record Earnings Despite Economic Concerns",
      excerpt: "Major technology companies exceed analyst expectations with strong Q4 performance.",
      content: "Full article content would go here...",
      readTime: 4,
      sources: ["Bloomberg", "WSJ"],
      createdAt: `${date}T10:30:00Z`
    }
  ] : [
    {
      id: `${date}-1`,
      headline: `Historical News from ${parsedDate.toLocaleDateString()}`,
      excerpt: "This is archived content from a previous date.",
      content: "Archived article content...",
      readTime: 3,
      sources: ["Archive"],
      createdAt: `${date}T12:00:00Z`
    }
  ];
  
  const opeds: OpEd[] = isToday ? [
    {
      id: `${date}-op1`,
      title: "The Future of Work in an AI-Driven Economy",
      thesis: "We must reimagine education and social safety nets to prepare for dramatic workforce changes.",
      content: "Full op-ed content would go here...",
      author: "Adam",
      readTime: 8,
      createdAt: `${date}T14:00:00Z`
    }
  ] : [];
  
  const brief: DailyBrief | null = {
    id: `${date}-brief`,
    date,
    summary: isToday 
      ? "Today's news covers historic climate agreements, strong tech earnings, and breakthrough energy storage technology."
      : `Historical brief for ${parsedDate.toLocaleDateString()}`,
    keyPoints: isToday ? [
      "195 countries commit to 50% emissions reduction by 2030",
      "Tech sector shows resilience with average 15% revenue growth",
      "New battery technology achieves 95% efficiency at scale"
    ] : [
      `Key event from ${parsedDate.toLocaleDateString()}`,
      "Historical context item 1",
      "Historical context item 2"
    ]
  };
  
  return {
    date,
    articles,
    opeds,
    brief,
    episodes: [] // Episodes will be fetched from Firebase
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { date } = req.query;
    
    if (typeof date !== "string") {
      return res.status(400).json({
        error: "Invalid date parameter",
        message: "Date must be a string"
      });
    }
    
    // Validate date format
    if (!isValidDateFormat(date)) {
      return res.status(400).json({
        error: "Invalid date format",
        message: "Date must be in YYYY-MM-DD format"
      });
    }
    
    // Check if date is not in the future
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (requestedDate > today) {
      return res.status(404).json({
        error: "Future date",
        message: "Cannot retrieve content for future dates"
      });
    }
    
    // Fetch episodes from Firebase Storage
    const episodes = await fetchEpisodesForDate(date);
    
    // Use mock data for now (will integrate with Convex later)
    const baseContent = generateMockContent(date);
    
    // Combine all content sources
    const content: ContentByDate = {
      date,
      articles: baseContent.articles,
      opeds: baseContent.opeds,
      brief: baseContent.brief,
      episodes
    };
    
    // Add cache headers
    const isToday = new Date().toDateString() === requestedDate.toDateString();
    const cacheControl = isToday 
      ? "public, max-age=3600" // 1 hour for today's content
      : "public, max-age=86400, immutable"; // 24 hours for past content
    
    res.setHeader("Cache-Control", cacheControl);
    res.status(200).json(content);
    
  } catch (error) {
    console.error("Error in content API route:", error);
    
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}