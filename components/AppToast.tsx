"use client";

import { useEffect, useSyncExternalStore } from "react";
import { X } from "lucide-react";

import {
  dismissAppToast,
  getAppToast,
  subscribeAppToast,
} from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppToast() {
  const toast = useSyncExternalStore(
    subscribeAppToast,
    getAppToast,
    () => undefined,
  );

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(
      () => dismissAppToast(toast.id),
      toast.duration,
    );

    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={cn(
        "safe-bottom-toast fixed inset-x-3 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card p-3 text-sm shadow-lg",
        toast.tone === "warning" && "border-warning-foreground/25 bg-warning text-warning-foreground",
        toast.tone === "success" && "border-primary/20",
      )}
      role="status"
    >
      <span className="min-w-0 flex-1 leading-5">{toast.message}</span>
      {toast.actionLabel && toast.onAction ? (
        <Button
          className="shrink-0"
          onClick={() => {
            toast.onAction?.();
            dismissAppToast(toast.id);
          }}
          size="sm"
          variant="secondary"
        >
          {toast.actionLabel}
        </Button>
      ) : null}
      <button
        aria-label="关闭提示"
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        onClick={() => dismissAppToast(toast.id)}
        type="button"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
