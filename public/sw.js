const CACHE_NAME = "dadkit-v2.0.0-pwa-r7";
const CORE_ROUTES = [
  "/",
  "/settings",
  "/settings/checklist",
  "/settings/backup",
  "/growth",
  "/checklist/documents",
  "/checklist/mom",
  "/checklist/baby",
  "/checklist/confinementMom",
  "/checklist/confinementBaby",
  "/checklist/partner",
  "/checklist/home",
  "/checklist/lastMinute",
  "/privacy",
  "/support",
];
const REQUIRED_ROUTES = CORE_ROUTES.slice(0, -2);
const OPTIONAL_ROUTES = CORE_ROUTES.slice(-2);
const PWA_ICON_ASSETS = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/maskable-icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/maskable-icon-512.png",
  "/apple-touch-icon.png",
];
const PWA_ASSETS = [...PWA_ICON_ASSETS];
const STATIC_ASSETS = new Set(PWA_ASSETS);

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => key.startsWith("dadkit-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
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
    url.pathname.startsWith("/item-refs/") ||
    STATIC_ASSETS.has(url.pathname)
  );
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const requiredRouteHtml = await Promise.all(
    REQUIRED_ROUTES.map((route) => fetchAndCacheRoute(cache, route)),
  );
  const optionalRouteHtml = await Promise.all(
    OPTIONAL_ROUTES.map(async (route) => {
      try {
        return await fetchAndCacheRoute(cache, route);
      } catch {
        return "";
      }
    }),
  );
  const requiredBuildAssets = new Set(
    requiredRouteHtml.flatMap((html) => extractBuildAssets(html)),
  );

  await Promise.all(
    Array.from(requiredBuildAssets, (asset) => fetchAndCacheAsset(cache, asset)),
  );

  const optionalAssets = new Set(PWA_ASSETS);

  for (const html of optionalRouteHtml) {
    for (const asset of extractBuildAssets(html)) {
      if (!requiredBuildAssets.has(asset)) {
        optionalAssets.add(asset);
      }
    }
  }

  await Promise.all(
    Array.from(optionalAssets, async (asset) => {
      try {
        await fetchAndCacheAsset(cache, asset);
      } catch {
        // Optional routes and media must not prevent an app-shell update.
      }
    }),
  );
}

async function fetchAndCacheRoute(cache, route) {
  const request = new Request(route, { cache: "reload" });
  const response = await fetch(request);

  if (!isCacheable(response)) {
    throw new Error(`Unable to pre-cache ${route}.`);
  }

  await cache.put(request, response.clone());
  return response.text();
}

async function fetchAndCacheAsset(cache, asset) {
  const request = new Request(asset, { cache: "reload" });
  const response = await fetch(request);

  if (!isCacheable(response)) {
    throw new Error(`Unable to pre-cache ${asset}.`);
  }

  await cache.put(request, response);
}

function extractBuildAssets(html) {
  const assets = new Set();
  const attributePattern = /\b(?:src|href|srcset)=["']([^"']+)["']/gi;

  for (const match of html.matchAll(attributePattern)) {
    for (const candidate of match[1].split(",")) {
      const [rawUrl] = candidate.trim().split(/\s+/, 1);
      const url = rawUrl?.replaceAll("&amp;", "&");

      if (url?.startsWith("/_next/static/")) {
        assets.add(url);
      }
    }
  }

  return Array.from(assets);
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
    const cached = await cache.match(request, { ignoreSearch: fallbackToHome });

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
