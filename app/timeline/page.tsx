"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";

import { CuteIllustration } from "@/components/CuteIllustration";
import { EmptyState } from "@/components/EmptyState";
import { PageIntro } from "@/components/PageIntro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDadKitStore } from "@/lib/store";
import {
  TIMELINE_KIND_LABELS,
  TIMELINE_STAGE_TITLES,
  calculateTimelineStageStatus,
  generateTimeline,
  getCurrentTimelineStageId,
  getDaysUntilDue,
  isTimelineTaskComplete,
  type TimelineTask,
  type TimelineTaskStatus,
} from "@/lib/timeline";
import type { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function TimelinePage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const timelineTaskStatuses = useDadKitStore(
    (state) => state.timelineTaskStatuses,
  );
  const updateTimelineTaskStatus = useDadKitStore(
    (state) => state.updateTimelineTaskStatus,
  );
  const timeline = useMemo(
    () => (profile?.dueDate ? generateTimeline(profile, checklist) : []),
    [checklist, profile],
  );
  const currentStageId = useMemo(
    () => (profile?.dueDate ? getCurrentTimelineStageId(profile) : undefined),
    [profile],
  );
  const currentStage = useMemo(
    () => timeline.find((stage) => stage.id === currentStageId),
    [currentStageId, timeline],
  );
  const daysLeft = useMemo(
    () => (profile?.dueDate ? getDaysUntilDue(profile) : undefined),
    [profile],
  );

  if (!profile?.dueDate) {
    return (
      <div className="page-shell">
        <EmptyState
          title="还没有准备时间线"
          description="填写预产期后，DadKit 会自动生成准备时间线。"
          actionHref="/setup"
          actionLabel="填写预产期"
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="阶段进度"
        title="准备时间线"
        description="按预产期自动安排该问、该买、该洗、该打包的事项。小马助手会提醒当前阶段重点。"
      />

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="app-hero-card">
          <CardContent className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_5rem] sm:items-center">
            <div>
              <p className="text-sm font-semibold text-primary-foreground/75">
                小马倒计时
              </p>
              <p className="mt-1 text-4xl font-semibold tracking-normal">
                {typeof daysLeft === "number"
                  ? daysLeft > 0
                    ? `还有 ${daysLeft} 天`
                    : "已经到预产期"
                  : "未设置"}
              </p>
              <p className="mt-3 rounded-full bg-card/20 px-3 py-1 text-xs font-semibold text-primary-foreground/80">
                预产期 {profile.dueDate}
              </p>
            </div>
            <CuteIllustration
              className="mx-auto size-20 border-white/60 bg-card/20 sm:mx-0"
              imageClassName="object-contain p-1.5"
              variant="horse"
            />
          </CardContent>
        </Card>
        <Card className="macaron-panel">
          <CardContent className="grid gap-2 p-5">
            <p className="text-sm text-muted-foreground">当前阶段</p>
            <p className="text-2xl font-semibold tracking-normal">
              {currentStage?.title ?? "准备开始"}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              {currentStage?.subtitle ?? "填写预产期后自动计算"}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mobile-shell relative grid gap-3 lg:max-w-none">
        <div className="absolute bottom-5 left-[1.125rem] top-5 w-px bg-gradient-to-b from-mint via-coral/45 to-lavender" />
        {timeline.map((stage) => {
          const stageStatus = calculateTimelineStageStatus(
            stage,
            checklist,
            timelineTaskStatuses,
          );
          const isCurrent = stage.id === currentStageId;

          return (
            <div
              className="relative grid grid-cols-[2.25rem_1fr] gap-2"
              key={stage.id}
            >
              <div className="relative z-10 flex justify-center pt-4">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border border-white/90 bg-card text-primary shadow-sm",
                    isCurrent && "bg-primary text-primary-foreground",
                    stageStatus.percent === 100 && "bg-mint text-primary",
                  )}
                >
                  {stageStatus.percent === 100 || isCurrent ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <span className="size-2 rounded-full bg-current" />
                  )}
                </span>
              </div>

              <Card
                className={cn(
                  "macaron-panel",
                  isCurrent && "border-primary/30 bg-mint/80",
                )}
              >
                <details open={isCurrent ? true : undefined}>
                  <summary className="cursor-pointer list-none">
                    <CardHeader className="gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {stage.subtitle}
                          </p>
                          <CardTitle className="mt-1">{stage.title}</CardTitle>
                        </div>
                        <span className="rounded-full bg-card px-3 py-1 text-sm font-semibold text-primary shadow-sm">
                          {stageStatus.percent}%
                        </span>
                      </div>
                      <Progress value={stageStatus.percent} />
                    </CardHeader>
                  </summary>
                  <CardContent className="grid gap-2">
                    {stage.tasks.map((task) => (
                      <TimelineTaskRow
                        checklist={checklist}
                        key={task.id}
                        onChange={updateTimelineTaskStatus}
                        statuses={timelineTaskStatuses}
                        task={task}
                      />
                    ))}
                  </CardContent>
                </details>
              </Card>
            </div>
          );
        })}
      </section>

      <div className="mobile-shell flex flex-wrap gap-2 lg:max-w-none">
        <Button asChild variant="outline">
          <Link href="/checklist">打开我的清单</Link>
        </Button>
        <Button asChild>
          <Link href="/go">临出门模式</Link>
        </Button>
      </div>
    </div>
  );
}

function TimelineTaskRow({
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
  const relatedCount = task.relatedItemIds?.length ?? 0;

  return (
    <div className="soft-detail grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex gap-3">
        {done ? (
          <CheckCircle2 className="mt-0.5 size-5 text-primary" />
        ) : (
          <CheckCircle2 className="mt-0.5 size-5 text-muted-foreground opacity-35" />
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{task.title}</p>
            <span className="rounded-full bg-lavender px-2 py-0.5 text-xs font-semibold text-lavender-foreground">
              {TIMELINE_KIND_LABELS[task.kind]}
            </span>
          </div>
          {task.description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {task.description}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {TIMELINE_STAGE_TITLES[task.stageId]}
            {relatedCount > 0 ? ` · 关联 ${relatedCount} 项清单` : ""}
            {explicitStatus === "not_needed" ? " · 已标记不需要" : ""}
          </p>
        </div>
      </div>
      <div className="flex gap-2 sm:justify-end">
        <Button
          className="flex-1 sm:flex-none"
          onClick={() =>
            onChange(task.id, explicitStatus === "done" ? "todo" : "done")
          }
          size="sm"
          variant={done && explicitStatus !== "not_needed" ? "default" : "outline"}
        >
          <CheckCircle2 className="size-4" />
          完成
        </Button>
        <Button
          className="flex-1 sm:flex-none"
          onClick={() =>
            onChange(
              task.id,
              explicitStatus === "not_needed" ? "todo" : "not_needed",
            )
          }
          size="sm"
          variant={explicitStatus === "not_needed" ? "default" : "outline"}
        >
          不需要
        </Button>
      </div>
    </div>
  );
}
