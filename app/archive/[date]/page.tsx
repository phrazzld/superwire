import React from 'react';
import ArticleCard, { ArticleGrid } from '../../components/ArticleCard';

// Types
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

interface ArchivePageProps {
  params: { date: string };
}

// Simple client component for archive page
export default function ArchivePage({ params }: ArchivePageProps) {
  const { date } = params;
  
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Mock content for now
  const mockArticles: Article[] = [
    {
      id: `article-1-${date}`,
      headline: `AI Breakthrough Announced`,
      excerpt: "Revolutionary artificial intelligence system demonstrates unprecedented capabilities.",
      content: "Full article content here...",
      readTime: 5,
      sources: ["Reuters", "MIT"],
      createdAt: `${date}T09:00:00Z`
    }
  ];
  
  const mockBrief: DailyBrief = {
    id: `brief-${date}`,
    summary: `Major developments in AI and climate policy dominated headlines...`,
    keyPoints: [
      "AI system achieves new milestone",
      "Climate summit produces agreements",
      "Economic indicators show growth"
    ],
    date: date
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Superwire Archive</h1>
              <p className="mt-1 text-lg text-gray-600">{formattedDate}</p>
            </div>
            <a 
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Today
            </a>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Daily Brief */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Daily Brief</h2>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-700 mb-4">{mockBrief.summary}</p>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Key Points:</h3>
              <ul className="space-y-2">
                {mockBrief.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
        
        {/* Articles */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Articles</h2>
          <ArticleGrid columns={2}>
            {mockArticles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                variant="full"
              />
            ))}
          </ArticleGrid>
        </section>
      </main>
    </div>
  );
}