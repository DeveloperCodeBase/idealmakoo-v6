import { PUBLIC_CACHE, allowedAsset, cacheableResponse } from './sw-policy.js';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('idealmakoo-public-assets-') && key !== PUBLIC_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (!allowedAsset(event.request.url, self.location.origin, event.request.method) || event.request.headers.has('Authorization') || event.request.headers.has('Range')) return;
  event.respondWith((async () => {
    let response;
    try {
      response = await fetch(event.request);
    } catch (error) {
      let cached;
      try { cached = await caches.match(event.request, {cacheName:PUBLIC_CACHE}); } catch { /* Optional cache may be unavailable. */ }
      if (cached) return cached;
      throw error;
    }
    try {
      const cache = await caches.open(PUBLIC_CACHE);
      if (cacheableResponse(response)) await cache.put(event.request, response.clone());
      else await cache.delete(event.request);
    } catch { /* Storage errors must never block an online image or font. */ }
    return response;
  })());
});
