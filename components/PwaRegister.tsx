"use client";

import { useEffect, useState } from "react";

export function PwaRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker>();

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
    <div className="fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-[430px] rounded-lg border border-border bg-card p-3 text-sm shadow-soft sm:bottom-5">
      <p className="font-semibold">DadKit 有新版本</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-muted-foreground">刷新后使用最新页面。</p>
        <button
          className="rounded-md bg-primary px-3 py-2 font-semibold text-primary-foreground"
          onClick={() => waitingWorker.postMessage("SKIP_WAITING")}
          type="button"
        >
          刷新
        </button>
      </div>
    </div>
  );
}
