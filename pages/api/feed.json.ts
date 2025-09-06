import { NextApiRequest, NextApiResponse } from 'next';
import * as admin from 'firebase-admin';

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Firebase admin if not already initialized
    if (!admin.apps.length) {
      const serviceAccountKey = process.env.GOOGLE_SERVICE_KEY;
      if (serviceAccountKey) {
        const serviceAccount = JSON.parse(
          Buffer.from(serviceAccountKey, "base64").toString("utf-8")
        );
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: "gs://super-wire.appspot.com/",
        });
      }
    }
    const bucket = admin.storage().bucket();

    // Get episodes from Firebase Storage
    const [files] = await bucket.getFiles({ prefix: 'episodes/' });
    
    const episodes = await Promise.all(
      files
        .filter(file => file.name.endsWith('.mp3'))
        .sort((a, b) => {
          const dateA = a.metadata.timeCreated || '';
          const dateB = b.metadata.timeCreated || '';
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        })
        .slice(0, 50) // Last 50 episodes
        .map(async (file) => {
          const fileName = file.name.split('/').pop() || '';
          const episodeDate = fileName.replace('episode-', '').replace('.mp3', '');
          const formattedDate = new Date(episodeDate).toISOString();
          
          // Get file metadata
          const [metadata] = await file.getMetadata();
          const fileSize = parseInt(metadata.size || '0');
          
          // Generate public URL
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
          
          return {
            id: fileName,
            url: publicUrl,
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
              url: publicUrl,
              mime_type: 'audio/mpeg',
              title: fileName,
              size_in_bytes: fileSize,
              duration_in_seconds: 1200 // Default 20 minutes
            }]
          };
        })
    );

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

    // Set cache headers (1 hour for current content)
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.setHeader('Content-Type', 'application/feed+json');
    
    return res.status(200).json(feed);
  } catch (error) {
    console.error('Error generating JSON feed:', error);
    return res.status(500).json({ 
      error: 'Failed to generate JSON feed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}