"use client";

import { useEffect, useState } from "react";

type NativeMigrationBridge = { getNativeData(): string };

declare global {
  interface Window {
    __dadkitLegacyExport?: () => Promise<string>;
  }
}

// 旧版 APK 的数据存在远程站点（https://dadkit.505f.com）的 WebView origin 下。
// 升级到本地资源版本时，Android 壳会先在本页静默调用 __dadkitLegacyExport
// 导出可移植数据，再切到本地资源页由 AndroidNativeMigration 导入。
export function ApkLegacyExport() {
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    const bridge = (
      window as Window & { DadKitAndroidMigration?: NativeMigrationBridge }
    ).DadKitAndroidMigration;
    if (!bridge) return;

    setMigrating(
      new URLSearchParams(window.location.search).get("source") === "apk-migration",
    );

    if (window.__dadkitLegacyExport) return;
    window.__dadkitLegacyExport = async () => {
      const storage = await import("@/lib/storage");
      const data = await storage.buildLatestPortableData();
      return JSON.stringify(data);
    };
  }, []);

  if (!migrating) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background/95 px-6 text-center">
      <div>
        <p className="text-base font-semibold">正在升级 DadKit 数据</p>
        <p className="mt-2 text-sm text-muted-foreground">请稍候，不要关闭应用。</p>
      </div>
    </div>
  );
}
