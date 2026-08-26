"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

import {
  dismissSyncSessionExpired,
  getSyncSessionStatus,
  SYNC_SESSION_STATUS_EVENT,
  type SyncSessionStatus,
} from "@/lib/sync-session-status";

export function SyncSessionWarning() {
  const [status, setStatus] = useState<SyncSessionStatus>();

  useEffect(() => {
    const refresh = () => setStatus(getSyncSessionStatus());

    refresh();
    window.addEventListener(SYNC_SESSION_STATUS_EVENT, refresh);
    return () => window.removeEventListener(SYNC_SESSION_STATUS_EVENT, refresh);
  }, []);

  if (!status?.expired || status.dismissed) {
    return null;
  }

  return (
    <aside
      className="fixed inset-x-3 top-16 z-[69] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-warning p-3 text-xs text-warning-foreground shadow-md ring-1 ring-warning-foreground/25 sm:top-24"
      role="alert"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        aria-hidden="true"
        className="size-10 shrink-0 rounded-xl object-cover"
        src="/item-art/state-sync-offline.webp"
      />
      <span>{status.message ?? "家庭同步已断开，请重新加入后继续同步。"}</span>
      <Link
        className="min-h-10 shrink-0 rounded-full bg-primary px-3 py-2 font-semibold text-primary-foreground"
        href="/settings"
      >
        重新加入
      </Link>
      <button
        aria-label="关闭同步断开提示"
        className="shrink-0 rounded-full p-2 text-warning-foreground/80 transition-colors hover:bg-warning-foreground/10 hover:text-warning-foreground"
        onClick={() => dismissSyncSessionExpired()}
        type="button"
      >
        <X aria-hidden className="h-4 w-4" />
      </button>
    </aside>
  );
}
