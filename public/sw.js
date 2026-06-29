const CACHE_NAME = "dadkit-v1.2.0-real-prep-photos";
const PWA_ICON_ASSETS = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/maskable-icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/maskable-icon-512.png",
  "/apple-touch-icon.png",
];
const PWA_ILLUSTRATION_ASSETS = [
  "/illustrations/dadkit-baby-girl-timer.png",
  "/illustrations/dadkit-bear-transparent.png",
  "/illustrations/dadkit-checklist-bag-sticker.png",
  "/illustrations/dadkit-checklist-bag-sticker-v2.png",
  "/illustrations/dadkit-dad-avatar.png",
  "/illustrations/dadkit-family-card-v2.png",
  "/illustrations/dadkit-family-transparent.png",
  "/illustrations/dadkit-go-bunny.png",
  "/illustrations/dadkit-horse-girl.png",
  "/illustrations/dadkit-hospital-clipboard.png",
  "/illustrations/dadkit-hospital-route-sticker.png",
  "/illustrations/dadkit-hospital-route-sticker-v2.png",
  "/illustrations/dadkit-home-journal-sticker-v2.png",
    "/illustrations/dadkit-maternity-journal-sticker.png",
    "/illustrations/dadkit-postpartum-paperwork-sticker.png",
    "/illustrations/dadkit-real-home-prep-photo.png",
    "/illustrations/dadkit-real-share-prep-photo.png",
    "/illustrations/dadkit-share-summary-sticker.png",
  "/illustrations/dadkit-share-summary-sticker-v2.png",
  "/illustrations/dadkit-timeline-calendar-sticker.png",
  "/illustrations/dadkit-timeline-calendar-sticker-v2.png",
];
const PWA_ASSETS = [...PWA_ICON_ASSETS, ...PWA_ILLUSTRATION_ASSETS];
const APP_SHELL = ["/", ...PWA_ASSETS];
const STATIC_ASSETS = new Set(PWA_ASSETS);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    }),
  );
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
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/illustrations/") ||
    STATIC_ASSETS.has(url.pathname)
  );
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
