"use client";

export type AndroidRelease = {
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

export type AndroidUpdateCheckResult = {
  status: "available" | "latest" | "skipped" | "unsupported";
  currentVersionCode?: number;
  release?: AndroidRelease;
};

export type AndroidUpdateSnapshot = {
  release?: AndroidRelease;
  progress?: AndroidUpdateProgress;
};

declare global {
  interface Window {
    DadKitAndroidUpdate?: {
      startDownload: (url: string, sha256: string) => void;
    };
    __dadkitUpdateProgress?: (progress: AndroidUpdateProgress) => void;
  }
}

export const ANDROID_VERSION_STORAGE_KEY = "dadkit:android-version-code";
export const ANDROID_UPDATE_CHECKED_AT_STORAGE_KEY =
  "dadkit:android-version-checked-at";
export const ANDROID_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const EMPTY_SNAPSHOT: AndroidUpdateSnapshot = {};
let snapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();

function publishSnapshot(next: AndroidUpdateSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function subscribeAndroidUpdate(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAndroidUpdateSnapshot() {
  return snapshot;
}

export function getAndroidUpdateServerSnapshot() {
  return EMPTY_SNAPSHOT;
}

export function setAndroidUpdateProgress(
  progress: AndroidUpdateProgress | undefined,
) {
  publishSnapshot({ ...snapshot, progress });
}

export function resetAndroidUpdateSessionState() {
  publishSnapshot(EMPTY_SNAPSHOT);
}

export function captureCurrentAndroidVersionCode() {
  if (typeof window === "undefined") {
    return undefined;
  }

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

  const storedVersion = Number(
    window.localStorage.getItem(ANDROID_VERSION_STORAGE_KEY),
  );
  const userAgentVersion = Number(
    window.navigator.userAgent.match(/\bDadKitAndroid\/(\d+)\b/)?.[1],
  );
  const currentVersion = Math.max(
    ...[
      isAndroidApp ? queryVersion : 0,
      storedVersion,
      userAgentVersion,
    ].filter((version) => Number.isInteger(version) && version > 0),
  );

  if (Number.isInteger(currentVersion) && currentVersion > 0) {
    window.localStorage.setItem(
      ANDROID_VERSION_STORAGE_KEY,
      String(currentVersion),
    );
    return currentVersion;
  }

  return undefined;
}

export function isAndroidUpdateCheckDue(
  lastCheckedAt: number,
  now = Date.now(),
) {
  return !(
    Number.isFinite(lastCheckedAt) &&
    lastCheckedAt > 0 &&
    now - lastCheckedAt < ANDROID_UPDATE_CHECK_INTERVAL_MS
  );
}

export async function checkForAndroidUpdate({
  force = false,
  signal,
}: {
  force?: boolean;
  signal?: AbortSignal;
} = {}): Promise<AndroidUpdateCheckResult> {
  if (typeof window === "undefined") {
    return { status: "unsupported" };
  }

  const currentVersionCode = captureCurrentAndroidVersionCode();
  if (currentVersionCode === undefined) {
    return { status: "unsupported" };
  }

  const now = Date.now();
  const lastCheckedAt = Number(
    window.localStorage.getItem(ANDROID_UPDATE_CHECKED_AT_STORAGE_KEY),
  );

  if (!force && !isAndroidUpdateCheckDue(lastCheckedAt, now)) {
    return { status: "skipped", currentVersionCode };
  }

  window.localStorage.setItem(
    ANDROID_UPDATE_CHECKED_AT_STORAGE_KEY,
    String(now),
  );

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch("/api/app-version", {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Version check failed with status ${response.status}.`);
    }

    const release = (await response.json()) as AndroidRelease;
    if (!Number.isInteger(release.versionCode) || release.versionCode < 1) {
      throw new Error("Version check returned invalid metadata.");
    }

    if (release.versionCode > currentVersionCode) {
      publishSnapshot({
        progress:
          snapshot.release?.versionCode === release.versionCode
            ? snapshot.progress
            : undefined,
        release,
      });
      return { status: "available", currentVersionCode, release };
    }

    publishSnapshot(EMPTY_SNAPSHOT);
    return { status: "latest", currentVersionCode, release };
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

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
  setAndroidUpdateProgress({ state: "downloading", percent: 0 });
  try {
    bridge.startDownload(absoluteUrl, release.sha256 ?? "");
    return true;
  } catch {
    setAndroidUpdateProgress({ state: "error", error: "无法启动下载，请重试" });
    return false;
  }
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
