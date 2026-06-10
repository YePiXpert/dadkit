"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
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

  const timeline = generateTimeline(profile, checklist);
  const currentStageId = getCurrentTimelineStageId(profile);
  const currentStage = timeline.find((stage) => stage.id === currentStageId);
  const daysLeft = getDaysUntilDue(profile);

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-2 lg:max-w-none">
        <h1 className="text-3xl font-semibold tracking-normal">准备时间线</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          按预产期自动安排该问、该买、该洗、该打包的事项。
        </p>
      </section>

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="grid gap-2 p-5">
            <p className="text-sm text-primary-foreground/80">距离预产期</p>
            <p className="text-4xl font-semibold tracking-normal">
              {typeof daysLeft === "number"
                ? daysLeft > 0
                  ? `还有 ${daysLeft} 天`
                  : "已经到预产期"
                : "未设置"}
            </p>
          </CardContent>
        </Card>
        <Card>
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

      <section className="mobile-shell grid gap-3 lg:max-w-none">
        {timeline.map((stage) => {
          const stageStatus = calculateTimelineStageStatus(
            stage,
            checklist,
            timelineTaskStatuses,
          );
          const isCurrent = stage.id === currentStageId;

          return (
            <Card
              className={cn(isCurrent && "border-primary bg-secondary/40")}
              key={stage.id}
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
                      <span className="rounded-full bg-background px-3 py-1 text-sm font-semibold text-primary">
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
    <div className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex gap-3">
        {done ? (
          <CheckCircle2 className="mt-0.5 size-5 text-primary" />
        ) : (
          <CheckCircle2 className="mt-0.5 size-5 text-muted-foreground opacity-35" />
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{task.title}</p>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-primary">
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
          onClick={() => onChange(task.id, "done")}
          size="sm"
          variant={done && explicitStatus !== "not_needed" ? "default" : "outline"}
        >
          <CheckCircle2 className="size-4" />
          完成
        </Button>
        <Button
          className="flex-1 sm:flex-none"
          onClick={() => onChange(task.id, "not_needed")}
          size="sm"
          variant={explicitStatus === "not_needed" ? "default" : "outline"}
        >
          不需要
        </Button>
      </div>
    </div>
  );
}
