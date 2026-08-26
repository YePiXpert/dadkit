"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Baby, BedDouble, Container, Square } from "lucide-react";

import { showAppToast } from "@/lib/app-toast";
import {
  deriveActiveCareTimers,
  type ActiveCareTimerKind,
} from "@/lib/baby/active-timers";
import { formatCareDuration } from "@/lib/baby/selectors";
import { useBabyStore } from "@/lib/baby/store";
import type { CareEventType } from "@/lib/baby/types";
import { triggerHaptic } from "@/lib/haptics";
import { showsMobileNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const BabyQuickActionDialog = dynamic(
  () =>
    import("@/components/baby/BabyQuickActionDialog").then(
      (module) => module.BabyQuickActionDialog,
    ),
  { ssr: false },
);

const TIMER_ICONS = {
  breastfeeding: Baby,
  pumping: Container,
  sleep: BedDouble,
} as const;

/**
 * 全局迷你计时条：有亲喂/吸奶/睡眠计时进行中时，悬浮在底部导航上方，
 * 任何页面都能看一眼时长、一键结束，或点开完整记录面板。
 */
export function CareTimerBar() {
  const pathname = usePathname();
  const hydrated = useBabyStore((state) => state.hydrated);
  const hydrate = useBabyStore((state) => state.hydrate);
  const activeEvents = useBabyStore((state) => state.activeEvents);
  const careClearedAt = useBabyStore((state) => state.careClearedAt);
  const finishBreastfeeding = useBabyStore((state) => state.finishBreastfeeding);
  const finishPumping = useBabyStore((state) => state.finishPumping);
  const finishSleep = useBabyStore((state) => state.finishSleep);
  const [dialogAction, setDialogAction] = useState<CareEventType>();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (hydrated) return;
    // 挂载点已经把整块计时功能让到浏览器空闲期，这里直接读取数据，
    // 避免活跃计时器再额外等待一轮 idle callback。
    void hydrate();
  }, [hydrate, hydrated]);

  useEffect(() => {
    if (activeEvents.length === 0) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [activeEvents.length]);

  const timers = deriveActiveCareTimers(activeEvents, careClearedAt, now);

  if (!hydrated || timers.length === 0) {
    return null;
  }

  async function stopTimer(kind: ActiveCareTimerKind) {
    const result =
      kind === "breastfeeding"
        ? await finishBreastfeeding()
        : kind === "pumping"
          ? await finishPumping({ amountMl: null, note: "" })
          : await finishSleep();
    if (result.ok) triggerHaptic("success");
    showAppToast({
      message: result.ok
        ? "计时已结束并保存。"
        : result.message ?? "结束计时失败，请稍后重试。",
      tone: result.ok ? "success" : "warning",
    });
  }

  return (
    <>
      <div
        aria-label="进行中的宝宝计时"
        className={cn(
          "pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3",
          showsMobileNavigation(pathname)
            ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-6"
            : "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
        )}
        role="region"
      >
        <div className="pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-full bg-card/95 p-1.5 shadow-lg ring-1 ring-border/50 backdrop-blur-xl">
          {timers.map((timer) => {
            const Icon = TIMER_ICONS[timer.kind];
            return (
              <div
                className="flex shrink-0 items-center gap-1 rounded-full bg-secondary/60 py-1 pl-2.5 pr-1"
                key={timer.kind}
              >
                <button
                  aria-label={`打开${timer.label}记录`}
                  className="flex min-h-9 items-center gap-1.5 rounded-full px-1 text-left transition-colors hover:text-primary"
                  onClick={() => setDialogAction(timer.kind)}
                  type="button"
                >
                  <Icon aria-hidden="true" className="size-4 text-primary" />
                  <span className="text-xs font-semibold">{timer.label}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatCareDuration(timer.durationMs)}
                  </span>
                </button>
                <button
                  aria-label={`结束${timer.label}并保存`}
                  className="flex size-9 items-center justify-center rounded-full bg-card text-primary shadow-sm transition-transform active:scale-95 motion-reduce:transition-none"
                  onClick={() => void stopTimer(timer.kind)}
                  title={`结束${timer.label}`}
                  type="button"
                >
                  <Square aria-hidden="true" className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <BabyQuickActionDialog
        action={dialogAction}
        onOpenChange={(open) => {
          if (!open) setDialogAction(undefined);
        }}
        open={Boolean(dialogAction)}
      />
    </>
  );
}
