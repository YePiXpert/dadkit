"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const AndroidUpdatePrompt = dynamic(
  () =>
    import("@/components/AndroidUpdatePrompt").then(
      (module) => module.AndroidUpdatePrompt,
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

export function BackgroundTasks() {
  const [idle, setIdle] = useState(false);
  const [bundledAndroid, setBundledAndroid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let idleCallback: number | undefined;

    const start = () => {
      if (cancelled) return;
      setBundledAndroid(navigator.userAgent.includes("DadKitAndroid/"));
      setIdle(true);
      void import("@/lib/sync/auto-sync").then(({ startAutoSync }) => {
        if (!cancelled) {
          startAutoSync();
        }
      });
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
    };
  }, []);

  return idle ? (
    <>
      {bundledAndroid ? null : <PwaRegister />}
      <AndroidUpdatePrompt />
    </>
  ) : null;
}
