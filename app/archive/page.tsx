import React from 'react';
import Link from 'next/link';

// Generate list of last 30 days
function getArchiveDates() {
  const dates = [];
  const today = new Date();
  
  for (let i = 1; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push({
      dateString: date.toISOString().split('T')[0],
      displayDate: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      shortDate: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    });
  }
  
  return dates;
}

// Group dates by week
function groupDatesByWeek(dates: Array<{dateString: string; displayDate: string; shortDate: string}>) {
  const weeks: Array<Array<{dateString: string; displayDate: string; shortDate: string}>> = [];
  let currentWeek: Array<{dateString: string; displayDate: string; shortDate: string}> = [];
  
  dates.forEach((date, index) => {
    currentWeek.push(date);
    
    // Start new week on Sunday or after 7 days
    const dayOfWeek = new Date(date.dateString).getDay();
    if (dayOfWeek === 0 || currentWeek.length === 7) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });
  
  // Add remaining days
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }
  
  return weeks;
}

export default function ArchiveListPage() {
  const dates = getArchiveDates();
  const weeks = groupDatesByWeek(dates);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Superwire Archive</h1>
              <p className="mt-1 text-lg text-gray-600">Browse past editions</p>
            </div>
            <Link 
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Today
            </Link>
          </div>
        </div>
      </header>
      
      {/* Archive Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Last 30 Days</h2>
          
          {/* Calendar-style layout */}
          <div className="space-y-8">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex}>
                <div className="grid grid-cols-7 gap-2">
                  {/* Fill empty days at start of week */}
                  {weekIndex === 0 && week[0] && (
                    Array.from({ length: 7 - week.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-4"></div>
                    ))
                  )}
                  
                  {/* Render days */}
                  {week.map((date) => (
                    <Link
                      key={date.dateString}
                      href={`/archive/${date.dateString}`}
                      className="group relative p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                          {date.shortDate}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(date.dateString).toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* List View Alternative */}
          <div className="mt-12 pt-8 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">List View</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dates.map(date => (
                <Link
                  key={date.dateString}
                  href={`/archive/${date.dateString}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{date.displayDate}</div>
                  <div className="text-sm text-gray-600 mt-1">View full coverage →</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        
        {/* Info Box */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">About the Archive</h3>
          <p className="text-blue-800">
            Browse complete daily coverage from the past 30 days. Each day includes articles, op-eds, 
            daily briefs, and podcast episodes. Older content is automatically archived after 30 days.
          </p>
        </div>
      </main>
    </div>
  );
}