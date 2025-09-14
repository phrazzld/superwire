import { NextResponse } from 'next/server';
import { getAllEpisodes } from '../../../src/lib/vercel-blob';

// JSON Feed specification: https://www.jsonfeed.org/version/1.1/
interface JSONFeed {
  version: string;
  title: string;
  home_page_url: string;
  feed_url: string;
  description: string;
  user_comment: string;
  icon: string;
  favicon: string;
  authors: Array<{
    name: string;
    url?: string;
  }>;
  language: string;
  items: Array<{
    id: string;
    url: string;
    title: string;
    content_html?: string;
    content_text?: string;
    summary?: string;
    date_published: string;
    date_modified?: string;
    attachments?: Array<{
      url: string;
      mime_type: string;
      title?: string;
      size_in_bytes?: number;
      duration_in_seconds?: number;
    }>;
  }>;
}

export async function GET() {
  try {
    // Get episodes from Vercel Blob Storage
    const episodesList = await getAllEpisodes();
    
    const episodes = episodesList
      .slice(0, 50) // Last 50 episodes
      .map((episode) => {
        const fileName = episode.pathname.replace('episodes/', '');
        const episodeDate = fileName.replace('episode-', '').replace('.mp3', '');
        const formattedDate = new Date(episodeDate).toISOString();
        
        return {
          id: fileName,
          url: episode.url,
          title: `Superwire Daily - ${new Date(episodeDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`,
          content_text: `Today's AI-powered news podcast featuring comprehensive coverage of the day's most important stories.`,
          summary: `Daily news podcast with AI hosts discussing today's top stories`,
          date_published: formattedDate,
          attachments: [{
            url: episode.url,
            mime_type: 'audio/mpeg',
            title: fileName,
            size_in_bytes: episode.size,
            duration_in_seconds: 1200 // Default 20 minutes
          }]
        };
      });

    const feed: JSONFeed = {
      version: 'https://jsonfeed.org/version/1.1',
      title: 'Superwire Daily',
      home_page_url: process.env.SITE_URL || 'https://superwire.news',
      feed_url: `${process.env.SITE_URL || 'https://superwire.news'}/api/feed.json`,
      description: 'AI-powered daily news podcast with unique editorial perspective',
      user_comment: 'This feed allows you to subscribe to Superwire Daily in any JSON Feed compatible app',
      icon: `${process.env.SITE_URL || 'https://superwire.news'}/icon-512.png`,
      favicon: `${process.env.SITE_URL || 'https://superwire.news'}/favicon.ico`,
      authors: [
        { name: 'Adam (AI Host)' },
        { name: 'Dallas (AI Host)' },
        { name: 'Jordan (AI Host)' }
      ],
      language: 'en-US',
      items: episodes
    };

    return NextResponse.json(feed, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Content-Type': 'application/feed+json',
      },
    });
  } catch (error) {
    console.error('Error generating JSON feed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate JSON feed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add caching configuration  
export const revalidate = 300; // Revalidate every 5 minutes