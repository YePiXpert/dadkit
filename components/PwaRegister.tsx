"use client";

import { useEffect, useState } from "react";

export function PwaRegister() {
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
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;
    const hadController = Boolean(navigator.serviceWorker.controller);

    function handleControllerChange() {
      if (!hadController || refreshing) {
        return;
      }

      refreshing = true;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
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
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(worker);
            }
          });
        });

        return registration.update();
      })
      .catch(() => {
        // PWA registration is best-effort.
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (!waitingWorker) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-[430px] rounded-xl border border-border bg-card p-3 text-sm shadow-lg sm:bottom-5">
      <p className="font-semibold">DadKit 有新版本</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-muted-foreground">刷新后使用最新页面。</p>
        <button
          className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground shadow-sm"
          onClick={() => waitingWorker.postMessage("SKIP_WAITING")}
          type="button"
        >
          刷新
        </button>
      </div>
    </div>
  );
}
