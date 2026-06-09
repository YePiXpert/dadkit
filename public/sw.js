const CACHE_NAME = "dadkit-v20260609";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg", "/maskable-icon.svg"];
const STATIC_ASSETS = new Set(["/manifest.webmanifest", "/icon.svg", "/maskable-icon.svg"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin || url.pathname === "/sw.js") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, true));
    return;
  }

  if (shouldCacheAsset(url)) {
    event.respondWith(networkFirst(event.request, false));
  }
});

function shouldCacheAsset(url) {
  return url.pathname.startsWith("/_next/static/") || STATIC_ASSETS.has(url.pathname);
}

async function networkFirst(request, fallbackToHome) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (isCacheable(response)) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    if (fallbackToHome) {
      return cache.match("/");
    }

    throw new Error("No cached response available.");
  }
}

function isCacheable(response) {
  return response && response.ok && response.type === "basic";
}
