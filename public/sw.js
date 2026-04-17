/**
 * SUIT Wolverhampton — Service Worker (PWA)
 * Enables offline access to key pages and timetable
 */

const CACHE_NAME = 'suit-2026-v6';
const OFFLINE_URLS = [
  '/',
  '/get-help',
  '/timetable',
  '/services',
  '/css/style.css',
  '/js/main.js',
  '/manifest.json'
];

// Install — cache key pages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first; cache assets + home HTML only (never cache arbitrary path HTML)
// so a mistaken index.html fallback for /news-more cannot be stored and replayed as that URL.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response.ok) return response;
        const ct = response.headers.get('content-type') || '';
        const isHtml = ct.includes('text/html');
        const isNavigate = event.request.mode === 'navigate';
        const allowHtmlCache = isHtml && isNavigate && (url.pathname === '/' || url.pathname === '');
        const isAsset =
          /\.(css|js|png|jpe?g|gif|webp|svg|ico|woff2?|json|webmanifest)$/i.test(url.pathname) ||
          url.pathname === '/manifest.json' ||
          url.pathname === '/sw.js';
        if (allowHtmlCache || (!isHtml && isAsset)) {
          try {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          } catch (_) { /* ignore */ }
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (url.pathname === '/' || url.pathname === '') return caches.match('/');
          return new Response(
            '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Offline — SUIT</title></head><body style="font-family:system-ui;padding:2rem;"><p>You appear to be offline.</p><p><a href="/">Back to home</a></p></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        });
      })
  );
});
