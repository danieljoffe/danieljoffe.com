const CACHE_VERSION = 'v3';
const STATIC_CACHE = `danieljoffe-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `danieljoffe-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `danieljoffe-images-${CACHE_VERSION}`;
const FONT_CACHE = `danieljoffe-fonts-${CACHE_VERSION}`;

// Static assets to precache
const PRECACHE_URLS = [
  '/',
  '/about',
  '/projects',
  '/logo.svg',
  '/favicon.ico',
];

// Cache size limits
const IMAGE_CACHE_LIMIT = 50;
const DYNAMIC_CACHE_LIMIT = 30;

// Install event - precache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, FONT_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames.map(cacheName => {
            if (!currentCaches.includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Helper: Limit cache size
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    return limitCacheSize(cacheName, maxItems);
  }
}

// Helper: Determine cache strategy based on request
function getCacheStrategy(request) {
  const url = new URL(request.url);

  // Fonts - cache first, long TTL
  if (
    url.pathname.includes('/fonts/') ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    return { cache: FONT_CACHE, strategy: 'cache-first' };
  }

  // Images - cache first with network fallback
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/i)
  ) {
    return {
      cache: IMAGE_CACHE,
      strategy: 'cache-first',
      limit: IMAGE_CACHE_LIMIT,
    };
  }

  // Static assets (JS, CSS) - skip SW caching
  // Next.js uses content-hashed filenames with proper cache headers,
  // so browser HTTP cache handles these optimally already.
  if (url.pathname.startsWith('/_next/static/')) {
    return { strategy: 'network-only' };
  }

  // API requests - network only
  if (url.pathname.startsWith('/api/')) {
    return { strategy: 'network-only' };
  }

  // HTML pages - stale-while-revalidate
  if (
    request.mode === 'navigate' ||
    request.headers.get('accept')?.includes('text/html')
  ) {
    return {
      cache: DYNAMIC_CACHE,
      strategy: 'stale-while-revalidate',
      limit: DYNAMIC_CACHE_LIMIT,
    };
  }

  // Default - network first
  return {
    cache: DYNAMIC_CACHE,
    strategy: 'network-first',
    limit: DYNAMIC_CACHE_LIMIT,
  };
}

// Fetch event - apply caching strategies
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  const { cache, strategy, limit } = getCacheStrategy(event.request);

  switch (strategy) {
    case 'cache-first':
      event.respondWith(
        caches.match(event.request).then(cached => {
          if (cached) return cached;

          return fetch(event.request)
            .then(response => {
              if (!response || response.status !== 200) return response;

              const responseClone = response.clone();
              caches.open(cache).then(c => {
                c.put(event.request, responseClone);
                if (limit) limitCacheSize(cache, limit);
              });

              return response;
            })
            .catch(() => caches.match(event.request));
        })
      );
      break;

    case 'stale-while-revalidate':
      event.respondWith(
        caches.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request)
            .then(response => {
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(cache).then(c => {
                  c.put(event.request, responseClone);
                  if (limit) limitCacheSize(cache, limit);
                });
              }
              return response;
            })
            .catch(() => cached);

          return cached || fetchPromise;
        })
      );
      break;

    case 'network-first':
      event.respondWith(
        fetch(event.request)
          .then(response => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(cache).then(c => {
                c.put(event.request, responseClone);
                if (limit) limitCacheSize(cache, limit);
              });
            }
            return response;
          })
          .catch(() => caches.match(event.request))
      );
      break;

    case 'network-only':
    default:
      // Let browser handle normally
      break;
  }
});
