"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
} from "lucide-react";

import { CuteIllustration } from "@/components/CuteIllustration";
import { EmptyState } from "@/components/EmptyState";
import { PageIntro } from "@/components/PageIntro";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDadKitStore } from "@/lib/store";
import {
  generateGoModeTasks,
  isTimelineTaskComplete,
  type TimelineTask,
  type TimelineTaskStatus,
} from "@/lib/timeline";
import type { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function GoPage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const timelineTaskStatuses = useDadKitStore(
    (state) => state.timelineTaskStatuses,
  );
  const updateTimelineTaskStatus = useDadKitStore(
    (state) => state.updateTimelineTaskStatus,
  );
  const tasks = useMemo(
    () => (profile ? generateGoModeTasks(profile, checklist) : []),
    [checklist, profile],
  );
  const completedCount = useMemo(
    () =>
      tasks.filter((task) =>
        isTimelineTaskComplete(task, checklist, timelineTaskStatuses),
      ).length,
    [checklist, tasks, timelineTaskStatuses],
  );
  const remainingCount = Math.max(0, tasks.length - completedCount);
  const progressPercent =
    tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  function markAllDone() {
    tasks.forEach((task) => {
      if (!isTimelineTaskComplete(task, checklist, timelineTaskStatuses)) {
        updateTimelineTaskStatus(task.id, "done");
      }
    });
  }

  if (!profile) {
    return (
      <div className="page-shell">
        <EmptyState
          title="还没有临出门检查"
          description="创建清单后，DadKit 会只保留出发前要拿、要确认的事项。"
          actionHref="/setup"
          actionLabel="开始创建清单"
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="出发前收口"
        title="临出门检查"
        description="只保留现在出发前要拿、要确认的事项。小马助手帮你把最后一遍检查跑完。"
      />

      <Card className="mobile-shell overflow-hidden border-coral/20 bg-coral-soft/80 shadow-soft lg:max-w-none">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-coral-foreground/75">
              准备就绪度
            </p>
            <p className="mt-1 text-4xl font-bold tracking-normal text-coral-foreground">
              {progressPercent}%
            </p>
            <p className="mt-1 text-sm font-semibold text-coral-foreground/75">
              已完成 {completedCount} 项 / 共 {tasks.length} 项
            </p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-card/80">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-card/80 px-3 py-1 text-primary">
                还剩 {remainingCount} 项
              </span>
              <span className="rounded-full bg-card/80 px-3 py-1 text-coral-foreground">
                出门前 15 分钟复查
              </span>
            </div>
          </div>
          <CuteIllustration
            className="mx-auto size-28 border-white/70 bg-blush sm:mx-0"
            imageClassName="object-contain p-2"
            variant="horse"
          />
        </CardContent>
      </Card>

      <section className="mobile-shell grid gap-2 lg:max-w-none">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">必带物品</p>
            <h2 className="text-xl font-bold tracking-normal">最后一遍核对</h2>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/timeline">
              <CalendarClock className="size-4" />
              时间线
            </Link>
          </Button>
        </div>
        {tasks.map((task) => (
          <GoTaskButton
            checklist={checklist}
            key={task.id}
            onChange={updateTimelineTaskStatus}
            statuses={timelineTaskStatuses}
            task={task}
          />
        ))}
      </section>

      <section className="mobile-shell grid gap-2 lg:max-w-none">
        <Button
          className="h-14 w-full bg-primary text-base shadow-soft"
          onClick={markAllDone}
          disabled={tasks.length === 0 || remainingCount === 0}
        >
          <ArrowRight className="size-5" />
          {remainingCount === 0 ? "已经全部 OK" : "全部 OK，出发！"}
        </Button>
        <p className="text-center text-xs leading-5 text-muted-foreground">
          这只是出门前核对清单，入院决定仍以医生和医院要求为准。
        </p>
      </section>
    </div>
  );
}

function GoTaskButton({
  checklist,
  onChange,
  statuses,
  task,
}: {
  checklist: ChecklistItem[];
  onChange: (taskId: string, status: TimelineTaskStatus["status"]) => void;
  statuses: TimelineTaskStatus[];
  task: TimelineTask;
}) {
  const explicitStatus = statuses.find((status) => status.taskId === task.id)?.status;
  const done = isTimelineTaskComplete(task, checklist, statuses);

  return (
    <article
      className={cn(
        "app-list-row min-h-[4.25rem] items-start bg-card/95 p-3",
        done && "border-primary/30 bg-mint/85",
      )}
    >
      <button
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
        onClick={() =>
          onChange(task.id, explicitStatus === "done" ? "todo" : "done")
        }
        type="button"
      >
        <span
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border",
            done
              ? "border-primary bg-primary text-primary-foreground"
              : "border-primary/35 bg-card text-transparent",
          )}
        >
          {done ? <Check className="size-4" /> : <CheckCircle2 className="size-4" />}
        </span>
        <span className="min-w-0">
          <span className="block text-base font-bold leading-6">{task.title}</span>
          <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">
            {done ? "已确认" : "出门前确认"}
          </span>
        </span>
      </button>
      <Button
        className="size-10 shrink-0 rounded-full px-0"
        onClick={() =>
          onChange(
            task.id,
            explicitStatus === "not_needed" ? "todo" : "not_needed",
          )
        }
        title="标记不需要"
        variant={explicitStatus === "not_needed" ? "default" : "outline"}
      >
        <ArrowRight className="size-4" />
        <span className="sr-only">不需要</span>
      </Button>
    </article>
  );
}
