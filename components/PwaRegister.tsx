"use client";

import { useEffect } from "react";

export function PwaRegister() {
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
          registration.waiting.postMessage("SKIP_WAITING");
        }

        return registration.update();
      })
      .catch(() => {
        // PWA registration is best-effort.
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
