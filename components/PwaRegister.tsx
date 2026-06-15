"use client";

import { useEffect, useState } from "react";

export function PwaRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker>();

  useEffect(() => {
    const preventGesture: EventListener = (event) => event.preventDefault();
    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("gesturechange", preventGesture);
    document.addEventListener("gestureend", preventGesture);
    document.addEventListener("touchmove", preventMultiTouch, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchmove", preventMultiTouch);
    };
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
    <div className="fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-[430px] rounded-lg border border-white/80 bg-card/95 p-3 text-sm shadow-soft sm:bottom-5">
      <p className="font-semibold">DadKit 有新版本</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-muted-foreground">刷新后使用最新页面。</p>
        <button
          className="rounded-full bg-primary px-3 py-2 font-semibold text-primary-foreground shadow-sm"
          onClick={() => waitingWorker.postMessage("SKIP_WAITING")}
          type="button"
        >
          刷新
        </button>
      </div>
    </div>
  );
}
