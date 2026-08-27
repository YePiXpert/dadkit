"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isBundledAndroidApp } from "@/lib/install-prompt";

const ANDROID_VERSION_STORAGE_KEY = "dadkit:android-version-code";

// 外壳 versionCode 来自 URL 参数、本地记录或 UA，取可信的最大值。
function readAndroidShellVersionCode() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const queryVersion = Number(
    new URLSearchParams(window.location.search).get("appVersionCode"),
  );
  const storedVersion = Number(
    window.localStorage.getItem(ANDROID_VERSION_STORAGE_KEY),
  );
  const userAgentVersion = Number(
    window.navigator.userAgent.match(/\bDadKitAndroid\/(\d+)\b/)?.[1],
  );
  const version = Math.max(
    ...[queryVersion, storedVersion, userAgentVersion].filter(
      (value) => Number.isInteger(value) && value > 0,
    ),
  );

  if (Number.isInteger(version) && version > 0) {
    window.localStorage.setItem(ANDROID_VERSION_STORAGE_KEY, String(version));
    return version;
  }

  return undefined;
}

export function AboutCard({ appVersion }: { appVersion: string }) {
  const [shellVersionCode, setShellVersionCode] = useState<number>();

  useEffect(() => {
    setShellVersionCode(readAndroidShellVersionCode());
  }, []);

  const androidApp = isBundledAndroidApp() || shellVersionCode !== undefined;

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
        <div className="flex items-center justify-between gap-3 rounded-inset bg-muted/35 px-4 py-3 text-sm">
          <span className="text-muted-foreground">页面版本</span>
          <span className="font-mono font-semibold">
            {appVersion}
          </span>
        </div>

        {androidApp && shellVersionCode !== undefined ? (
          <div className="flex items-center justify-between gap-3 rounded-inset bg-muted/35 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Android 外壳</span>
            <span className="font-mono font-semibold">
              versionCode {shellVersionCode}
            </span>
          </div>
        ) : null}

        <p className="text-sm leading-6 text-muted-foreground">
          {androidApp
            ? "页面功能会在下次启动时自动更新；外壳更新请从 GitHub Releases 下载安装包。"
            : "Web 与 PWA 会在下次打开时自动使用最新页面。"}
        </p>

        {androidApp ? (
          <div>
            <Button asChild variant="outline">
              <a
                href="https://github.com/YePiXpert/dadkit/releases/latest"
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="size-4" />
                打开 GitHub Releases
              </a>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
