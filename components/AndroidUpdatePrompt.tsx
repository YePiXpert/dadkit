"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type AndroidRelease = {
  versionCode: number;
  versionName?: string;
  notes?: string;
  size?: number;
  sha256?: string;
  url?: string;
};

export type AndroidUpdateProgress = {
  state: "downloading" | "verifying" | "ready" | "error";
  percent?: number;
  error?: string;
};

declare global {
  interface Window {
    DadKitAndroidUpdate?: {
      startDownload: (url: string, sha256: string) => void;
    };
    __dadkitUpdateProgress?: (progress: AndroidUpdateProgress) => void;
  }
}

const ANDROID_VERSION_STORAGE_KEY = "dadkit:android-version-code";
const ANDROID_UPDATE_CHECKED_AT_STORAGE_KEY = "dadkit:android-version-checked-at";
// 距上次检查不足 6 小时则跳过 fetch，避免每次冷启动都请求版本接口。
const ANDROID_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function androidUpdateBridge() {
  if (typeof window === "undefined") {
    return undefined;
  }
  const bridge = window.DadKitAndroidUpdate;
  return bridge && typeof bridge.startDownload === "function"
    ? bridge
    : undefined;
}

export function androidReleaseDownloadUrl(release: AndroidRelease) {
  return (
    release.url ??
    `/api/app-version/apk?versionCode=${encodeURIComponent(release.versionCode)}`
  );
}

// 返回 false 表示原生桥不可用，调用方保持 <a> 链接兜底下载。
export function startNativeUpdateDownload(release: AndroidRelease) {
  const bridge = androidUpdateBridge();
  if (!bridge) {
    return false;
  }
  const absoluteUrl = new URL(
    androidReleaseDownloadUrl(release),
    window.location.origin,
  ).href;
  bridge.startDownload(absoluteUrl, release.sha256 ?? "");
  return true;
}

export function androidUpdateProgressLabel(progress: AndroidUpdateProgress) {
  const percent =
    typeof progress.percent === "number" && Number.isFinite(progress.percent)
      ? Math.min(100, Math.max(0, Math.round(progress.percent)))
      : undefined;

  switch (progress.state) {
    case "downloading":
      return percent === undefined ? "正在下载…" : `正在下载 ${percent}%`;
    case "verifying":
      return "下载完成，正在校验安装包…";
    case "ready":
      return "校验完成，即将打开安装界面…";
    case "error":
      return progress.error
        ? `更新失败：${progress.error}`
        : "更新失败，请重试";
  }
}

export function AndroidUpdatePrompt() {
  const [release, setRelease] = useState<AndroidRelease>();
  const [dismissed, setDismissed] = useState(false);
  const [progress, setProgress] = useState<AndroidUpdateProgress>();

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

  useEffect(() => {
    window.__dadkitUpdateProgress = (next) => {
      setProgress(next);
    };
    return () => {
      delete window.__dadkitUpdateProgress;
    };
  }, []);

  if (!release || dismissed) {
    return null;
  }

  const downloadUrl = androidReleaseDownloadUrl(release);
  const busy = progress !== undefined && progress.state !== "error";

  const startDownload = () => {
    setProgress({ state: "downloading", percent: 0 });
    if (!startNativeUpdateDownload(release)) {
      setProgress(undefined);
    }
  };

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
      {progress ? (
        <p className="mt-2 text-muted-foreground" role="status">
          {androidUpdateProgressLabel(progress)}
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
        {androidUpdateBridge() ? (
          <Button type="button" onClick={startDownload} disabled={busy}>
            <Download className="size-4" />
            {progress?.state === "error" ? "重试下载" : "下载更新"}
          </Button>
        ) : (
          <Button asChild>
            <a href={downloadUrl}>
              <Download className="size-4" />
              下载更新
            </a>
          </Button>
        )}
      </div>
    </aside>
  );
}
