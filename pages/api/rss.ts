import { NextApiRequest, NextApiResponse } from "next";
import RSS from "rss";
import { getAllEpisodes } from "../../src/lib/vercel-blob";

interface Episode {
  name: string;
  url: string;
  date: Date;
  title: string;
  description: string;
  duration?: number;
  size?: number;
}

// Format duration from seconds to HH:MM:SS
function formatDuration(seconds?: number): string {
  if (!seconds) return "00:30:00"; // Default 30 minutes if unknown
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [hours, minutes, secs]
    .map(val => String(val).padStart(2, '0'))
    .join(':');
}

// Parse episode date from filename
function parseEpisodeDate(filename: string): Date {
  // Extract date from filename pattern: episode-YYYY-MM-DDTHH:MM:SS.sssZ.mp3
  const dateMatch = filename.match(/episode-(.+?)\.mp3/);
  if (dateMatch && dateMatch[1]) {
    try {
      return new Date(dateMatch[1]);
    } catch {
      return new Date();
    }
  }
  return new Date();
}

// Generate episode title from date
function generateEpisodeTitle(date: Date, index: number): string {
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  return `Episode ${index}: ${dateStr}`;
}

// Generate episode description
function generateEpisodeDescription(date: Date): string {
  const dateStr = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  
  return `AI-powered news podcast for ${dateStr}. Today's episode covers the latest developments in technology, politics, climate, and global affairs with analysis from our AI hosts Adam, Dallas, and Jordan.`;
}

// Fetch all episodes from Vercel Blob Storage
async function fetchAllEpisodes(): Promise<Episode[]> {
  try {
    const episodesList = await getAllEpisodes();
    
    return episodesList.map((episode, index) => {
      const fileName = episode.pathname.replace('episodes/', '');
      const parsedDate = parseEpisodeDate(fileName);
      
      return {
        name: fileName,
        url: episode.url,
        date: parsedDate,
        title: generateEpisodeTitle(parsedDate, episodesList.length - index),
        description: generateEpisodeDescription(parsedDate),
        size: episode.size,
        duration: 1200 // Default 20 minutes
      };
    });
  } catch (error) {
    console.error('Error fetching episodes from Vercel Blob:', error);
    return [];
  }
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
    // Fetch all episodes
    const episodes = await fetchAllEpisodes();
    
    // Create RSS feed
    const feed = new RSS({
      title: "Superwire - AI-Powered News Podcast",
      description: "Daily AI-generated news podcast covering technology, politics, climate, and global affairs with unique perspectives from our AI hosts.",
      generator: "Superwire",
      feed_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://superwire.news'}/api/rss`,
      site_url: process.env.NEXT_PUBLIC_BASE_URL || 'https://superwire.news',
      image_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://superwire.news'}/podcast-cover.jpg`,
      language: "en",
      categories: ["News", "Technology", "Politics", "Science"],
      ttl: 60, // Cache for 60 minutes
      copyright: `Copyright ${new Date().getFullYear()} Superwire`,
      pubDate: episodes.length > 0 ? episodes[0].date : new Date(),
      custom_namespaces: {
        'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
        'content': 'http://purl.org/rss/1.0/modules/content/'
      },
      custom_elements: [
        {'itunes:author': 'Superwire AI'},
        {'itunes:summary': 'Daily AI-generated news podcast with unique perspectives on current events'},
        {'itunes:owner': [
          {'itunes:name': 'Superwire'},
          {'itunes:email': 'podcast@superwire.news'}
        ]},
        {'itunes:explicit': 'no'},
        {'itunes:category': [
          {_attr: {text: 'News'}},
          {'itunes:category': {_attr: {text: 'Daily News'}}}
        ]},
        {'itunes:category': [
          {_attr: {text: 'Technology'}}
        ]},
        {'itunes:image': {
          _attr: {
            href: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://superwire.news'}/podcast-cover.jpg`
          }
        }},
        {'itunes:type': 'episodic'},
        {'itunes:complete': 'no'}
      ]
    });

    // Add episodes to feed
    episodes.forEach((episode, index) => {
      feed.item({
        title: episode.title,
        description: episode.description,
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://superwire.news'}/episode/${episode.date.toISOString().split('T')[0]}`,
        guid: episode.url,
        categories: ["News", "AI", "Technology"],
        author: "Superwire AI",
        date: episode.date,
        enclosure: {
          url: episode.url,
          size: episode.size,
          type: 'audio/mpeg'
        },
        custom_elements: [
          {'itunes:author': 'Superwire AI'},
          {'itunes:subtitle': `Daily news for ${episode.date.toLocaleDateString()}`},
          {'itunes:summary': episode.description},
          {'itunes:duration': formatDuration(episode.duration)},
          {'itunes:episode': episodes.length - index},
          {'itunes:episodeType': 'full'},
          {'itunes:explicit': 'no'}
        ]
      });
    });

    // Generate XML
    const xml = feed.xml({ indent: true });

    // Set response headers
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send RSS feed
    res.status(200).send(xml);
    
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}