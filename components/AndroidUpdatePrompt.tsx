"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type AndroidRelease = {
  versionCode: number;
  versionName?: string;
  notes?: string;
  url?: string;
};

const ANDROID_VERSION_STORAGE_KEY = "dadkit:android-version-code";
const ANDROID_UPDATE_CHECKED_AT_STORAGE_KEY = "dadkit:android-version-checked-at";
// 距上次检查不足 6 小时则跳过 fetch，避免每次冷启动都请求版本接口。
const ANDROID_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function AndroidUpdatePrompt() {
  const [release, setRelease] = useState<AndroidRelease>();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const source = search.get("source");
    const queryVersion = Number(search.get("appVersionCode"));
    const isAndroidApp = source === "twa" || source === "apk";

    if (isAndroidApp && Number.isInteger(queryVersion) && queryVersion > 0) {
      window.localStorage.setItem(
        ANDROID_VERSION_STORAGE_KEY,
        String(queryVersion),
      );
    }

    const currentVersion = Number(
      isAndroidApp && queryVersion > 0
        ? queryVersion
        : window.localStorage.getItem(ANDROID_VERSION_STORAGE_KEY),
    );

    if (!Number.isInteger(currentVersion) || currentVersion < 1) {
      return;
    }

    const now = Date.now();
    const lastCheckedAt = Number(
      window.localStorage.getItem(ANDROID_UPDATE_CHECKED_AT_STORAGE_KEY),
    );

    if (
      Number.isFinite(lastCheckedAt) &&
      lastCheckedAt > 0 &&
      now - lastCheckedAt < ANDROID_UPDATE_CHECK_INTERVAL_MS
    ) {
      return;
    }

    window.localStorage.setItem(
      ANDROID_UPDATE_CHECKED_AT_STORAGE_KEY,
      String(now),
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    fetch("/api/app-version", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) =>
        response.ok ? ((await response.json()) as AndroidRelease) : undefined,
      )
      .then((next) => {
        if (
          next &&
          Number.isInteger(next.versionCode) &&
          next.versionCode > currentVersion
        ) {
          setRelease(next);
        }
      })
      .catch(() => undefined)
      .finally(() => clearTimeout(timeout));

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  if (!release || dismissed) {
    return null;
  }

  const downloadUrl =
    release.url ??
    `/api/app-version/apk?versionCode=${encodeURIComponent(release.versionCode)}`;

  return (
    <aside
      aria-live="polite"
      className="safe-bottom-toast fixed inset-x-3 z-[61] mx-auto max-w-md rounded-card bg-card p-4 text-sm shadow-lg"
    >
      <p className="font-semibold">
        DadKit {release.versionName || release.versionCode} 可更新
      </p>
      {release.notes ? (
        <p className="mt-1 line-clamp-3 text-muted-foreground">
          {release.notes}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setDismissed(true)}
        >
          稍后
        </Button>
        <Button asChild>
          <a href={downloadUrl}>
            <Download className="size-4" />
            下载更新
          </a>
        </Button>
      </div>
    </aside>
  );
}
