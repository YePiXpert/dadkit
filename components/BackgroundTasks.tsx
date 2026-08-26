"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { SYNC_SETTINGS_CHANGE_EVENT } from "@/lib/data/change-bus";
import { hasStoredSyncSession } from "@/lib/sync/session-storage-key";

const AndroidNativeMigration = dynamic(
  () =>
    import("@/components/AndroidNativeMigration").then(
      (module) => module.AndroidNativeMigration,
    ),
  { ssr: false },
);
const PwaRegister = dynamic(
  () =>
    import("@/components/PwaRegister").then(
      (module) => module.PwaRegister,
    ),
  { ssr: false },
);
const AndroidUpdatePrompt = dynamic(
  () =>
    import("@/components/AndroidUpdatePrompt").then(
      (module) => module.AndroidUpdatePrompt,
    ),
  { ssr: false },
);

export function BackgroundTasks() {
  const [idle, setIdle] = useState(false);
  const [runtime, setRuntime] = useState<"detecting" | "web" | "android">(
    "detecting",
  );
  const [migrationComplete, setMigrationComplete] = useState(false);

  useEffect(() => {
    const bridge = (
      window as Window & { DadKitAndroidMigration?: { getNativeData(): string } }
    ).DadKitAndroidMigration;
    setRuntime(
      bridge && typeof bridge.getNativeData === "function" ? "android" : "web",
    );
  }, []);

  const handleMigrationComplete = useCallback(() => {
    setMigrationComplete(true);
  }, []);

  useEffect(() => {
    if (runtime === "detecting" || (runtime === "android" && !migrationComplete)) {
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const idleCallbacks: number[] = [];
    let stopCrossTabSync: () => void = () => undefined;
    let autoSyncRequested = false;

    const requestAutoSync = () => {
      if (cancelled || autoSyncRequested || !hasStoredSyncSession()) return;
      autoSyncRequested = true;
      void import("@/lib/sync/auto-sync")
        .then(({ startAutoSync }) => {
          if (!cancelled) startAutoSync();
        })
        .catch(() => {
          autoSyncRequested = false;
        });
    };

    const scheduleLater = (
      callback: () => void,
      delay: number,
      idleTimeout: number,
    ) => {
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          if ("requestIdleCallback" in window) {
            idleCallbacks.push(
              window.requestIdleCallback(callback, { timeout: idleTimeout }),
            );
          } else {
            callback();
          }
        }, delay),
      );
    };

    const start = () => {
      if (cancelled) return;
      setIdle(true);
      void import("@/lib/data/cross-tab-sync")
        .then(({ startCrossTabSync }) => {
          if (!cancelled) stopCrossTabSync = startCrossTabSync();
        })
        .catch(() => undefined);
      void import("@/lib/retired-data")
        .then(({ purgeRetiredLocalData }) => purgeRetiredLocalData())
        .catch(() => undefined);
      requestAutoSync();
      void import("@/lib/persistence-status")
        .then(
          async ({ checkStorageCapacity, requestPersistentStorage }) => {
            await requestPersistentStorage();
            return checkStorageCapacity();
          },
        )
        .catch(() => undefined);
      scheduleLater(() => {
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
      }, 6_000, 2_000);
    };

    const scheduleBackgroundWork = () => {
      if (cancelled) return;
      if ("requestIdleCallback" in window) {
        idleCallbacks.push(
          window.requestIdleCallback(start, { timeout: 1_500 }),
        );
      } else {
        timers.push(setTimeout(start, 800));
      }
    };

    window.addEventListener(SYNC_SETTINGS_CHANGE_EVENT, requestAutoSync);
    scheduleBackgroundWork();

    return () => {
      cancelled = true;
      window.removeEventListener(SYNC_SETTINGS_CHANGE_EVENT, requestAutoSync);
      for (const idleCallback of idleCallbacks) {
        window.cancelIdleCallback(idleCallback);
      }
      for (const timer of timers) clearTimeout(timer);
      stopCrossTabSync();
    };
  }, [migrationComplete, runtime]);

  return (
    <>
      {runtime === "android" ? (
        <AndroidNativeMigration onComplete={handleMigrationComplete} />
      ) : null}
      {idle ? <PwaRegister /> : null}
      {idle ? <AndroidUpdatePrompt /> : null}
    </>
  );
}
