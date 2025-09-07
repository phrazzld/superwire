/**
 * Service Worker for Superwire
 * Provides offline access to recent content and optimized caching strategies
 */

const CACHE_NAME = 'superwire-v1';
const OFFLINE_CACHE_NAME = 'superwire-offline-v1';
const CONTENT_CACHE_NAME = 'superwire-content-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.ico',
  '/vercel.svg'
];

// API routes to cache for offline access
const API_ROUTES_TO_CACHE = [
  '/api/articles',
  '/api/episodes',
  '/api/rss'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Network first, falling back to cache
  networkFirst: async (request) => {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      // Return offline page for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/offline.html');
      }
      throw error;
    }
  },

  // Cache first, falling back to network
  cacheFirst: async (request) => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      // Return offline page for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/offline.html');
      }
      throw error;
    }
  },

  // Stale while revalidate
  staleWhileRevalidate: async (request) => {
    const cachedResponse = await caches.match(request);
    
    const fetchPromise = fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(CACHE_NAME);
        cache.then(c => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    });

    return cachedResponse || fetchPromise;
  }
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      // Create offline fallback page
      const offlinePageResponse = new Response(
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Offline - Superwire</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            h1 { font-size: 3rem; margin-bottom: 1rem; }
            p { font-size: 1.2rem; opacity: 0.9; }
            button {
              margin-top: 2rem;
              padding: 1rem 2rem;
              font-size: 1rem;
              background: white;
              color: #667eea;
              border: none;
              border-radius: 0.5rem;
              cursor: pointer;
              transition: transform 0.2s;
            }
            button:hover { transform: scale(1.05); }
          </style>
        </head>
        <body>
          <h1>📡 You're Offline</h1>
          <p>No internet connection detected</p>
          <p>Your recent content is still available in the cache</p>
          <button onclick="window.location.reload()">Try Again</button>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
      
      await cache.put('/offline.html', offlinePageResponse);
      
      // Cache other static assets
      const validAssets = STATIC_ASSETS.filter(asset => asset !== '/offline.html');
      await cache.addAll(validAssets).catch(error => {
        console.warn('[SW] Some static assets could not be cached:', error);
      });
      
      console.log('[SW] Static assets cached');
    })()
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('superwire-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
      
      // Take control of all clients immediately
      await self.clients.claim();
      console.log('[SW] Service worker activated');
    })()
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests with appropriate strategies
  
  // API requests - network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(CACHE_STRATEGIES.networkFirst(request));
    return;
  }

  // Static assets (JS, CSS) - cache first
  if (url.pathname.match(/\.(js|css|woff2?|ttf|otf)$/)) {
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request));
    return;
  }

  // Images - stale while revalidate
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp)$/)) {
    event.respondWith(CACHE_STRATEGIES.staleWhileRevalidate(request));
    return;
  }

  // HTML pages - network first
  if (request.mode === 'navigate' || url.pathname === '/') {
    event.respondWith(CACHE_STRATEGIES.networkFirst(request));
    return;
  }

  // Default - network first
  event.respondWith(CACHE_STRATEGIES.networkFirst(request));
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-content') {
    event.waitUntil(syncContent());
  }
});

// Sync recent content for offline access
async function syncContent() {
  try {
    const cache = await caches.open(CONTENT_CACHE_NAME);
    
    // Cache recent episodes
    const episodesResponse = await fetch('/api/episodes?limit=5');
    if (episodesResponse.ok) {
      await cache.put('/api/episodes?limit=5', episodesResponse);
    }
    
    // Cache recent articles
    const articlesResponse = await fetch('/api/articles?limit=10');
    if (articlesResponse.ok) {
      await cache.put('/api/articles?limit=10', articlesResponse);
    }
    
    console.log('[SW] Content synced for offline access');
  } catch (error) {
    console.error('[SW] Failed to sync content:', error);
  }
}

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_CONTENT') {
    event.waitUntil(
      cacheContent(event.data.urls)
    );
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      clearCache()
    );
  }
});

// Cache specific content URLs
async function cacheContent(urls) {
  const cache = await caches.open(CONTENT_CACHE_NAME);
  await Promise.all(
    urls.map(url => 
      fetch(url)
        .then(response => {
          if (response.ok) {
            return cache.put(url, response);
          }
        })
        .catch(error => console.warn(`[SW] Failed to cache ${url}:`, error))
    )
  );
}

// Clear all caches
async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(name => caches.delete(name))
  );
  console.log('[SW] All caches cleared');
}