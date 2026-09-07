"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import {
  INSTALL_STATUS_CHANGED_EVENT,
  isPwaInstallAvailable,
  isPwaInstalled,
  isStandaloneDisplay,
  markPwaInstalled,
  openInstallPrompt,
} from "@/lib/install-prompt";
import { isAppShellBuild } from "@/lib/app-shell";

export function InstallPromptSettingsEntry() {
  const [showInstallEntry, setShowInstallEntry] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");

    function syncInstallEntry() {
      setShowInstallEntry(
        !isAppShellBuild() &&
          !isPwaInstalled() &&
          isPwaInstallAvailable(),
      );
    }

    function handleInstalled() {
      markPwaInstalled();
      setShowInstallEntry(false);
    }

    function handleDisplayModeChange() {
      if (isStandaloneDisplay()) {
        handleInstalled();
        return;
      }

      syncInstallEntry();
    }

    if (isAppShellBuild()) {
      setShowInstallEntry(false);
      return;
    }

    if (isStandaloneDisplay()) {
      markPwaInstalled();
    }
    syncInstallEntry();

    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener(
      INSTALL_STATUS_CHANGED_EVENT,
      syncInstallEntry,
    );
    displayMode.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener(
        INSTALL_STATUS_CHANGED_EVENT,
        syncInstallEntry,
      );
      displayMode.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  if (!showInstallEntry) {
    return null;
  }

  return (
    <button
      className="group flex w-full items-center gap-3.5 rounded-card bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md"
      onClick={openInstallPrompt}
      type="button"
    >
      <span className="icon-tile size-11">
        <Download className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">
          安装到桌面
        </span>
        <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">
          直接从桌面打开，离线也能查看和更新清单。
        </span>
      </span>
    </button>
  );
}
