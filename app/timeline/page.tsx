"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Hospital,
  type LucideIcon,
} from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Progress } from "@/components/ui/progress";
import { useDadKitStore } from "@/lib/store";
import {
  TIMELINE_KIND_LABELS,
  calculateTimelineStageStatus,
  generateTimeline,
  generateTodayTasks,
  getCurrentTimelineStageId,
  getDaysUntilDue,
  isTimelineTaskComplete,
  type TimelineStage,
  type TimelineStageId,
  type TimelineTask,
} from "@/lib/timeline";
import { cn } from "@/lib/utils";

type StageVisualState = "done" | "current" | "late" | "upcoming";

const stageIcons: Record<TimelineStageId, LucideIcon> = {
  six_weeks: Hospital,
  four_weeks: ClipboardList,
  three_weeks: CheckCircle2,
  one_week: CalendarClock,
  go_time: ClipboardList,
};

const taskKindIcons: Record<TimelineTask["kind"], LucideIcon> = {
  dad_task: CheckCircle2,
  documents: ClipboardList,
  go: ClipboardList,
  hospital: Hospital,
  packing: CheckCircle2,
  shopping: ClipboardList,
  washing: CalendarClock,
};

const stageTone: Record<
  StageVisualState,
  {
    card: string;
    chip: string;
    dot: string;
    status: string;
  }
> = {
  current: {
    card: "border-primary/35 bg-mint/45 shadow-soft",
    chip: "bg-primary text-primary-foreground",
    dot: "border-primary bg-primary text-primary-foreground shadow-soft",
    status: "本阶段",
  },
  done: {
    card: "border-mint bg-card/95",
    chip: "bg-mint text-primary",
    dot: "border-mint bg-mint text-primary",
    status: "已完成",
  },
  late: {
    card: "border-coral/45 bg-blush/35",
    chip: "bg-blush text-coral-foreground",
    dot: "border-coral bg-blush text-coral-foreground",
    status: "需补齐",
  },
  upcoming: {
    card: "border-border bg-card/90",
    chip: "bg-secondary text-muted-foreground",
    dot: "border-border bg-card text-muted-foreground",
    status: "后面再看",
  },
};

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
          description="填写预产期后，DadKit 会自动生成准备节奏和临出门检查。"
          actionHref="/setup"
          actionLabel="填写预产期"
        />
      </div>
    );
  }

  const dueDate = profile.dueDate;
  const timeline = generateTimeline(profile, checklist);
  const currentStageId = getCurrentTimelineStageId(profile);
  const currentStageIndex = timeline.findIndex(
    (stage) => stage.id === currentStageId,
  );
  const currentStage =
    timeline.find((stage) => stage.id === currentStageId) ?? timeline[0];
  const currentStageStats = currentStage
    ? calculateTimelineStageStatus(
        currentStage,
        checklist,
        timelineTaskStatuses,
      )
    : undefined;
  const todayTasks = generateTodayTasks(
    profile,
    checklist,
    timelineTaskStatuses,
  ).slice(0, 4);
  const overallStats = timeline.reduce(
    (total, stage) => {
      const stats = calculateTimelineStageStatus(
        stage,
        checklist,
        timelineTaskStatuses,
      );

      return {
        completed: total.completed + stats.completed,
        total: total.total + stats.total,
      };
    },
    { completed: 0, total: 0 },
  );
  const overallPercent =
    overallStats.total === 0
      ? 0
      : Math.round((overallStats.completed / overallStats.total) * 100);

  function toggleTask(task: TimelineTask) {
    const complete = isTimelineTaskComplete(
      task,
      checklist,
      timelineTaskStatuses,
    );

    updateTimelineTaskStatus(task.id, complete ? "todo" : "done");
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-3 lg:max-w-none">
        <CurrentStagePanel
          daysLeft={getDaysUntilDue(profile)}
          dueDate={dueDate}
          overallPercent={overallPercent}
          overallStats={overallStats}
          stage={currentStage}
          stageStats={currentStageStats}
        />

        <PriorityTasksPanel
          checklist={checklist}
          statuses={timelineTaskStatuses}
          tasks={todayTasks}
          onToggleTask={toggleTask}
        />

        <ol className="relative grid gap-3">
          <span
            aria-hidden="true"
            className="absolute bottom-8 left-5 top-8 w-0.5 rounded-full bg-border"
          />
          {timeline.map((stage, index) => (
            <TimelineStageRow
              checklist={checklist}
              currentStageIndex={currentStageIndex}
              dueDate={dueDate}
              index={index}
              key={stage.id}
              stage={stage}
              statuses={timelineTaskStatuses}
              onToggleTask={toggleTask}
            />
          ))}
        </ol>

        <Link
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-soft"
          href="/go"
        >
          打开临出门检查
          <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}

function CurrentStagePanel({
  daysLeft,
  dueDate,
  overallPercent,
  overallStats,
  stage,
  stageStats,
}: {
  daysLeft?: number;
  dueDate: string;
  overallPercent: number;
  overallStats: { completed: number; total: number };
  stage?: TimelineStage;
  stageStats?: { completed: number; percent: number; total: number };
}) {
  return (
    <section className="rounded-lg border border-white/90 bg-card/95 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-kicker">准备时间线</p>
          <h1 className="mt-1 text-2xl font-black leading-tight tracking-normal">
            {stage ? stage.title : "先把准备节奏理顺"}
          </h1>
          <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
            预产期 {formatDueDateLabel(dueDate)}
            {typeof daysLeft === "number" ? ` · ${formatDaysLeft(daysLeft)}` : ""}
          </p>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
          <CalendarClock className="size-6" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-lg border border-white/90 bg-background/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold">整体进度</span>
          <span className="text-sm font-black text-primary">
            {overallStats.completed}/{overallStats.total}
          </span>
        </div>
        <Progress className="h-2.5" value={overallPercent} />
        {stageStats ? (
          <p className="text-xs font-medium text-muted-foreground">
            当前阶段完成 {stageStats.completed}/{stageStats.total} 项
          </p>
        ) : null}
      </div>
    </section>
  );
}

function PriorityTasksPanel({
  checklist,
  onToggleTask,
  statuses,
  tasks,
}: {
  checklist: Parameters<typeof isTimelineTaskComplete>[1];
  onToggleTask: (task: TimelineTask) => void;
  statuses: Parameters<typeof isTimelineTaskComplete>[2];
  tasks: TimelineTask[];
}) {
  if (tasks.length === 0) {
    return (
      <section className="rounded-lg border border-mint bg-mint/45 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-5 text-primary" />
          <div>
            <h2 className="text-base font-bold">当前阶段已处理完</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              可以去临出门检查里确认最后一遍。
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-normal">现在优先看</h2>
        <span className="text-xs font-bold text-primary">{tasks.length} 项</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-white/90 bg-card/95 shadow-soft">
        {tasks.map((task) => (
          <TaskRow
            checklist={checklist}
            compact
            key={task.id}
            statuses={statuses}
            task={task}
            onToggleTask={onToggleTask}
          />
        ))}
      </div>
    </section>
  );
}

function TimelineStageRow({
  checklist,
  currentStageIndex,
  dueDate,
  index,
  onToggleTask,
  stage,
  statuses,
}: {
  checklist: Parameters<typeof isTimelineTaskComplete>[1];
  currentStageIndex: number;
  dueDate: string;
  index: number;
  onToggleTask: (task: TimelineTask) => void;
  stage: TimelineStage;
  statuses: Parameters<typeof isTimelineTaskComplete>[2];
}) {
  const stats = calculateTimelineStageStatus(stage, checklist, statuses);
  const state = getStageState(stats, index, currentStageIndex);
  const tone = stageTone[state];
  const StageIcon = stageIcons[stage.id];
  const pendingTasks = stage.tasks.filter(
    (task) => !isTimelineTaskComplete(task, checklist, statuses),
  );
  const previewTasks = pendingTasks.length > 0 ? pendingTasks : stage.tasks.slice(0, 2);

  return (
    <li className="relative grid grid-cols-[2.75rem_1fr] gap-3">
      <div className="relative z-10 flex justify-center pt-4">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-full border-2",
            tone.dot,
          )}
        >
          <StageIcon className="size-5" />
        </span>
      </div>
      <article className={cn("rounded-lg border p-3 shadow-sm", tone.card)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-black leading-6 tracking-normal">
              {stage.title}
            </h3>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {stage.subtitle} · {formatTargetDate(dueDate, stage.targetDaysBeforeDue)}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
              tone.chip,
            )}
          >
            {tone.status}
          </span>
        </div>

        <div className="mt-3 grid gap-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground">完成进度</span>
            <span className="text-primary">
              {stats.completed}/{stats.total}
            </span>
          </div>
          <Progress className="h-2" value={stats.percent} />
        </div>

        <div className="mt-3 grid gap-2">
          {previewTasks.slice(0, 3).map((task) => (
            <TaskRow
              checklist={checklist}
              key={task.id}
              statuses={statuses}
              task={task}
              onToggleTask={onToggleTask}
            />
          ))}
          {pendingTasks.length > 3 ? (
            <p className="text-xs font-medium text-muted-foreground">
              还有 {pendingTasks.length - 3} 项待处理
            </p>
          ) : null}
        </div>
      </article>
    </li>
  );
}

function TaskRow({
  checklist,
  compact = false,
  onToggleTask,
  statuses,
  task,
}: {
  checklist: Parameters<typeof isTimelineTaskComplete>[1];
  compact?: boolean;
  onToggleTask: (task: TimelineTask) => void;
  statuses: Parameters<typeof isTimelineTaskComplete>[2];
  task: TimelineTask;
}) {
  const complete = isTimelineTaskComplete(task, checklist, statuses);
  const KindIcon = taskKindIcons[task.kind];

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 text-left transition-colors",
        compact
          ? "min-h-[3.35rem] border-b border-muted/60 bg-background/55 px-3 py-2.5 last:border-b-0 active:bg-mint/50"
          : "rounded-md bg-background/65 px-2.5 py-2 active:bg-mint/50",
      )}
      type="button"
      onClick={() => onToggleTask(task)}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          complete ? "bg-mint text-primary" : "bg-secondary text-muted-foreground",
        )}
      >
        {complete ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <KindIcon className="size-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-bold leading-5",
            complete && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </span>
        <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
          {TIMELINE_KIND_LABELS[task.kind]}
        </span>
      </span>
      {complete ? (
        <CheckCircle2 className="size-4 shrink-0 text-primary" />
      ) : (
        <span
          aria-hidden="true"
          className="size-3 shrink-0 rounded-full border border-muted-foreground/60"
        />
      )}
    </button>
  );
}

function getStageState(
  stats: { completed: number; total: number },
  index: number,
  currentStageIndex: number,
): StageVisualState {
  if (stats.total > 0 && stats.completed === stats.total) {
    return "done";
  }

  if (index === currentStageIndex || currentStageIndex < 0) {
    return "current";
  }

  if (index < currentStageIndex) {
    return "late";
  }

  return "upcoming";
}

function formatDaysLeft(daysLeft: number) {
  if (daysLeft <= 0) {
    return "已经到预产期";
  }

  return `距离预产期 ${daysLeft} 天`;
}

function formatTargetDate(dueDate: string, daysBeforeDue: number) {
  if (daysBeforeDue === 0) {
    return "预产期当天";
  }

  const targetDate = addDays(parseLocalDate(dueDate), -daysBeforeDue);

  return `约 ${formatDate(targetDate)}`;
}

function formatDueDateLabel(dueDate: string) {
  const date = parseLocalDate(dueDate);
  const weekday = formatWeekday(date);

  return `${dueDate}${weekday ? `（${weekday}）` : ""}`;
}

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, (month || 1) - 1, day || 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatWeekday(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][
    date.getDay()
  ];
}
