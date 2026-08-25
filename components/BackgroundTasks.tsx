"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { PwaRegister } from "@/components/PwaRegister";
import { startCrossTabSync } from "@/lib/data/cross-tab-sync";

const AndroidNativeMigration = dynamic(
  () =>
    import("@/components/AndroidNativeMigration").then(
      (module) => module.AndroidNativeMigration,
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
    let timer: ReturnType<typeof setTimeout> | undefined;
    let idleCallback: number | undefined;
    let stopCrossTabSync: () => void = () => undefined;

    const start = () => {
      if (cancelled) return;
      setIdle(true);
      void import("@/lib/storage")
        .then(({ purgeRetiredLocalData }) => purgeRetiredLocalData())
        .catch(() => undefined);
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

    scheduleBackgroundWork();

    return () => {
      cancelled = true;
      if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback);
      if (timer !== undefined) clearTimeout(timer);
      stopCrossTabSync();
    };
  }, [migrationComplete, runtime]);

  return (
    <>
      {runtime === "android" ? (
        <AndroidNativeMigration onComplete={handleMigrationComplete} />
      ) : null}
      {runtime === "detecting" ? null : <PwaRegister />}
      {idle ? <AndroidUpdatePrompt /> : null}
    </>
  );
}
