"use client";

import { useEffect, useState, useCallback } from 'react';

/**
 * Hook for managing service worker registration and updates
 */

interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function useServiceWorker() {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    isSupported: false,
    isRegistered: false,
    isUpdateAvailable: false,
    isOffline: !navigator.onLine,
    registration: null
  });

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('[SW] Service worker registered:', registration);

        setStatus(prev => ({
          ...prev,
          isSupported: true,
          isRegistered: true,
          registration
        }));

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setStatus(prev => ({
                  ...prev,
                  isUpdateAvailable: true
                }));
                console.log('[SW] New content available, refresh to update');
              }
            });
          }
        });

        // Check for updates periodically (every hour)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        return registration;
      } catch (error) {
        console.error('[SW] Registration failed:', error);
        return null;
      }
    } else {
      console.log('[SW] Service workers not supported');
      return null;
    }
  }, []);

  // Update service worker
  const updateServiceWorker = useCallback(() => {
    if (status.registration?.waiting) {
      // Tell waiting service worker to skip waiting
      status.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload once the new service worker takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, [status.registration]);

  // Cache specific content for offline access
  const cacheContent = useCallback(async (urls: string[]) => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_CONTENT',
        urls
      });
    }
  }, []);

  // Clear all caches
  const clearCache = useCallback(async () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE'
      });
    }
    
    // Also clear browser caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOffline: false }));
      console.log('[SW] Back online');
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOffline: true }));
      console.log('[SW] Gone offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register on mount
  useEffect(() => {
    registerServiceWorker();
  }, [registerServiceWorker]);

  return {
    ...status,
    updateServiceWorker,
    cacheContent,
    clearCache
  };
}

/**
 * Service Worker provider component
 */
export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const { isUpdateAvailable, updateServiceWorker, isOffline } = useServiceWorker();

  return (
    <>
      {children}
      
      {/* Update notification */}
      {isUpdateAvailable && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <p className="mb-2">New content is available!</p>
          <button
            onClick={updateServiceWorker}
            className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100 transition-colors"
          >
            Update Now
          </button>
        </div>
      )}
      
      {/* Offline indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
          <span className="inline-flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            You're currently offline - showing cached content
          </span>
        </div>
      )}
    </>
  );
}