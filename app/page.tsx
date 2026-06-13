"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
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
  getCountdownLabel,
  getPregnancyProgress,
} from "@/lib/presentation/home-dashboard";
import { buildHomeSummary, type HomeSummary } from "@/lib/presentation/home-summary";
import { useDadKitStore } from "@/lib/store";
import type { UserProfile } from "@/lib/types";
import {
  generateTodayTasks,
  getDaysUntilDue,
  type TimelineTask,
} from "@/lib/timeline";

function overallProgress(summary: HomeSummary) {
  const total =
    summary.corePacking.total +
    summary.hospitalQuestions.total +
    summary.lastMinute.total;
  const completed =
    summary.corePacking.completed +
    summary.hospitalQuestions.completed +
    summary.lastMinute.completed;

  return {
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    total,
  };
}

export default function HomePage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const hospitalAnswers = useDadKitStore((state) => state.hospitalAnswers);
  const timelineTaskStatuses = useDadKitStore(
    (state) => state.timelineTaskStatuses,
  );
  const summary = useMemo(
    () => buildHomeSummary(checklist, hospitalAnswers),
    [checklist, hospitalAnswers],
  );
  const daysLeft = useMemo(
    () => (profile ? getDaysUntilDue(profile) : undefined),
    [profile],
  );
  const pregnancyProgress = useMemo(
    () => getPregnancyProgress(daysLeft),
    [daysLeft],
  );
  const todayTasks = useMemo(
    () =>
      profile
        ? generateTodayTasks(profile, checklist, timelineTaskStatuses).slice(0, 3)
        : [],
    [checklist, profile, timelineTaskStatuses],
  );
  const readyProgress = useMemo(() => overallProgress(summary), [summary]);

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-3">
        <HomeAppHeader />
        <HomeHeroCard
          countdownLabel={getCountdownLabel(daysLeft)}
          pregnancyProgress={pregnancyProgress}
          profile={profile}
        />
        <TodayActionsPanel
          profileReady={Boolean(profile?.dueDate)}
          tasks={todayTasks}
        />
        <OverallProgressPanel progress={readyProgress} />
      </section>

      <p className="mobile-shell text-center text-xs leading-5 text-muted-foreground">
        非医疗建议，请以医院通知和产检确认结果为准。
      </p>
    </div>
  );
}

function HomeAppHeader() {
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-1">
      <div>
        <p className="text-lg font-black leading-tight text-primary">DadKit</p>
        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
          准爸爸好帮手
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="查看提醒"
          className="flex size-9 items-center justify-center rounded-full bg-card text-foreground shadow-sm"
          type="button"
        >
          <CalendarClock className="size-4" />
        </button>
        <span className="relative flex size-9 overflow-hidden rounded-full bg-peach shadow-sm">
          <Image
            alt="准爸爸头像"
            className="object-contain p-0.5"
            fill
            priority
            sizes="36px"
            src="/illustrations/dadkit-dad-avatar.png"
          />
        </span>
      </div>
    </div>
  );
}

function HomeHeroCard({
  countdownLabel,
  pregnancyProgress,
  profile,
}: {
  countdownLabel: string;
  pregnancyProgress: ReturnType<typeof getPregnancyProgress>;
  profile?: UserProfile;
}) {
  const countdownNumber = countdownLabel.match(/\d+/)?.[0];

  return (
    <section className="relative min-h-[10.8rem] overflow-hidden rounded-lg bg-primary p-4 text-primary-foreground shadow-soft">
      <span className="pointer-events-none absolute right-7 top-5 text-xl text-peach">
        ❤
      </span>
      <span className="pointer-events-none absolute right-24 top-12 text-sm text-amber">
        ✦
      </span>
      <span className="pointer-events-none absolute right-36 bottom-10 text-base text-blush">
        ❤
      </span>

      <div className="relative z-10 max-w-[54%]">
        <p className="text-xs font-bold text-primary-foreground/80">
          距离预产期还剩
        </p>
        <h1 className="mt-2 flex items-end gap-1 text-[2.65rem] font-black leading-none tracking-normal">
          {countdownNumber ? (
            <>
              <span>{countdownNumber}</span>
              <span className="mb-1 text-base font-bold">天</span>
            </>
          ) : (
            <span className="text-3xl">{countdownLabel}</span>
          )}
        </h1>
        <p className="mt-2 text-xs font-bold text-primary-foreground/85">
          预产期：{profile?.dueDate ?? "待填写"}
        </p>
        <p className="mt-1 text-xs font-bold text-primary-foreground/85">
          {pregnancyProgress.label}
        </p>
      </div>

      <Image
        alt="准爸爸和孕妈妈一起迎接宝宝"
        className="pointer-events-none absolute right-2 top-1 h-[10.5rem] w-auto"
        height={282}
        priority
        sizes="230px"
        src="/illustrations/dadkit-family-card-v2.png"
        width={216}
      />
    </section>
  );
}

function TodayActionsPanel({
  profileReady,
  tasks,
}: {
  profileReady: boolean;
  tasks: TimelineTask[];
}) {
  const fallbackActions = [
    {
      href: "/setup",
      icon: CalendarClock,
      subtitle: "建议今天完成",
      title: "填写预产期和生产信息",
      tone: "coral" as const,
    },
    {
      href: "/setup",
      icon: Hospital,
      subtitle: "建议今天完成",
      title: "选择或确认生产医院",
      tone: "blue" as const,
    },
    {
      href: "/checklist",
      icon: ClipboardList,
      subtitle: "创建后自动生成",
      title: "生成待产包清单",
      tone: "mint" as const,
    },
  ];

  const actions = profileReady
    ? tasks.map((task, index) => ({
        href: taskHref(task),
        icon: taskIcon(task),
        subtitle: "建议今天完成",
        title: task.title,
        tone: (["coral", "blue", "mint"] as const)[index % 3],
      }))
    : fallbackActions;

  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-normal">今日行动 3 项</h2>
        <Link
          className="inline-flex items-center gap-1 text-xs font-bold text-primary"
          href={profileReady ? "/timeline" : "/setup"}
        >
          查看全部
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-white/90 bg-card/95 shadow-soft">
        {actions.map((action) => (
          <HomeActionRow action={action} key={`${action.href}-${action.title}`} />
        ))}
      </div>
    </section>
  );
}

function HomeActionRow({
  action,
}: {
  action: {
    href: string;
    icon: LucideIcon;
    subtitle: string;
    title: string;
    tone: "blue" | "coral" | "mint";
  };
}) {
  const Icon = action.icon;
  const toneClass =
    action.tone === "coral"
      ? "bg-coral-soft text-coral-foreground"
      : action.tone === "blue"
        ? "bg-lavender text-lavender-foreground"
        : "bg-mint text-primary";

  return (
    <Link
      className="flex min-h-[3.45rem] items-center gap-3 border-b border-muted/60 bg-background/55 px-3 py-2.5 transition-colors last:border-b-0 active:bg-mint/50"
      href={action.href}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-md ${toneClass}`}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold leading-5">
          {action.title}
        </span>
        <span className="mt-0.5 block text-xs font-semibold text-coral-foreground">
          {action.subtitle}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function OverallProgressPanel({
  progress,
}: {
  progress: { completed: number; percent: number; total: number };
}) {
  return (
    <section className="rounded-lg border border-white/90 bg-card/95 p-3 shadow-soft">
      <h2 className="text-sm font-bold tracking-normal">整体准备进度</h2>
      <div className="mt-3 grid grid-cols-[1fr_auto_3.5rem] items-end gap-3">
        <Progress className="mb-2 h-2.5" value={progress.percent} />
        <span className="mb-1 text-sm font-black text-primary">
          {progress.percent}%
        </span>
        <Image
          alt="小熊助手提醒准备进度"
          className="object-contain"
          height={56}
          src="/illustrations/dadkit-bear-transparent.png"
          width={56}
        />
      </div>
    </section>
  );
}

function taskHref(task: TimelineTask) {
  if (task.kind === "hospital") {
    return "/hospital";
  }

  if (task.kind === "go") {
    return "/go";
  }

  return "/checklist";
}

function taskIcon(task: TimelineTask): LucideIcon {
  if (task.kind === "hospital") {
    return Hospital;
  }

  if (task.kind === "go") {
    return CheckCircle2;
  }

  return ClipboardList;
}
