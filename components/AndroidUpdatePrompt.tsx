"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type AndroidRelease = {
  versionCode: number;
  versionName?: string;
  notes?: string;
  url?: string;
};

const ANDROID_VERSION_STORAGE_KEY = "dadkit:android-version-code";

export function AndroidUpdatePrompt() {
  const [release, setRelease] = useState<AndroidRelease>();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const source = search.get("source");
    const queryVersion = Number(search.get("appVersionCode"));

    if (source === "twa" && Number.isInteger(queryVersion) && queryVersion > 0) {
      window.localStorage.setItem(
        ANDROID_VERSION_STORAGE_KEY,
        String(queryVersion),
      );
    }

    const currentVersion = Number(
      source === "twa" && queryVersion > 0
        ? queryVersion
        : window.localStorage.getItem(ANDROID_VERSION_STORAGE_KEY),
    );

    if (!Number.isInteger(currentVersion) || currentVersion < 1) {
      return;
    }

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
      className="safe-bottom-toast fixed inset-x-3 z-[61] mx-auto max-w-[430px] rounded-3xl border border-border bg-card p-4 text-sm shadow-md"
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
        <button
          className="min-h-11 rounded-full px-4 text-sm font-semibold text-muted-foreground"
          type="button"
          onClick={() => setDismissed(true)}
        >
          稍后
        </button>
        <a
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-sm"
          href={downloadUrl}
        >
          <Download className="size-4" />
          下载更新
        </a>
      </div>
    </aside>
  );
}
