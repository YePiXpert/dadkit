"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { PwaRegister } from "@/components/PwaRegister";
import { startCrossTabSync } from "@/lib/data/cross-tab-sync";

const AndroidUpdatePrompt = dynamic(
  () =>
    import("@/components/AndroidUpdatePrompt").then(
      (module) => module.AndroidUpdatePrompt,
    ),
  { ssr: false },
);
export function BackgroundTasks() {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let idleCallback: number | undefined;
    const stopCrossTabSync = startCrossTabSync();

    const start = () => {
      if (cancelled) return;
      setIdle(true);
      void import("@/lib/sync/auto-sync").then(({ startAutoSync }) => {
        if (!cancelled) {
          startAutoSync();
        }
      });
      void import("@/lib/persistence-status")
        .then(({ checkStorageCapacity }) => checkStorageCapacity())
        .catch(() => undefined);
      void Promise.all([import("@/lib/item-photos"), import("@/lib/store")])
        .then(([photoLibrary, storeModule]) => {
          if (cancelled) return;

          const state = storeModule.useDadKitStore.getState();

          // 未水合(例如直接落在设置页)时没有可信的清单快照,本轮跳过清理。
          if (!state.hydrated) return;

          return photoLibrary.pruneOrphanedPhotos(
            state.checklist.map((item) => item.id),
          );
        })
        .catch(() => undefined);
    };

    if ("requestIdleCallback" in window) {
      idleCallback = window.requestIdleCallback(start, { timeout: 1_500 });
    } else {
      timer = setTimeout(start, 800);
    }

    return () => {
      cancelled = true;
      if (idleCallback !== undefined) {
        window.cancelIdleCallback(idleCallback);
      }
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      stopCrossTabSync();
    };
  }, []);

  return (
    <>
      <PwaRegister />
      {idle ? <AndroidUpdatePrompt /> : null}
    </>
  );
}
