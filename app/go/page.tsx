"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
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

  const tasks = generateGoModeTasks(profile, checklist);
  const completedCount = tasks.filter((task) =>
    isTimelineTaskComplete(task, checklist, timelineTaskStatuses),
  ).length;

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-2 lg:max-w-none">
        <h1 className="text-3xl font-semibold tracking-normal">临出门检查</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          只保留现在出发前要拿、要确认的事项。
        </p>
      </section>

      <Card className="mobile-shell bg-primary text-primary-foreground lg:max-w-none">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm text-primary-foreground/80">完成进度</p>
            <p className="mt-1 text-3xl font-semibold tracking-normal">
              {completedCount}/{tasks.length}
            </p>
          </div>
          <Button asChild className="bg-card text-primary hover:bg-card/90">
            <Link href="/timeline">时间线</Link>
          </Button>
        </CardContent>
      </Card>

      <section className="mobile-shell grid gap-2 lg:max-w-none">
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
    <div
      className={cn(
        "grid gap-2 rounded-lg border border-border bg-card p-2 sm:grid-cols-[1fr_auto]",
        done && "border-primary bg-secondary/60",
      )}
    >
      <Button
        className="h-16 justify-start rounded-md px-4 text-left text-lg"
        onClick={() => onChange(task.id, "done")}
        variant={done ? "default" : "outline"}
      >
        <CheckCircle2 className={cn("size-6", !done && "opacity-35")} />
        <span className="whitespace-normal leading-6">{task.title}</span>
      </Button>
      <Button
        className="h-16 px-4"
        onClick={() => onChange(task.id, "not_needed")}
        title="标记不需要"
        variant={explicitStatus === "not_needed" ? "default" : "outline"}
      >
        <span className="sm:sr-only">不需要</span>
      </Button>
    </div>
  );
}
