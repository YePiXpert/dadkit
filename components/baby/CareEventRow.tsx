"use client";

import { Baby, BedDouble, Milk, Pencil, ShowerHead, Trash2 } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { householdRecorderLabel } from "@/lib/household/selectors";
import { useHouseholdStore } from "@/lib/household/store";
import { calculateBreastfeedingDuration, formatCareDuration } from "@/lib/baby/selectors";
import { careEventSortTime } from "@/lib/baby/time";
import type { CareEvent } from "@/lib/baby/types";

export function CareEventRow({ event, onEdit, onDelete, now = Date.now() }: { event: CareEvent; onEdit?(): void; onDelete?(): void; now?: number }) {
  const household = useHouseholdStore((state) => state.household);
  const hydrateHousehold = useHouseholdStore((state) => state.hydrate);
  useEffect(() => { hydrateHousehold(); }, [hydrateHousehold]);
  const Icon = event.type === "sleep" ? BedDouble : event.type === "diaper" ? ShowerHead : event.type === "breastfeeding" ? Baby : Milk;
  return (
    <article className="flex min-w-0 items-start gap-3 rounded-card bg-card p-3 shadow-sm">
      <span className="icon-tile bg-secondary text-primary"><Icon className="size-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold">{eventTitle(event)}</h3>
          <time className="text-xs text-muted-foreground" dateTime={new Date(careEventSortTime(event)).toISOString()}>{new Date(careEventSortTime(event)).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{eventSummary(event, now)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{householdRecorderLabel(household, event.recordedByMemberId)}</p>
        {event.note ? <p className="mt-2 break-words text-sm">{event.note}</p> : null}
      </div>
      {onEdit || onDelete ? (
        <div className="flex shrink-0 gap-1">
          {onEdit ? <Button aria-label="编辑记录" onClick={onEdit} size="icon" variant="ghost"><Pencil className="size-4" /></Button> : null}
          {onDelete ? <Button aria-label="删除记录" onClick={onDelete} size="icon" variant="ghost"><Trash2 className="size-4 text-destructive" /></Button> : null}
        </div>
      ) : null}
    </article>
  );
}

export function eventTitle(event: CareEvent) {
  if (event.type === "breastfeeding") return event.endAt === null ? "正在亲喂" : "亲喂";
  if (event.type === "bottle") return event.milkType === "breastmilk" ? "瓶喂母乳" : "配方奶";
  if (event.type === "pumping") return event.endAt === null ? "正在吸奶" : "吸奶";
  if (event.type === "diaper") return event.kind === "wet" ? "尿布·小便" : event.kind === "dirty" ? "尿布·大便" : "尿布·都有";
  return event.endAt === null ? "正在睡眠" : "睡眠";
}

export function eventSummary(event: CareEvent, now = Date.now()) {
  if (event.type === "breastfeeding") {
    const side = event.segments[event.segments.length - 1]?.side === "left" ? "左侧" : "右侧";
    return `${side} · ${formatCareDuration(calculateBreastfeedingDuration(event, now))}`;
  }
  if (event.type === "bottle") return `${event.amountMl} ml`;
  if (event.type === "pumping") return `${event.side === "both" ? "双侧" : event.side === "left" ? "左侧" : "右侧"} · ${event.amountMl === null ? "未记录奶量" : `${event.amountMl} ml`}${event.endAt === null ? " · 计时中" : ""}`;
  if (event.type === "sleep") return event.endAt === null ? `已睡 ${formatCareDuration(now - Date.parse(event.startAt))}` : formatCareDuration(Date.parse(event.endAt) - Date.parse(event.startAt));
  return event.kind === "both" ? "小便和大便" : event.kind === "wet" ? "小便" : "大便";
}
