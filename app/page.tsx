"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { storage } from "../pages/_app";
import { getDownloadURL, ref } from "firebase/storage";
import ArticleCard, { ArticleGrid } from "./components/ArticleCard";
import ContentTabs, { Tab } from "./components/ContentTabs";
import CalendarView, { CompactCalendar } from "./components/CalendarView";

// Lazy load AudioPlayer to reduce initial bundle size
const AudioPlayer = dynamic(
  () => import("./components/AudioPlayer"),
  {
    loading: () => (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    ),
    ssr: false // Disable SSR for AudioPlayer since it uses browser APIs
  }
);

// Content type interfaces
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

interface TodayContent {
  date: string;
  articles: Article[];
  opeds: OpEd[];
  brief: DailyBrief | null;
  episode: Episode | null;
}

// Content tabs
type ContentTab = "overview" | "articles" | "opinions" | "brief" | "podcast";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ContentTab>("overview");
  const [todayContent, setTodayContent] = useState<TodayContent | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showCalendar, setShowCalendar] = useState(false);

  // Fetch today's content
  useEffect(() => {
    fetchTodayContent();
    fetchEpisodes();
  }, []);

  const fetchTodayContent = async () => {
    try {
      // For now, generate mock data since Convex isn't fully configured
      const today = new Date().toISOString().split('T')[0];
      
      // Mock data for demonstration
      const mockContent: TodayContent = {
        date: today,
        articles: [
          {
            id: "1",
            headline: "Major Climate Summit Reaches Historic Agreement",
            excerpt: "World leaders commit to unprecedented action on climate change with binding targets for 2030.",
            content: "Full article content would go here...",
            readTime: 5,
            sources: ["Reuters", "AP"],
            createdAt: new Date().toISOString()
          },
          {
            id: "2", 
            headline: "Tech Giants Report Record Earnings Despite Economic Concerns",
            excerpt: "Major technology companies exceed analyst expectations with strong Q4 performance.",
            content: "Full article content would go here...",
            readTime: 4,
            sources: ["Bloomberg", "WSJ"],
            createdAt: new Date().toISOString()
          },
          {
            id: "3",
            headline: "Breakthrough in Renewable Energy Storage Technology",
            excerpt: "Scientists develop new battery technology that could revolutionize grid-scale energy storage.",
            content: "Full article content would go here...",
            readTime: 6,
            sources: ["Nature", "MIT News"],
            createdAt: new Date().toISOString()
          }
        ],
        opeds: [
          {
            id: "1",
            title: "The Future of Work in an AI-Driven Economy",
            thesis: "We must reimagine education and social safety nets to prepare for dramatic workforce changes.",
            content: "Full op-ed content would go here...",
            author: "Adam",
            readTime: 8,
            createdAt: new Date().toISOString()
          },
          {
            id: "2",
            title: "Why Community-Led Climate Action Matters More Than Ever",
            thesis: "Global agreements are important, but local initiatives drive real change.",
            content: "Full op-ed content would go here...",
            author: "Dallas",
            readTime: 7,
            createdAt: new Date().toISOString()
          }
        ],
        brief: {
          id: "1",
          date: today,
          summary: "Today's news covers historic climate agreements, strong tech earnings, and breakthrough energy storage technology. Key themes include sustainability, economic resilience, and technological innovation.",
          keyPoints: [
            "195 countries commit to 50% emissions reduction by 2030",
            "Tech sector shows resilience with average 15% revenue growth",
            "New battery technology achieves 95% efficiency at scale",
            "Global markets respond positively to climate commitments",
            "Energy storage breakthrough could accelerate renewable adoption"
          ]
        },
        episode: null // Will be populated from episodes list
      };

      setTodayContent(mockContent);
    } catch (error) {
      console.error("Error fetching today's content:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEpisodes = async () => {
    try {
      const res = await fetch("/api/episodes");
      const data = await res.json();
      
      if (data.episodes && data.episodes.length > 0) {
        const sortedEpisodes = data.episodes
          .map((ep: any) => ({
            ...ep,
            date: ep.name.replace("-episode.mp3", "").replace("episode-", "")
          }))
          .sort((a: Episode, b: Episode) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        
        setEpisodes(sortedEpisodes);
        
        // Check if today has an episode
        const today = new Date().toISOString().split('T')[0];
        const todayEpisode = sortedEpisodes.find((ep: Episode) => 
          ep.date.startsWith(today)
        );
        
        if (todayEpisode && todayContent) {
          setTodayContent({
            ...todayContent,
            episode: todayEpisode
          });
        }
      }
    } catch (error) {
      console.error("Error fetching episodes:", error);
    }
  };

  const generateContent = async () => {
    setGeneratingContent(true);
    try {
      const response = await fetch("/api/cron/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret'}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Content generation completed:", result);
        // Refresh content after generation
        await fetchTodayContent();
        await fetchEpisodes();
      } else {
        console.error("Generation failed:", await response.text());
      }
    } catch (error) {
      console.error("Error generating content:", error);
    } finally {
      setGeneratingContent(false);
    }
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric", 
      month: "long",
      day: "numeric"
    });
  };

  const formatTime = (date: string): string => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading today's content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Superwire</h1>
              <p className="text-sm text-gray-600 mt-1">
                AI-Powered News & Analysis
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {formatDate(todayContent?.date || new Date().toISOString())}
              </p>
              {process.env.NODE_ENV === "development" && (
                <button
                  onClick={generateContent}
                  disabled={generatingContent}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                >
                  {generatingContent ? "Generating..." : "Generate Content"}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>


      {/* Content Area with Tabs */}
      <ContentTabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "articles", label: "Articles", count: todayContent?.articles.length },
          { id: "opinions", label: "Op-Eds", count: todayContent?.opeds.length },
          { id: "brief", label: "Daily Brief" },
          { id: "podcast", label: "Podcast" },
          { id: "archive", label: "Archive" }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as ContentTab)}
        sticky={true}
        contentClassName="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        renderContent={(tabId) => (
          <>
            {/* Overview Tab */}
            {tabId === "overview" && todayContent && (
          <div className="space-y-8">
            {/* Today's Podcast Episode */}
            {todayContent.episode && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Podcast</h2>
                <AudioPlayer
                  episodeName={todayContent.episode.name}
                  episodeUrl={todayContent.episode.url}
                  episodeDate={todayContent.episode.date}
                  duration={todayContent.episode.duration}
                  autoLoad={false}
                />
              </div>
            )}
            
            {/* Daily Brief Card */}
            {todayContent.brief && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Today's Brief</h2>
                <p className="text-gray-700 mb-4">{todayContent.brief.summary}</p>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Key Points:</h3>
                  <ul className="space-y-1">
                    {todayContent.brief.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span className="text-gray-700 text-sm">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Top Stories Grid */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Top Stories</h2>
              <ArticleGrid>
                {todayContent.articles.slice(0, 3).map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    variant="compact"
                    onClick={() => setActiveTab("articles")}
                  />
                ))}
              </ArticleGrid>
            </div>

            {/* Opinion Section */}
            {todayContent.opeds.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Opinions</h2>
                <div className="space-y-4">
                  {todayContent.opeds.slice(0, 2).map((oped) => (
                    <div key={oped.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-2">{oped.title}</h3>
                      <p className="text-gray-700 text-sm italic mb-3">"{oped.thesis}"</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>By {oped.author}</span>
                        <span>{oped.readTime} min read</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
            )}

            {/* Articles Tab */}
            {tabId === "articles" && todayContent && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Today's Articles</h2>
            <ArticleGrid columns={1}>
              {todayContent.articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  variant="full"
                  showDate={true}
                />
              ))}
            </ArticleGrid>
          </div>
            )}

            {/* Op-Eds Tab */}
            {tabId === "opinions" && todayContent && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Today's Op-Eds</h2>
            <div className="grid grid-cols-1 gap-6">
              {todayContent.opeds.map((oped) => (
                <div key={oped.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {oped.title}
                  </h3>
                  <p className="text-gray-700 italic mb-4">"{oped.thesis}"</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>By {oped.author}</span>
                    <span>{oped.readTime} min read</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
            )}

            {/* Daily Brief Tab */}
            {tabId === "brief" && todayContent?.brief && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Daily Brief</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 text-lg leading-relaxed mb-6">
                  {todayContent.brief.summary}
                </p>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Points</h3>
                <ul className="space-y-3">
                  {todayContent.brief.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-blue-500 mr-3 text-lg">•</span>
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
            )}

            {/* Podcast Tab */}
            {tabId === "podcast" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Podcast Episodes</h2>
            {episodes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-600">No episodes available yet.</p>
                {process.env.NODE_ENV === "development" && (
                  <p className="text-sm text-gray-500 mt-2">
                    Generate content to create your first episode.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {episodes.map((episode) => (
                  <AudioPlayer
                    key={episode.name}
                    episodeName={episode.name}
                    episodeUrl={episode.url}
                    episodeDate={episode.date}
                    duration={episode.duration}
                    autoLoad={false}
                  />
                ))}
              </div>
            )}
          </div>
            )}

            {/* Archive Tab with Calendar */}
            {tabId === "archive" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Content Archive</h2>
                  <div className="flex items-center gap-4">
                    <a
                      href="/archive"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Browse Full Archive →
                    </a>
                    <button
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {showCalendar ? "Hide Calendar" : "Show Calendar"}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Calendar View */}
                  <div className={showCalendar ? "lg:col-span-1" : "hidden"}>
                    <CalendarView
                      availableDates={episodes.map(ep => ep.date)}
                      selectedDate={selectedDate}
                      onDateSelect={(date) => {
                        setSelectedDate(date);
                        // Could load content for selected date here
                      }}
                    />
                  </div>
                  
                  {/* Content for selected date */}
                  <div className={showCalendar ? "lg:col-span-2" : "lg:col-span-3"}>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Content for {new Date(selectedDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </h3>
                      
                      {/* Find episodes for selected date */}
                      {(() => {
                        const dateEpisodes = episodes.filter(ep => 
                          ep.date.startsWith(selectedDate)
                        );
                        
                        if (dateEpisodes.length > 0) {
                          return (
                            <div className="space-y-4">
                              <h4 className="font-medium text-gray-700">Podcast Episodes</h4>
                              {dateEpisodes.map(episode => (
                                <AudioPlayer
                                  key={episode.name}
                                  episodeName={episode.name}
                                  episodeUrl={episode.url}
                                  episodeDate={episode.date}
                                  duration={episode.duration}
                                  autoLoad={false}
                                />
                              ))}
                            </div>
                          );
                        }
                        
                        return (
                          <p className="text-gray-500 text-center py-8">
                            No content available for this date.
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                
                {/* Compact Calendar for smaller screens */}
                <div className="lg:hidden">
                  <CompactCalendar
                    availableDates={episodes.map(ep => ep.date)}
                    selectedDate={selectedDate}
                    onDateSelect={(date) => {
                      setSelectedDate(date);
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      />
    </div>
  );
}