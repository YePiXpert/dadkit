"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { PwaRegister } from "@/components/PwaRegister";
import { startCrossTabSync } from "@/lib/data/cross-tab-sync";

const ANDROID_MIGRATION_COMPLETE_EVENT = "dadkit:android-migration-complete";
const IS_ANDROID_BUNDLE =
  process.env.NEXT_PUBLIC_DADKIT_ANDROID_BUNDLE === "1";

const AndroidNativeMigration = IS_ANDROID_BUNDLE
  ? dynamic(
      () =>
        import("@/components/AndroidNativeMigration").then(
          (module) => module.AndroidNativeMigration,
        ),
      { ssr: false },
    )
  : () => null;
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
    let stopCrossTabSync: () => void = () => undefined;

    const start = () => {
      if (cancelled) return;
      setIdle(true);
      void import("@/lib/sync/auto-sync").then(({ startAutoSync }) => {
        if (!cancelled) startAutoSync();
      });
      void import("@/lib/persistence-status")
        .then(
          async ({ checkStorageCapacity, requestPersistentStorage }) => {
            await requestPersistentStorage();
            return checkStorageCapacity();
          },
        )
        .catch(() => undefined);
      void Promise.all([import("@/lib/item-photos"), import("@/lib/store")])
        .then(([photoLibrary, storeModule]) => {
          if (cancelled) return;
          const state = storeModule.useDadKitStore.getState();
          if (!state.hydrated) return;
          return photoLibrary.pruneOrphanedPhotos(
            state.checklist.map((item) => item.id),
          );
        })
        .catch(() => undefined);
    };

    const scheduleBackgroundWork = () => {
      if (cancelled) return;
      stopCrossTabSync = startCrossTabSync();
      if ("requestIdleCallback" in window) {
        idleCallback = window.requestIdleCallback(start, { timeout: 1_500 });
      } else {
        timer = setTimeout(start, 800);
      }
    };

    if (IS_ANDROID_BUNDLE) {
      window.addEventListener(
        ANDROID_MIGRATION_COMPLETE_EVENT,
        scheduleBackgroundWork,
        { once: true },
      );
    } else {
      scheduleBackgroundWork();
    }

    return () => {
      cancelled = true;
      window.removeEventListener(
        ANDROID_MIGRATION_COMPLETE_EVENT,
        scheduleBackgroundWork,
      );
      if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback);
      if (timer !== undefined) clearTimeout(timer);
      stopCrossTabSync();
    };
  }, []);

  return (
    <>
      {IS_ANDROID_BUNDLE ? <AndroidNativeMigration /> : <PwaRegister />}
      {idle ? <AndroidUpdatePrompt /> : null}
    </>
  );
}
