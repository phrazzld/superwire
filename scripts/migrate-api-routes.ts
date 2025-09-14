#!/usr/bin/env npx tsx

import fs from 'fs';
import path from 'path';

// Script to help migrate Pages API routes to App Router

const apiRoutesToMigrate = [
  'pages/api/episodes.ts',
  'pages/api/rss.ts', 
  'pages/api/feed.json.ts',
  'pages/api/test-conclusion.ts',
  'pages/api/articles/[id]/first-paragraph.ts',
  'pages/api/articles/[id]/remaining-content.ts',
  'pages/api/content/[date].ts',
  'pages/api/cron/generate.ts'
];

console.log(`Found ${apiRoutesToMigrate.length} API routes to migrate:\n`);
apiRoutesToMigrate.forEach(route => {
  const newPath = route
    .replace('pages/api', 'app/api')
    .replace('.ts', '/route.ts')
    .replace('/feed.json/', '/feed.json/');
    
  console.log(`  ${route} → ${newPath}`);
});

console.log('\nMigration steps for each route:');
console.log('1. Create directory: mkdir -p app/api/[route]');
console.log('2. Convert handler to export async function GET/POST/etc');
console.log('3. Replace NextApiRequest/Response with Request/Response');
console.log('4. Update dynamic params to use await params');
console.log('5. Test with curl to verify response format matches');