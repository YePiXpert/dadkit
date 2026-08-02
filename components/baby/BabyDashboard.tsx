"use client";

import Link from "next/link";
import { Baby, BedDouble, Milk, Pencil, ShowerHead } from "lucide-react";
import { useMemo, useState } from "react";

import { BabyQuickActionDialog } from "@/components/baby/BabyQuickActionDialog";
import { CareEventRow } from "@/components/baby/CareEventRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { birthDayNumber } from "@/lib/baby/date";
import { deriveTodayCareSummary, formatCareDuration, getLastFeedingEvent } from "@/lib/baby/selectors";
import { careEventSortTime, formatCareRelativeTime } from "@/lib/baby/time";
import { useBabyStore } from "@/lib/baby/store";
import type { CareEventType } from "@/lib/baby/types";

export function BabyDashboard({ onEditProfile }: { onEditProfile(): void }) {
  const profile = useBabyStore((state) => state.profile);
  const recentEvents = useBabyStore((state) => state.recentEvents);
  const todayEvents = useBabyStore((state) => state.todayEvents);
  const activeEvents = useBabyStore((state) => state.activeEvents);
  const careClearedAt = useBabyStore((state) => state.careClearedAt);
  const [action, setAction] = useState<CareEventType>();
  const now = Date.now();
  const events = useMemo(() => {
    const map = new Map([...recentEvents, ...activeEvents].map((event) => [event.id, event]));
    return [...map.values()];
  }, [activeEvents, recentEvents]);
  const summary = deriveTodayCareSummary(todayEvents, new Date(now), { now, clearedAt: careClearedAt });
  const lastFeeding = getLastFeedingEvent(events, careClearedAt);
  const day = birthDayNumber(profile.fields.birthDate.value);
  const nickname = profile.fields.nickname.value || "宝宝";

  return (
    <>
      <header className="rounded-card border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm font-semibold text-primary">宝宝记录</p><h1 className="mt-1 text-2xl font-bold break-words">{nickname}</h1><p className="mt-1 text-sm text-muted-foreground">{day ? `出生第 ${day} 天` : "出生日期待确认"}</p></div>
          <Button aria-label="编辑宝宝资料" onClick={onEditProfile} size="icon" variant="outline"><Pencil className="size-4" /></Button>
        </div>
        <p className="mt-4 rounded-xl bg-secondary p-3 text-sm">{lastFeeding ? `最近喂养：${formatCareRelativeTime(lastFeeding.type === "bottle" ? lastFeeding.occurredAt : lastFeeding.startAt, now)}` : "还没有喂养记录"}</p>
      </header>

      <section aria-label="快速记录" className="grid grid-cols-5 gap-2">
        {QUICK_ACTIONS.map(({ type, label, Icon }) => (
          <button className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card px-1 py-3 text-xs font-semibold shadow-sm transition-colors hover:bg-secondary" key={type} onClick={() => setAction(type)} type="button"><Icon className="size-5 text-primary" /><span>{label}</span></button>
        ))}
      </section>

      {activeEvents.length > 0 ? (
        <Card><CardHeader><CardTitle>进行中的记录</CardTitle></CardHeader><CardContent className="grid gap-2">{activeEvents.map((event) => <Button className="justify-between" key={event.id} onClick={() => setAction(event.type)} variant="secondary"><span>{event.type === "breastfeeding" ? "正在亲喂" : event.type === "pumping" ? "正在吸奶" : "正在睡眠"}</span><span>打开计时</span></Button>)}</CardContent></Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>今日汇总</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <SummaryItem label="亲喂" value={`${summary.breastfeedingCount} 次 · ${formatCareDuration(summary.breastfeedingDurationMs)}`} />
          <SummaryItem label="瓶喂母乳" value={`${summary.breastmilkBottleCount} 次 · ${summary.breastmilkBottleMl} ml`} />
          <SummaryItem label="配方奶" value={`${summary.formulaCount} 次 · ${summary.formulaMl} ml`} />
          <SummaryItem label="吸奶" value={`${summary.pumpingCount} 次 · ${summary.pumpingRecordedAmountCount ? `${summary.pumpingMl} ml` : "奶量未记录"}`} />
          <SummaryItem label="尿布" value={`小便 ${summary.wetDiaperCount} · 大便 ${summary.dirtyDiaperCount}`} />
          <SummaryItem label="睡眠" value={`${summary.completedSleepCount} 次 · ${formatCareDuration(summary.sleepDurationMs)}${summary.sleeping ? " · 进行中" : ""}`} />
        </CardContent>
      </Card>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3 px-1"><div><h2 className="font-semibold">最近 24 小时</h2><p className="text-xs text-muted-foreground">按发生时间显示最近记录</p></div><Button asChild size="sm" variant="outline"><Link href="/baby/timeline">查看全部记录</Link></Button></div>
        {recentEvents.filter((event) => careEventSortTime(event) >= now - 86_400_000 || activeEvents.some((active) => active.id === event.id)).slice(0, 12).map((event) => <CareEventRow event={event} key={event.id} now={now} />)}
        {recentEvents.length === 0 ? <div className="rounded-card border border-dashed border-border p-6 text-center text-sm text-muted-foreground">记录会保存在本机 IndexedDB，断网时也能继续使用。</div> : null}
      </section>

      <BabyQuickActionDialog action={action} onOpenChange={(open) => !open && setAction(undefined)} open={Boolean(action)} />
    </>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-xl bg-secondary p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words font-semibold">{value}</p></div>;
}

const QUICK_ACTIONS = [
  { type: "breastfeeding", label: "亲喂", Icon: Baby },
  { type: "bottle", label: "瓶喂", Icon: Milk },
  { type: "pumping", label: "吸奶", Icon: Milk },
  { type: "diaper", label: "尿布", Icon: ShowerHead },
  { type: "sleep", label: "睡眠", Icon: BedDouble },
] as const;
