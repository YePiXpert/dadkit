"use client";

import Link from "next/link";
import { ArrowRight, Baby } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { deriveTodayCareSummary, getLastFeedingEvent } from "@/lib/baby/selectors";
import { formatCareRelativeTime } from "@/lib/baby/time";
import { hasBabyMode } from "@/lib/baby/portable";
import { useBabyStore } from "@/lib/baby/store";

export function BabyHomeCard() {
  const hydrate = useBabyStore((state) => state.hydrate);
  const hydrated = useBabyStore((state) => state.hydrated);
  const profile = useBabyStore((state) => state.profile);
  const recentEvents = useBabyStore((state) => state.recentEvents);
  const todayEvents = useBabyStore((state) => state.todayEvents);
  const activeEvents = useBabyStore((state) => state.activeEvents);
  const careClearedAt = useBabyStore((state) => state.careClearedAt);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => {
    if (activeEvents.length === 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [activeEvents.length]);

  const events = useMemo(() => [...new Map([...recentEvents, ...activeEvents].map((event) => [event.id, event])).values()], [activeEvents, recentEvents]);
  const lastFeeding = getLastFeedingEvent(events, careClearedAt);
  const summary = deriveTodayCareSummary(todayEvents, new Date(now), { now, clearedAt: careClearedAt });
  const enabled = hasBabyMode(profile);

  return (
    <Link className="group flex min-h-24 items-center gap-3 rounded-card border border-primary/20 bg-card p-4 transition-colors hover:bg-secondary/35" href="/baby">
      <span className="icon-tile size-12"><Baby className="size-6" /></span>
      <span className="min-w-0 flex-1">
        <strong className="block break-words text-base font-semibold">{enabled ? profile.fields.nickname.value || "宝宝记录" : "宝宝记录"}</strong>
        <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">
          {enabled
            ? `${lastFeeding ? `上次喂养${formatCareRelativeTime(lastFeeding.type === "bottle" ? lastFeeding.occurredAt : lastFeeding.startAt, now)}` : "还没有喂养记录"} · 今日 ${summary.totalRecordCount} 条${activeEvents.length ? ` · ${activeEvents.some((event) => event.type === "breastfeeding") ? "亲喂" : "睡眠/吸奶"}计时中` : ""}`
            : hydrated
              ? "宝宝出生后，可快速记录喂养、尿布和睡眠。"
              : "正在读取宝宝记录…"}
        </span>
      </span>
      <ArrowRight aria-hidden className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
    </Link>
  );
}
