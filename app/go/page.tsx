"use client";

import Image from "next/image";
import { useMemo } from "react";
import { Check } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { GoAdmissionInfoCard } from "@/components/GoAdmissionInfoCard";
import { Button } from "@/components/ui/button";
import { buildPreparationSummary } from "@/lib/presentation/preparation-summary";
import { useDadKitStore } from "@/lib/store";
import {
  generateGoModeTasks,
  isTimelineTaskComplete,
  type TimelineTask,
  type TimelineTaskStatus,
} from "@/lib/timeline";
import type { ChecklistItem, HospitalAnswer } from "@/lib/types";
import { cn } from "@/lib/utils";

type GoChecklistDisplayItem = {
  accent: "teal" | "pink";
  taskIds: string[];
  title: string;
};

const GO_DISPLAY_ITEMS: GoChecklistDisplayItem[] = [
  {
    accent: "teal",
    taskIds: ["timeline-go-documents"],
    title: "证件包（身份证、医保卡等）",
  },
  {
    accent: "teal",
    taskIds: ["timeline-go-phone", "timeline-go-charger"],
    title: "手机 + 充电器",
  },
  {
    accent: "pink",
    taskIds: ["timeline-go-labor-signal-note"],
    title: "临产信号记录（破水/见红/胎动）",
  },
  {
    accent: "teal",
    taskIds: ["timeline-go-wallet"],
    title: "钱包 / 现金",
  },
  {
    accent: "teal",
    taskIds: ["timeline-go-medical-card"],
    title: "医保卡 / 就诊卡",
  },
  {
    accent: "pink",
    taskIds: ["timeline-go-mom-bag", "timeline-go-baby-bag"],
    title: "待产包（妈妈包 + 宝宝包）",
  },
  {
    accent: "teal",
    taskIds: ["timeline-go-water-cup"],
    title: "水杯 / 吸管杯",
  },
];

export default function GoPage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const birthPlan = useDadKitStore((state) => state.birthPlan);
  const contractions = useDadKitStore((state) => state.contractions);
  const hospitalAnswers = useDadKitStore((state) => state.hospitalAnswers);
  const postpartumTasks = useDadKitStore((state) => state.postpartumTasks);
  const timelineTaskStatuses = useDadKitStore(
    (state) => state.timelineTaskStatuses,
  );
  const saveBirthPlan = useDadKitStore((state) => state.saveBirthPlan);
  const updateTimelineTaskStatus = useDadKitStore(
    (state) => state.updateTimelineTaskStatus,
  );
  const tasks = useMemo(
    () => (profile ? generateGoModeTasks(profile, checklist) : []),
    [checklist, profile],
  );
  const taskById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );
  const completedCount = useMemo(
    () =>
      tasks.filter((task) =>
        isTimelineTaskComplete(
          task,
          checklist,
          timelineTaskStatuses,
          hospitalAnswers,
        ),
      ).length,
    [checklist, hospitalAnswers, tasks, timelineTaskStatuses],
  );
  const preparationSummary = useMemo(
    () =>
      profile
        ? buildPreparationSummary({
            birthPlan,
            checklist,
            contractions,
            hospitalAnswers,
            postpartumTasks,
            profile,
            timelineTaskStatuses,
          })
        : undefined,
    [
      birthPlan,
      checklist,
      contractions,
      hospitalAnswers,
      postpartumTasks,
      profile,
      timelineTaskStatuses,
    ],
  );
  const goReadiness = preparationSummary?.modules.find(
    (module) => module.id === "go",
  );
  const readinessCompleted = goReadiness?.completed ?? completedCount;
  const readinessTotal = goReadiness?.total ?? tasks.length;
  const remainingCount = Math.max(0, readinessTotal - readinessCompleted);
  const progressPercent =
    goReadiness?.percent ??
    (tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100));
  const hasAnyAdmissionInfo = Boolean(
    birthPlan.hospitalPhone.trim() ||
      birthPlan.hospitalAddress.trim() ||
      birthPlan.hospitalRouteNotes.trim() ||
      birthPlan.nightEntranceNotes.trim() ||
      birthPlan.parkingNotes.trim(),
  );

  function displayItemDone(item: GoChecklistDisplayItem) {
    return item.taskIds.every((taskId) =>
      isDisplayTaskDone(
        taskId,
        taskById,
        checklist,
        timelineTaskStatuses,
        hospitalAnswers,
      ),
    );
  }

  function toggleDisplayItem(item: GoChecklistDisplayItem) {
    const nextStatus = displayItemDone(item) ? "todo" : "done";

    item.taskIds.forEach((taskId) => updateTimelineTaskStatus(taskId, nextStatus));
  }

  function markAllDone() {
    tasks.forEach((task) => {
      if (
        !isTimelineTaskComplete(
          task,
          checklist,
          timelineTaskStatuses,
          hospitalAnswers,
        )
      ) {
        updateTimelineTaskStatus(task.id, "done");
      }
    });

    GO_DISPLAY_ITEMS.forEach((item) => {
      item.taskIds.forEach((taskId) => {
        if (!taskById.has(taskId)) {
          updateTimelineTaskStatus(taskId, "done");
        }
      });
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
      <section className="mobile-shell grid gap-4 bg-card px-4 pb-4 pt-1 lg:max-w-none">
        <div className="grid gap-1">
          <h1 className="text-[1.7rem] font-black leading-tight tracking-normal">
            临出门检查
          </h1>
          <p className="text-sm font-semibold leading-6 text-muted-foreground">
            出发前快速确认
          </p>
        </div>

        <div className="relative min-h-[8.25rem] overflow-hidden rounded-lg bg-[linear-gradient(100deg,#ff8385_0%,#ffa1ad_50%,#ffe4e8_100%)] p-4 shadow-sm">
          <span className="pointer-events-none absolute right-[7.2rem] top-5 text-lg text-amber">
            ★
          </span>
          <span className="pointer-events-none absolute right-[5.8rem] top-9 text-xs text-coral">
            ❤
          </span>
          <span className="pointer-events-none absolute right-8 top-4 text-xs text-blush">
            ❤
          </span>
          <div className="relative z-10 max-w-[58%]">
            <p className="text-sm font-bold text-white/85">准备就绪度</p>
            <p className="mt-1 text-4xl font-black leading-none tracking-normal text-white">
              {progressPercent}%
            </p>
            <p className="mt-2 text-sm font-bold text-white/90">
              已完成 {readinessCompleted} / 共 {readinessTotal} 项
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/80">
              含行动卡、路线电话和联系人
            </p>
          </div>
          <Image
            alt="临出门检查插图"
            className="absolute -bottom-5 -right-5 h-40 w-40 object-contain object-bottom"
            height={1254}
            priority
            src="/illustrations/dadkit-horse-girl.png"
            width={1254}
          />
        </div>

        <GoAdmissionInfoCard
          birthPlan={birthPlan}
          hasAnyAdmissionInfo={hasAnyAdmissionInfo}
          onUpdate={saveBirthPlan}
        />

        <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="border-b border-border/80 px-4 py-3">
            <h2 className="text-base font-black tracking-normal">
              必带物品
              <span className="ml-2 text-sm font-semibold text-muted-foreground">
                （部分示例）
              </span>
            </h2>
          </div>
          <div className="grid divide-y divide-border/70">
            {GO_DISPLAY_ITEMS.map((item) => (
              <GoChecklistRow
                done={displayItemDone(item)}
                item={item}
                key={item.title}
                onToggle={() => toggleDisplayItem(item)}
              />
            ))}
          </div>
        </section>

        <Button
          className="h-14 w-full rounded-lg bg-primary text-base font-black shadow-soft"
          disabled={tasks.length === 0 && remainingCount === 0}
          onClick={markAllDone}
        >
          全部确认，出发
        </Button>
      </section>
    </div>
  );
}

function GoChecklistRow({
  done,
  item,
  onToggle,
}: {
  done: boolean;
  item: GoChecklistDisplayItem;
  onToggle: () => void;
}) {
  return (
    <button
      className="grid min-h-[3.35rem] grid-cols-[2rem_1fr_2rem] items-center gap-2 px-4 text-left transition hover:bg-muted/45"
      onClick={onToggle}
      type="button"
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-md border-2",
          item.accent === "pink"
            ? "border-coral/65 text-coral-foreground"
            : "border-primary/60 text-primary",
        )}
      >
        {done ? <Check className="size-3.5 stroke-[3]" /> : null}
      </span>
      <span className="min-w-0 break-words text-base font-bold leading-5 tracking-normal">
        {item.title}
      </span>
      <span className="justify-self-end text-primary">
        <Check className="size-4 stroke-[3]" />
      </span>
    </button>
  );
}

function isDisplayTaskDone(
  taskId: string,
  taskById: Map<string, TimelineTask>,
  checklist: ChecklistItem[],
  statuses: TimelineTaskStatus[],
  hospitalAnswers: HospitalAnswer[],
) {
  const task = taskById.get(taskId);

  if (task) {
    return isTimelineTaskComplete(task, checklist, statuses, hospitalAnswers);
  }

  const explicitStatus = statuses.find((status) => status.taskId === taskId)?.status;

  return explicitStatus === "done" || explicitStatus === "not_needed";
}
