/* eslint-disable */
/**
 * SuccessFuel Service Worker — APEX-02b finalisation.
 *
 * Stratégies de cache :
 *  - Navigation (HTML) : NetworkFirst avec timeout 3s, fallback cache
 *  - Assets statiques (JS, CSS, polices, images) : CacheFirst
 *  - API Supabase : NetworkOnly (jamais de stale data comptable)
 *
 * Activation : skipWaiting + clientsClaim pour activation immédiate.
 * Versioning : bump CACHE_VERSION pour forcer un refresh du cache.
 */

const CACHE_VERSION = "v1";
const CACHE_STATIC = `successfuel-static-${CACHE_VERSION}`;
const CACHE_PAGES = `successfuel-pages-${CACHE_VERSION}`;

const STATIC_PRECACHE = [
  "/manifest.json",
  "/favicon.png",
  "/Assets/polices/Roboto/Roboto-VariableFont_wdth,wght.ttf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) =>
        Promise.allSettled(STATIC_PRECACHE.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.endsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ).then(() => self.clients.claim()),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore les requêtes non-GET et cross-origin (sauf assets connus)
  if (request.method !== "GET") return;

  // Toujours réseau direct pour Supabase (jamais de stale data)
  if (url.hostname.endsWith(".supabase.co")) return;

  // Navigation HTML : NetworkFirst avec timeout 3s
  if (request.mode === "navigate") {
    event.respondWith(
      networkFirstWithTimeout(request, CACHE_PAGES, 3000),
    );
    return;
  }

  // Assets statiques (Next.js _next/static, polices, images) : CacheFirst
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/Assets/") ||
    /\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // Tout le reste : NetworkOnly (avec fallback cache si offline)
  event.respondWith(
    fetch(request).catch(() => caches.match(request)),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function networkFirstWithTimeout(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);

  return new Promise((resolve) => {
    let resolved = false;
    const timeoutId = setTimeout(async () => {
      if (resolved) return;
      const cached = await cache.match(request);
      if (cached) {
        resolved = true;
        resolve(cached);
      }
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timeoutId);
        if (resolved) return;
        resolved = true;
        if (response.ok) cache.put(request, response.clone());
        resolve(response);
      })
      .catch(async () => {
        clearTimeout(timeoutId);
        if (resolved) return;
        resolved = true;
        const cached = await cache.match(request);
        resolve(
          cached ||
            new Response("Offline", {
              status: 503,
              statusText: "Service Unavailable",
            }),
        );
      });
  });
}
