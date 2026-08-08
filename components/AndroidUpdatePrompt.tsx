"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  androidReleaseDownloadUrl,
  androidUpdateBridge,
  androidUpdateProgressLabel,
  checkForAndroidUpdate,
  getAndroidUpdateServerSnapshot,
  getAndroidUpdateSnapshot,
  setAndroidUpdateProgress,
  startNativeUpdateDownload,
  subscribeAndroidUpdate,
} from "@/lib/android-update";

export {
  androidReleaseDownloadUrl,
  androidUpdateBridge,
  androidUpdateProgressLabel,
  startNativeUpdateDownload,
} from "@/lib/android-update";
export type { AndroidUpdateProgress } from "@/lib/android-update";

export function AndroidUpdatePrompt() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const { progress, release } = useSyncExternalStore(
    subscribeAndroidUpdate,
    getAndroidUpdateSnapshot,
    getAndroidUpdateServerSnapshot,
  );

  useEffect(() => {
    const controller = new AbortController();
    void checkForAndroidUpdate({ signal: controller.signal }).catch(
      () => undefined,
    );

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handleProgress = setAndroidUpdateProgress;
    window.__dadkitUpdateProgress = handleProgress;
    return () => {
      if (window.__dadkitUpdateProgress === handleProgress) {
        delete window.__dadkitUpdateProgress;
      }
    };
  }, []);

  useEffect(() => {
    setDismissed(false);
  }, [release?.versionCode]);

  const normalizedPathname = pathname.replace(/\/+$/, "");
  if (
    !release ||
    dismissed ||
    normalizedPathname === "/settings" ||
    normalizedPathname === "/settings/about"
  ) {
    return null;
  }

  const downloadUrl = androidReleaseDownloadUrl(release);
  const busy = progress !== undefined && progress.state !== "error";

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
          <Button
            type="button"
            onClick={() => startNativeUpdateDownload(release)}
            disabled={busy}
          >
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
