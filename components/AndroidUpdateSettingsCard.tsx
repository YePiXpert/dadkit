"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  androidReleaseDownloadUrl,
  androidUpdateBridge,
  androidUpdateProgressLabel,
  captureCurrentAndroidVersionCode,
  checkForAndroidUpdate,
  getAndroidUpdateServerSnapshot,
  getAndroidUpdateSnapshot,
  startNativeUpdateDownload,
  subscribeAndroidUpdate,
} from "@/lib/android-update";
import { isBundledAndroidApp } from "@/lib/install-prompt";

type ManualCheckState = "idle" | "checking" | "latest" | "error";

export function AndroidUpdateSettingsCard({
  appVersion,
}: {
  appVersion: string;
}) {
  const [androidApp, setAndroidApp] = useState(false);
  const [currentVersionCode, setCurrentVersionCode] = useState<number>();
  const [manualState, setManualState] = useState<ManualCheckState>("idle");
  const { progress, release } = useSyncExternalStore(
    subscribeAndroidUpdate,
    getAndroidUpdateSnapshot,
    getAndroidUpdateServerSnapshot,
  );

  useEffect(() => {
    const versionCode = captureCurrentAndroidVersionCode();
    setCurrentVersionCode(versionCode);
    setAndroidApp(isBundledAndroidApp() || versionCode !== undefined);
  }, []);

  async function checkNow() {
    setManualState("checking");
    try {
      const result = await checkForAndroidUpdate({ force: true });
      setCurrentVersionCode(result.currentVersionCode);
      setManualState(result.status === "available" ? "idle" : "latest");
    } catch {
      setManualState("error");
    }
  }

  const updateAvailable =
    release !== undefined &&
    currentVersionCode !== undefined &&
    release.versionCode > currentVersionCode;
  const busy = progress !== undefined && progress.state !== "error";
  const statusMessage = progress
    ? androidUpdateProgressLabel(progress)
    : updateAvailable
      ? `发现新版本 ${release.versionName || release.versionCode}`
      : manualState === "checking"
        ? "正在检查更新…"
        : manualState === "latest"
          ? "已是最新版"
          : manualState === "error"
            ? "检查失败，请确认网络后重试"
            : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <span aria-hidden="true" className="icon-tile text-sm font-bold">
            i
          </span>
          关于 DadKit
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/35 px-4 py-3 text-sm">
          <span className="text-muted-foreground">当前版本</span>
          <span className="font-mono font-semibold">
            {appVersion}
            {androidApp && currentVersionCode !== undefined
              ? ` (${currentVersionCode})`
              : ""}
          </span>
        </div>

        {androidApp ? (
          <>
            {release?.notes && updateAvailable ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {release.notes}
              </p>
            ) : null}
            {statusMessage ? (
              <p
                aria-live="polite"
                className="text-sm text-muted-foreground"
                role={
                  manualState === "error" || progress?.state === "error"
                    ? "alert"
                    : "status"
                }
              >
                {statusMessage}
              </p>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                启动时会自动检查；也可以随时手动检查，不受 6 小时间隔限制。
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={manualState === "checking" || busy}
                onClick={() => void checkNow()}
                variant="outline"
              >
                {manualState === "checking" ? "检查中" : "检查更新"}
              </Button>
              {updateAvailable && release ? (
                androidUpdateBridge() ? (
                  <Button
                    disabled={busy}
                    onClick={() => startNativeUpdateDownload(release)}
                  >
                    {progress?.state === "error" ? "重试下载" : "下载更新"}
                  </Button>
                ) : (
                  <Button asChild>
                    <a href={androidReleaseDownloadUrl(release)}>
                      下载更新
                    </a>
                  </Button>
                )
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Web 与 PWA 会在新页面资源准备完成后提示刷新。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
