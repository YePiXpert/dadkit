"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Hospital,
  type LucideIcon,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
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
  type TimelineTaskStatus,
} from "@/lib/timeline";
import { formatBabyZodiacLine, getBabyMascot } from "@/lib/baby-profile";
import type { ChecklistItem, HospitalAnswer, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

type StageVisualState = "done" | "current" | "late" | "upcoming";

type TimelineDashboardProps = {
  profile: UserProfile;
  checklist: ChecklistItem[];
  hospitalAnswers: HospitalAnswer[];
  statuses: TimelineTaskStatus[];
  onToggleTask: (task: TimelineTask) => void;
};

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
    card: "border-primary/40 bg-secondary/60 shadow-soft",
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
    card: "border-amber/55 bg-amber-soft/65",
    chip: "bg-amber-soft text-amber-foreground",
    dot: "border-amber bg-amber-soft text-amber-foreground",
    status: "需补齐",
  },
  upcoming: {
    card: "border-border bg-card/90",
    chip: "bg-secondary text-muted-foreground",
    dot: "border-border bg-card text-muted-foreground",
    status: "后面再看",
  },
};

export function TimelineDashboard({
  checklist,
  hospitalAnswers,
  onToggleTask,
  profile,
  statuses,
}: TimelineDashboardProps) {
  const dueDate = profile.dueDate;

  if (!dueDate) {
    return null;
  }

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
        statuses,
        hospitalAnswers,
      )
    : undefined;
  const todayTasks = generateTodayTasks(
    profile,
    checklist,
    statuses,
    hospitalAnswers,
  ).slice(0, 4);
  const overallStats = timeline.reduce(
    (total, stage) => {
      const stats = calculateTimelineStageStatus(
        stage,
        checklist,
        statuses,
        hospitalAnswers,
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
  const currentStageList =
    currentStageIndex >= 0
      ? [timeline[currentStageIndex]]
      : currentStage
        ? [currentStage]
        : [];
  const otherStageList = timeline.filter(
    (stage) => !currentStageList.some((current) => current?.id === stage.id),
  );

  return (
    <section className="mobile-shell grid gap-3 overflow-hidden">
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
        hospitalAnswers={hospitalAnswers}
        statuses={statuses}
        tasks={todayTasks}
        onToggleTask={onToggleTask}
      />

      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black tracking-normal">阶段安排</h2>
        <span className="text-xs font-bold text-muted-foreground">
          先处理本阶段
        </span>
      </div>
      <ol className="grid min-w-0 gap-3 overflow-hidden">
        {currentStageList.map((stage) => {
          const index = timeline.findIndex((candidate) => candidate.id === stage.id);

          return (
            <TimelineStageRow
              checklist={checklist}
              currentStageIndex={currentStageIndex}
              dueDate={dueDate}
              hospitalAnswers={hospitalAnswers}
              index={index}
              key={stage.id}
              stage={stage}
              statuses={statuses}
              onToggleTask={onToggleTask}
            />
          );
        })}
      </ol>
      {otherStageList.length > 0 ? (
        <details className="rounded-lg border border-white/90 bg-card/90 p-3 shadow-sm">
          <summary className="cursor-pointer text-sm font-bold text-primary">
            查看其他阶段
          </summary>
          <ol className="mt-3 grid min-w-0 gap-3 overflow-hidden">
            {otherStageList.map((stage) => {
              const index = timeline.findIndex(
                (candidate) => candidate.id === stage.id,
              );

              return (
                <TimelineStageRow
                  checklist={checklist}
                  currentStageIndex={currentStageIndex}
                  dueDate={dueDate}
                  hospitalAnswers={hospitalAnswers}
                  index={index}
                  key={stage.id}
                  stage={stage}
                  statuses={statuses}
                  onToggleTask={onToggleTask}
                />
              );
            })}
          </ol>
        </details>
      ) : null}

      <TimelineDueDateCard profile={profile} />

      <Link
        className="pony-gradient-button inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold"
        href="/go"
      >
        打开临出门检查
        <ArrowRight className="size-4" />
      </Link>
    </section>
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
    <section className="pony-soft-card w-full max-w-full overflow-hidden p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-kicker">时间线</p>
          <h1 className="mt-1 break-words text-2xl font-black leading-tight tracking-normal">
            {stage ? stage.title : "准备时间线"}
          </h1>
          <p className="mt-2 break-words text-sm font-medium leading-6 text-muted-foreground">
            预产期 {formatDueDateLabel(dueDate)}
            {typeof daysLeft === "number" ? ` · ${formatDaysLeft(daysLeft)}` : ""}
          </p>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
          <CalendarClock className="size-6" />
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-3 rounded-lg border border-white/90 bg-background/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold">整体进度</span>
          <span className="text-sm font-black text-primary">
            {overallStats.completed}/{overallStats.total}
          </span>
        </div>
        <Progress className="h-2.5 bg-primary/12" value={overallPercent} />
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
  hospitalAnswers,
  onToggleTask,
  statuses,
  tasks,
}: {
  checklist: ChecklistItem[];
  hospitalAnswers: HospitalAnswer[];
  onToggleTask: (task: TimelineTask) => void;
  statuses: TimelineTaskStatus[];
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
              可前往临出门检查确认关键事项。
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid w-full min-w-0 max-w-full gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black tracking-normal">当前优先</h2>
        <span className="text-xs font-bold text-primary">{tasks.length} 项</span>
      </div>
      <div className="w-full overflow-hidden rounded-lg border border-white/90 bg-card/95 shadow-soft">
        {tasks.map((task) => (
          <TaskRow
            checklist={checklist}
            compact
            hospitalAnswers={hospitalAnswers}
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
  hospitalAnswers,
  index,
  onToggleTask,
  stage,
  statuses,
}: {
  checklist: ChecklistItem[];
  currentStageIndex: number;
  dueDate: string;
  hospitalAnswers: HospitalAnswer[];
  index: number;
  onToggleTask: (task: TimelineTask) => void;
  stage: TimelineStage;
  statuses: TimelineTaskStatus[];
}) {
  const stats = calculateTimelineStageStatus(
    stage,
    checklist,
    statuses,
    hospitalAnswers,
  );
  const state = getStageState(stats, index, currentStageIndex);
  const tone = stageTone[state];
  const StageIcon = stageIcons[stage.id];
  const pendingTasks = stage.tasks.filter(
    (task) =>
      !isTimelineTaskComplete(task, checklist, statuses, hospitalAnswers),
  );
  const previewTasks =
    pendingTasks.length > 0 ? pendingTasks : stage.tasks.slice(0, 2);

  return (
    <li className="min-w-0">
      <article
        className={cn(
          "min-w-0 overflow-hidden rounded-lg border p-3 shadow-sm",
          tone.card,
        )}
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full border-2",
                tone.dot,
              )}
            >
              <StageIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="break-words text-base font-black leading-6 tracking-normal">
                {stage.title}
              </h3>
              <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">
                {stage.subtitle} · {formatTargetDate(dueDate, stage.targetDaysBeforeDue)}
              </p>
            </div>
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
              hospitalAnswers={hospitalAnswers}
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

function TimelineDueDateCard({ profile }: { profile: UserProfile }) {
  const dueDate = profile.dueDate ?? "";
  const mascot = getBabyMascot(profile);

  return (
    <section className="pony-due-card relative min-h-[5.8rem] overflow-hidden p-4">
      <div className="relative z-10 pr-20">
        <p className="text-sm font-black text-amber-foreground">预产期</p>
        <p className="mt-1 break-words text-base font-black text-amber-foreground">
          {formatDueDateLabel(dueDate)}
        </p>
        <p className="mt-1 text-xs font-bold text-primary">
          {formatBabyZodiacLine(profile)}
        </p>
      </div>
      <span className="pointer-events-none absolute left-5 top-12 text-2xl text-amber">
        ♥
      </span>
      <Image
        alt={mascot.alt}
        className="pointer-events-none absolute -right-5 bottom-[-1.2rem] h-28 w-28 object-contain"
        height={1254}
        priority
        sizes="112px"
        src={mascot.src}
        width={1254}
      />
    </section>
  );
}

function TaskRow({
  checklist,
  compact = false,
  hospitalAnswers,
  onToggleTask,
  statuses,
  task,
}: {
  checklist: ChecklistItem[];
  compact?: boolean;
  hospitalAnswers: HospitalAnswer[];
  onToggleTask: (task: TimelineTask) => void;
  statuses: TimelineTaskStatus[];
  task: TimelineTask;
}) {
  const complete = isTimelineTaskComplete(
    task,
    checklist,
    statuses,
    hospitalAnswers,
  );
  const KindIcon = taskKindIcons[task.kind];

  return (
    <button
      className={cn(
        "flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden text-left transition-colors",
        compact
          ? "min-h-[3.35rem] border-b border-muted/60 bg-background/55 px-3 py-2.5 last:border-b-0 active:bg-secondary"
          : "rounded-md bg-background/65 px-2.5 py-2 active:bg-secondary",
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
            "block whitespace-normal break-words text-sm font-bold leading-5",
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
