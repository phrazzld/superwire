import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint for progressive article loading - first paragraph
 * Returns the first paragraph of an article for immediate display
 */

// Mock article storage - in production, this would fetch from Convex/database
const getArticleFirstParagraph = async (articleId: string): Promise<string | null> => {
  // In production, this would:
  // 1. Fetch from Convex using the article ID
  // 2. Extract the first paragraph from the content
  // 3. Return it for immediate display
  
  // Mock implementation
  const mockArticles: Record<string, string> = {
    'article-1': `The global renewable energy sector has reached a historic milestone, with solar and wind power now accounting for over 30% of worldwide electricity generation. This transformation, occurring faster than most analysts predicted, signals a fundamental shift in how humanity powers its civilization.`,
    
    'article-2': `Breakthrough research in quantum computing has achieved what scientists are calling "quantum advantage" in real-world applications. The development, announced by a consortium of universities and tech companies, demonstrates quantum computers solving optimization problems that would take classical computers millennia to complete.`,
    
    'article-3': `A new international climate agreement has been reached, with 195 nations committing to aggressive carbon reduction targets. The agreement, negotiated over two weeks of intense discussions, includes binding enforcement mechanisms and a $100 billion annual fund for developing nations.`
  };
  
  return mockArticles[articleId] || null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid article ID' });
  }

  try {
    // Add cache headers for CDN
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    const firstParagraph = await getArticleFirstParagraph(id);
    
    if (!firstParagraph) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Return first paragraph with minimal delay
    return res.status(200).json({
      articleId: id,
      content: firstParagraph,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching first paragraph:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch article content',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}