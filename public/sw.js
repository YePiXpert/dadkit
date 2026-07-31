const CACHE_NAME = "dadkit-v2.1.2-pwa-r1";
const APP_SHELL_ROUTE = "/";
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

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  // install 只预缓存首页外壳及其构建产物：保证离线兜底可用的同时避免
  // 弱网环境下整批预缓存失败；其余路由在首次访问时由 fetch 处理器写缓存。
  const shellHtml = await fetchAndCacheRoute(cache, APP_SHELL_ROUTE);

  await Promise.all(
    extractBuildAssets(shellHtml).map((asset) =>
      fetchAndCacheAsset(cache, asset),
    ),
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
