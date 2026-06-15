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
        <HomeToolsPanel />
      </section>

      <p className="mobile-shell text-center text-xs leading-5 text-muted-foreground">
        非医疗建议，请以医院通知和产检确认结果为准。
      </p>
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
  const dueDateLabel = formatHomeDueDate(profile?.dueDate);

  return (
    <section className="pony-hero-card min-h-[11.25rem]">
      <span className="pointer-events-none absolute right-6 top-5 text-2xl text-amber">
        ✿
      </span>
      <span className="pointer-events-none absolute right-28 top-9 text-xl text-amber-soft">
        ✦
      </span>
      <span className="pointer-events-none absolute right-[8.5rem] bottom-8 text-lg text-blush">
        ❤
      </span>

      <div className="relative z-10 max-w-[58%]">
        <p className="text-sm font-black text-primary-foreground/90">预产期</p>
        <h1 className="mt-2 flex items-end gap-1 text-[3.15rem] font-black leading-none tracking-normal">
          {countdownNumber ? (
            <>
              <span>{countdownNumber}</span>
              <span className="mb-1 text-lg font-bold">天</span>
            </>
          ) : (
            <span className="text-3xl">{countdownLabel}</span>
          )}
        </h1>
        <p className="mt-3 text-sm font-bold text-primary-foreground/95">
          {dueDateLabel}
        </p>
        <p className="mt-1 text-xs font-bold text-primary-foreground/90">
          丙午年 · 火马宝宝女孩
        </p>
        <p className="mt-1 text-xs font-bold text-primary-foreground/80">
          {pregnancyProgress.label}
        </p>
      </div>

      <Image
        alt="戴粉色蝴蝶结的小马宝宝助手"
        className="pointer-events-none absolute -right-9 bottom-[-1.7rem] h-[12rem] w-[12rem] object-contain drop-shadow-sm"
        height={1254}
        priority
        sizes="220px"
        src="/illustrations/dadkit-horse-girl.png"
        width={1254}
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
        <h2 className="text-base font-black tracking-normal">
          今日行动 {actions.length} 项
        </h2>
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
      ? "bg-secondary text-primary"
      : action.tone === "blue"
        ? "bg-lavender text-lavender-foreground"
        : "bg-mint text-primary";

  return (
    <Link
      className="flex min-h-[3.85rem] items-center gap-3 border-b border-muted/60 bg-background/55 px-3 py-2.5 transition-colors last:border-b-0 active:bg-secondary"
      href={action.href}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${toneClass}`}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold leading-5">
          {action.title}
        </span>
        <span className="mt-0.5 block text-xs font-semibold text-primary">
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
    <section className="pony-due-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black tracking-normal">准备进度</h2>
            <span className="text-sm font-black text-primary">
              {progress.completed}/{progress.total}
            </span>
          </div>
          <Progress className="mt-3 h-2.5 bg-primary/12" value={progress.percent} />
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            已完成 {progress.completed} 项，共 {progress.total} 项
          </p>
        </div>
        <Image
          alt="小马宝宝助手提醒准备进度"
          className="h-16 w-16 shrink-0 object-contain"
          height={1254}
          src="/illustrations/dadkit-horse-girl.png"
          width={1254}
        />
      </div>
    </section>
  );
}

const homeTools = [
  {
    href: "/contractions",
    icon: CalendarClock,
    subtitle: "宫缩频率随手记",
    title: "宫缩记录",
    tone: "coral" as const,
  },
  {
    href: "/birth-plan",
    icon: ClipboardList,
    subtitle: "给医院和家人看",
    title: "分娩偏好卡",
    tone: "blue" as const,
  },
  {
    href: "/postpartum",
    icon: CheckCircle2,
    subtitle: "出生后别漏项",
    title: "产后办理",
    tone: "mint" as const,
  },
];

function HomeToolsPanel() {
  return (
    <section className="pony-soft-card p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black tracking-normal">小工具</h2>
        <Link
          className="inline-flex items-center gap-1 text-xs font-bold text-primary"
          href="/settings#more-tools"
        >
          全部
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {homeTools.map((tool) => (
          <HomeToolLink key={tool.href} tool={tool} />
        ))}
      </div>
    </section>
  );
}

function HomeToolLink({
  tool,
}: {
  tool: {
    href: string;
    icon: LucideIcon;
    subtitle: string;
    title: string;
    tone: "blue" | "coral" | "mint";
  };
}) {
  const Icon = tool.icon;
  const toneClass =
    tool.tone === "coral"
      ? "bg-secondary text-primary"
      : tool.tone === "blue"
        ? "bg-lavender text-lavender-foreground"
        : "bg-mint text-primary";

  return (
    <Link
      className="grid min-h-[5.7rem] content-start gap-1 rounded-lg border border-white/80 bg-background/60 px-2.5 py-3 text-center shadow-sm transition-colors active:bg-secondary"
      href={tool.href}
    >
      <span
        className={`mx-auto flex size-9 items-center justify-center rounded-full ${toneClass}`}
      >
        <Icon className="size-4" />
      </span>
      <span className="mt-1 text-xs font-black leading-4">{tool.title}</span>
      <span className="text-[0.68rem] font-semibold leading-4 text-muted-foreground">
        {tool.subtitle}
      </span>
    </Link>
  );
}

function formatHomeDueDate(dueDate?: string) {
  if (!dueDate) {
    return "待填写";
  }

  const [year, month, day] = dueDate.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);

  if (Number.isNaN(date.getTime())) {
    return dueDate;
  }

  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][
    date.getDay()
  ];

  return `${dueDate}（${weekday}）`;
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
