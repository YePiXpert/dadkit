"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const OFFLINE_READY_ATTRIBUTE = "data-dadkit-offline-ready";
const WORKER_CACHE_TIMEOUT_MS = 60_000;
const BACKGROUND_CACHE_DELAY_MS = 5 * 60_000;

function getNextStaticAssets(entries: PerformanceEntry[]) {
  return entries
    .map((entry) => new URL(entry.name, window.location.href))
    .filter(
      (url) =>
        url.origin === window.location.origin &&
        url.pathname.startsWith("/_next/static/"),
    )
    .map((url) => `${url.pathname}${url.search}`);
}

function getLoadedNextStaticAssets() {
  return getNextStaticAssets(performance.getEntriesByType("resource"));
}

function requestWorkerCache(
  worker: ServiceWorker,
  message: { type: "CACHE_ROUTE"; url: string } | { type: "CACHE_ASSETS"; urls: string[] },
) {
  return new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error("Service Worker cache request timed out."));
    }, WORKER_CACHE_TIMEOUT_MS);

    channel.port1.onmessage = (event: MessageEvent<{ ok?: boolean }>) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      if (event.data?.ok) resolve();
      else reject(new Error("Service Worker cache request failed."));
    };
    worker.postMessage(message, [channel.port2]);
  });
}

export function PwaRegister() {
  const pathname = usePathname();
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker>();

  useEffect(() => {
    const handleOfflineNavigation = (event: MouseEvent) => {
      if (
        navigator.onLine ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");

      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);

      if (url.origin !== window.location.origin) {
        return;
      }

      event.preventDefault();
      window.location.assign(url.href);
    };

    document.addEventListener("click", handleOfflineNavigation, true);

    return () => document.removeEventListener("click", handleOfflineNavigation, true);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.ready
      .then((registration) => {
        registration.active?.postMessage({
          type: "CACHE_ROUTE",
          url: pathname,
        });
      })
      .catch(() => {
        // Runtime route caching is best-effort.
      });
  }, [pathname]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;
    let cacheSequence = 0;
    let cacheWork = Promise.resolve();
    const shouldFillBackgroundCache = window.location.pathname === "/";
    let assetObserver: PerformanceObserver | undefined;
    let activeWorker: ServiceWorker | undefined;
    let registrationTimer: number | undefined;
    let backgroundCacheTimer: number | undefined;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const root = document.documentElement;
    const pendingAssets = new Set<string>();
    const reportedAssets = new Set<string>();
    performance.setResourceTimingBufferSize(1_000);
    root.removeAttribute(OFFLINE_READY_ATTRIBUTE);

    function queueCache(work: () => Promise<void>) {
      const sequence = ++cacheSequence;
      root.removeAttribute(OFFLINE_READY_ATTRIBUTE);
      cacheWork = cacheWork
        .catch(() => undefined)
        .then(work)
        .then(() => {
          if (sequence === cacheSequence) {
            root.setAttribute(OFFLINE_READY_ATTRIBUTE, "true");
          }
        })
        .catch(() => {
          if (sequence === cacheSequence) {
            root.removeAttribute(OFFLINE_READY_ATTRIBUTE);
          }
        });
    }

    function cacheAssets(assets: string[]) {
      const unreported: string[] = [];

      for (const asset of assets) {
        if (reportedAssets.has(asset)) continue;
        if (!activeWorker) {
          pendingAssets.add(asset);
          continue;
        }
        reportedAssets.add(asset);
        unreported.push(asset);
      }

      if (activeWorker && unreported.length > 0) {
        const worker = activeWorker;
        queueCache(() =>
          requestWorkerCache(worker, {
            type: "CACHE_ASSETS",
            urls: unreported,
          }),
        );
      }
    }

    cacheAssets(getLoadedNextStaticAssets());
    if ("PerformanceObserver" in window) {
      assetObserver = new PerformanceObserver((list) => {
        cacheAssets(getNextStaticAssets(list.getEntries()));
      });
      assetObserver.observe({ type: "resource", buffered: true });
    }

    function handleControllerChange() {
      if (!hadController || refreshing) {
        return;
      }

      refreshing = true;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    function startRegistration() {
      registrationTimer = undefined;
      void navigator.serviceWorker
        .register("/sw.js")
        .then(async (registration) => {
        if (registration.waiting && hadController) {
          setWaitingWorker(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;

          if (!worker) {
            return;
          }

          worker.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              hadController &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(worker);
            }
          });
        });

        const readyRegistration = await navigator.serviceWorker.ready;
        const worker = readyRegistration.active;

        if (!worker) {
          return;
        }

        activeWorker = worker;

        queueCache(async () => {
          await requestWorkerCache(worker, {
            type: "CACHE_ROUTE",
            url: `${window.location.pathname}${window.location.search}`,
          });
          const assets = [
            ...new Set([...pendingAssets, ...getLoadedNextStaticAssets()]),
          ];
          pendingAssets.clear();
          assets.forEach((asset) => reportedAssets.add(asset));
          if (assets.length > 0) {
            await requestWorkerCache(worker, {
              type: "CACHE_ASSETS",
              urls: assets,
            });
          }
        });

        if (shouldFillBackgroundCache) {
          backgroundCacheTimer = window.setTimeout(() => {
            worker.postMessage({ type: "CACHE_BACKGROUND_ROUTES" });
          }, BACKGROUND_CACHE_DELAY_MS);
        }

        // 浏览器自身会定期检查 Service Worker 更新，不再每次加载强制 update()。
        })
        .catch(() => {
          // PWA registration is best-effort.
        });
    }

    function scheduleRegistration() {
      registrationTimer = window.setTimeout(startRegistration, 3_000);
    }

    scheduleRegistration();

    return () => {
      assetObserver?.disconnect();
      if (registrationTimer !== undefined) {
        window.clearTimeout(registrationTimer);
      }
      if (backgroundCacheTimer !== undefined) {
        window.clearTimeout(backgroundCacheTimer);
      }
      root.removeAttribute(OFFLINE_READY_ATTRIBUTE);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (!waitingWorker) {
    return null;
  }

  return (
    <div className="safe-bottom-toast fixed inset-x-3 z-[60] mx-auto max-w-md rounded-card border border-border bg-card p-4 text-sm shadow-md">
      <p className="font-semibold">DadKit 有新版本</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-muted-foreground">刷新后使用最新页面。</p>
        <div className="flex shrink-0 gap-2">
          <button
            className="min-h-11 rounded-full px-3 py-2 font-semibold text-muted-foreground hover:bg-secondary"
            onClick={() => setWaitingWorker(undefined)}
            type="button"
          >
            稍后
          </button>
          <button
            className="min-h-11 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-sm"
            onClick={() => waitingWorker.postMessage("SKIP_WAITING")}
            type="button"
          >
            刷新
          </button>
        </div>
      </div>
    </div>
  );
}
