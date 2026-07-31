"use client";

import { Download } from "lucide-react";

import { openInstallPrompt } from "@/lib/install-prompt";

export function InstallPromptSettingsEntry() {
  return (
    <button
      className="group flex min-h-24 w-full items-center gap-4 rounded-card border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/35"
      onClick={openInstallPrompt}
      type="button"
    >
      <span className="icon-tile size-12">
        <Download className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-foreground">
          安装到桌面
        </span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
          直接从桌面打开，离线也能查看和更新清单。
        </span>
      </span>
    </button>
  );
}
