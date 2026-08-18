const CACHE_NAME = "dadkit-v3.4.10-pwa-r1";
const PRECACHE_ROUTES = ["/"];
const BACKGROUND_ROUTES = [
  "/",
  "/checklist",
  "/onboarding",
  "/join",
  "/baby",
  "/baby/timeline",
  "/tools",
  "/growth",
  "/departure",
  "/hospital",
  "/planning",
  "/settings",
  "/settings/about",
  "/settings/backup",
  "/settings/checklist",
  "/settings/family",
  "/settings/sync",
  "/privacy",
  "/support",
];
const PWA_ASSETS = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/maskable-icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/maskable-icon-512.png",
  "/apple-touch-icon.png",
];
const STATIC_ASSETS = new Set(PWA_ASSETS);
// 运行时静态资源缓存按路径前缀限制条目数，超出上限时按写入顺序驱逐
// 最旧条目，避免物品/孕周插画与历史构建产物无限增长。
const RUNTIME_CACHE_LIMITS = [
  { prefix: "/_next/static/", maxEntries: 120 },
  { prefix: "/item-art/", maxEntries: 200 },
  { prefix: "/growth/", maxEntries: 60 },
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await precacheAppShell();
      if (!self.registration?.active) {
        await self.skipWaiting();
      }
    })(),
  );
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
    return;
  }

  if (event.data?.type === "CACHE_ASSETS" && Array.isArray(event.data.urls)) {
    const assets = [
      ...new Set(
        event.data.urls
          .slice(0, 200)
          .map(normalizeNextStaticAsset)
          .filter(Boolean),
      ),
    ];
    const work = caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(assets.map((asset) => fetchAndCacheAsset(cache, asset))),
      );

    replyWhenSettled(event, work);
    event.waitUntil(work);
    return;
  }

  if (event.data?.type === "CACHE_BACKGROUND_ROUTES") {
    const work = caches
      .open(CACHE_NAME)
      .then((cache) => cacheRoutesInBackground(cache));

    event.waitUntil(work);
    return;
  }

  if (
    event.data?.type === "CACHE_ROUTE" &&
    typeof event.data.url === "string"
  ) {
    const url = new URL(event.data.url, self.location.origin);

    if (
      url.origin === self.location.origin &&
      url.pathname !== "/sw.js" &&
      url.pathname !== "/api" &&
      !url.pathname.startsWith("/api/")
    ) {
      const work = caches
        .open(CACHE_NAME)
        .then((cache) =>
          fetchAndCacheRoute(cache, `${url.pathname}${url.search}`),
        );

      replyWhenSettled(event, work);
      event.waitUntil(work);
    }
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
    // 页面导航用 stale-while-revalidate：缓存秒开，后台静默更新；
    // 首次访问成功的路由随即写入缓存，之后离线可开。
    // 带 ?view= 等查询参数的导航通过 ignoreSearch 命中同一份缓存。
    const networkUpdate = fetch(event.request)
      .then((response) => {
        if (isCacheable(response)) {
          const copy = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => null);

    event.waitUntil(networkUpdate);
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request, {
          ignoreSearch: true,
        });

        if (cached) {
          return cached;
        }

        const response = await networkUpdate;
        return response || cache.match("/");
      })(),
    );
    return;
  }

  if (shouldCacheAsset(url)) {
    // 静态构建产物与物品/孕周插画是发布版本不变的资源：
    // 缓存命中直接返回，后台静默更新，滚动时不再等待网络。
    event.respondWith(staleWhileRevalidate(event.request, url.pathname));
  }
});

function shouldCacheAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/item-art/") ||
    url.pathname.startsWith("/growth/") ||
    STATIC_ASSETS.has(url.pathname)
  );
}

function normalizeNextStaticAsset(candidate) {
  if (typeof candidate !== "string") {
    return null;
  }

  try {
    const url = new URL(candidate, self.location.origin);

    if (
      url.origin !== self.location.origin ||
      !url.pathname.startsWith("/_next/static/")
    ) {
      return null;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function replyWhenSettled(event, work) {
  const replyPort = event.ports?.[0];

  if (!replyPort) {
    return;
  }

  work.then(
    () => replyPort.postMessage({ ok: true }),
    () => replyPort.postMessage({ ok: false }),
  );
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const routeHtml = [];

  for (const route of PRECACHE_ROUTES) {
    try {
      routeHtml.push(await fetchAndCacheRoute(cache, route));
    } catch {
      // Runtime caching retries the current route after activation.
    }
  }

  await Promise.all(
    [...new Set(routeHtml.flatMap(extractBuildAssets))].map(async (asset) => {
      try {
        await fetchAndCacheAsset(cache, asset);
      } catch {
        // A single optional chunk must not abort worker installation.
      }
    }),
  );

  await Promise.all(
    PWA_ASSETS.map(async (asset) => {
      try {
        await fetchAndCacheAsset(cache, asset);
      } catch {
        // Optional media must not prevent an app-shell update.
      }
    }),
  );
}

async function cacheRoutesInBackground(cache) {
  for (const route of BACKGROUND_ROUTES) {
    try {
      const cached = await cache.match(route, { ignoreSearch: true });

      if (cached?.ok) {
        continue;
      }

      const html = await fetchAndCacheRoute(cache, route);
      const assets = extractBuildAssets(html);

      for (const asset of assets) {
        const cachedAsset = await cache.match(asset);

        if (!cachedAsset?.ok) {
          await fetchAndCacheAsset(cache, asset);
        }
      }
    } catch {
      // Background completion is best-effort; visited routes still cache on demand.
    }
  }
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

async function staleWhileRevalidate(request, pathname) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkUpdate = fetch(request)
    .then(async (response) => {
      if (isCacheable(response)) {
        await cache.put(request, response.clone());
        await trimRuntimeCache(cache, pathname);
        return response;
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const response = await networkUpdate;

  if (response) {
    return response;
  }

  throw new Error("No cached response available.");
}

async function trimRuntimeCache(cache, pathname) {
  const limit = RUNTIME_CACHE_LIMITS.find((entry) =>
    pathname.startsWith(entry.prefix),
  );

  if (!limit) {
    return;
  }

  // cache.keys() 按写入顺序返回条目，排头的最旧。
  const prefixUrl = self.location.origin + limit.prefix;
  const keys = (await cache.keys()).filter((key) =>
    key.url.startsWith(prefixUrl),
  );
  const excess = keys.length - limit.maxEntries;

  if (excess <= 0) {
    return;
  }

  await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}

function isCacheable(response) {
  return response && response.ok && response.type === "basic";
}
