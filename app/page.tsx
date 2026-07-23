"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Hospital,
  Share2,
  type LucideIcon,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
import {
  getCountdownLabel,
  getPregnancyProgress,
} from "@/lib/presentation/home-dashboard";
import { formatBabyZodiacLine } from "@/lib/baby-profile";
import {
  buildPreparationSummary,
  type PreparationModule,
  type PreparationModuleId,
  type PreparationSummary,
} from "@/lib/presentation/preparation-summary";
import { useDadKitStore } from "@/lib/store";
import type { UserProfile } from "@/lib/types";
import {
  generateTodayTasks,
  getDaysUntilDue,
  type TimelineTask,
} from "@/lib/timeline";

export default function HomePage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const birthPlan = useDadKitStore((state) => state.birthPlan);
  const hospitalAnswers = useDadKitStore((state) => state.hospitalAnswers);
  const contractions = useDadKitStore((state) => state.contractions);
  const postpartumTasks = useDadKitStore((state) => state.postpartumTasks);
  const timelineTaskStatuses = useDadKitStore(
    (state) => state.timelineTaskStatuses,
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
        ? generateTodayTasks(
            profile,
            checklist,
            timelineTaskStatuses,
            hospitalAnswers,
          ).slice(0, 3)
        : [],
    [checklist, hospitalAnswers, profile, timelineTaskStatuses],
  );
  const hasAdmissionInfo = Boolean(
    birthPlan.hospitalPhone.trim() ||
      birthPlan.hospitalAddress.trim() ||
      birthPlan.hospitalRouteNotes.trim() ||
      birthPlan.nightEntranceNotes.trim() ||
      birthPlan.parkingNotes.trim(),
  );

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-3">
        <HomeHeroCard
          countdownLabel={getCountdownLabel(daysLeft)}
          pregnancyProgress={pregnancyProgress}
          profile={profile}
        />
        {preparationSummary ? (
          <HomePlanReadyPanel summary={preparationSummary} />
        ) : null}
        <TodayFocusPanel
          profileReady={Boolean(profile?.dueDate)}
          tasks={todayTasks}
        />
        {preparationSummary ? (
          <ReadinessMetricsPanel summary={preparationSummary} />
        ) : null}
        <HomeLaborModePanel hasAdmissionInfo={hasAdmissionInfo} />
        <HomeToolsPanel />
      </section>

      <p className="mobile-shell text-center text-xs leading-5 text-muted-foreground">
        非医疗建议，请以医院通知和产检确认结果为准。
      </p>
    </div>
  );
}

function HomePlanReadyPanel({ summary }: { summary: PreparationSummary }) {
  const shareLink = { href: "/share", label: "导出与协作" };

  return (
    <section className="card-surface p-3">
      <div className="mb-3 flex items-start gap-3">
        <span className="icon-tile">
          <CheckCircle2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">方案已生成</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            四件事按状态推进，今天先做最影响入院准备的事。
          </p>
        </div>
        <Link
          className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-primary"
          href={shareLink.href}
        >
          {shareLink.label}
        </Link>
      </div>
      <div className="mb-3 rounded-lg border border-border bg-muted px-3 py-2">
        <p className="text-xs font-semibold text-primary">
          {summary.readiness.label} {summary.readiness.percent}%
        </p>
        <p className="mt-0.5 break-words text-xs leading-4 text-muted-foreground">
          下一步：{summary.nextAction.label}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {summary.modules.map((module) => (
          <HomePlanLink key={module.id} module={module} />
        ))}
      </div>
    </section>
  );
}

function HomePlanLink({
  module,
}: {
  module: PreparationModule;
}) {
  const Icon = planModuleIcon(module.id);

  return (
    <Link
      className="grid min-h-[5.4rem] content-start gap-1.5 rounded-lg border border-border bg-background p-2.5 transition-colors active:bg-secondary"
      href={module.href}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="size-4" />
        </span>
        <span className="text-xs font-semibold text-primary">
          {module.percent}%
        </span>
      </span>
      <span className="block break-words text-sm font-semibold leading-5">
        {module.title}
      </span>
      <span className="block break-words text-xs leading-4 text-muted-foreground">
        {module.sourceLabel}
      </span>
    </Link>
  );
}

function planModuleIcon(id: PreparationModuleId): LucideIcon {
  if (id === "hospital") {
    return Hospital;
  }

  if (id === "go") {
    return Share2;
  }

  if (id === "postpartum") {
    return CalendarClock;
  }

  return ClipboardList;
}

function HomeLaborModePanel({
  hasAdmissionInfo,
}: {
  hasAdmissionInfo: boolean;
}) {
  return (
    <Link
      className="card-surface flex min-h-[5.25rem] items-center gap-3 p-3 transition-colors active:bg-secondary"
      href="/go"
    >
      <span className="icon-tile size-11">
        <Hospital className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-primary">临出门检查</span>
        <span className="mt-1 block break-words text-sm font-semibold leading-5">
          电话 / 路线 / 必带物品确认
        </span>
        <span className="mt-1 block break-words text-xs leading-4 text-muted-foreground">
          {hasAdmissionInfo ? "联系信息已填写" : "补充电话与路线"}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-primary" />
    </Link>
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
  const babyLine = formatBabyZodiacLine(profile);

  return (
    <section className="card-surface p-4">
      <p className="section-kicker">待产准备小本本</p>
      <p className="mt-1 text-sm font-semibold text-primary">预产期倒计时</p>
      <h1 className="mt-2 flex items-end gap-1 text-5xl font-semibold leading-none tracking-normal">
        {countdownNumber ? (
          <>
            <span>{countdownNumber}</span>
            <span className="mb-1 text-lg font-semibold">天</span>
          </>
        ) : (
          <span className="text-2xl">{countdownLabel}</span>
        )}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{dueDateLabel}</p>
      <p className="mt-1 text-xs text-muted-foreground">{babyLine}</p>
      <div className="mt-4 grid gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{pregnancyProgress.label}</span>
          <span>{pregnancyProgress.percent}%</span>
        </div>
        <Progress value={pregnancyProgress.percent} />
      </div>
    </section>
  );
}

function TodayFocusPanel({
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
      subtitle: "当前优先",
      title: "填写预产期和生产信息",
      tone: "coral" as const,
    },
    {
      href: "/setup",
      icon: Hospital,
      subtitle: "当前优先",
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
        subtitle: "当前优先",
        title: task.title,
        tone: (["coral", "blue", "mint"] as const)[index % 3],
      }))
    : fallbackActions;

  const [primaryAction, ...secondaryActions] = actions;

  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">今日重点</h2>
        <Link
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
          href={profileReady ? "/timeline" : "/setup"}
        >
          准备节奏
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {primaryAction ? <PrimaryActionCard action={primaryAction} /> : null}
      {secondaryActions.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {secondaryActions.map((action) => (
            <HomeActionRow action={action} key={`${action.href}-${action.title}`} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PrimaryActionCard({
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

  return (
    <Link
      className="card-surface flex min-h-[6.4rem] items-center gap-3 p-4 transition-colors active:bg-secondary"
      href={action.href}
    >
      <span className="icon-tile size-11">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-primary">
          {action.subtitle}
        </span>
        <span className="mt-1 block break-words text-sm font-semibold leading-6">
          {action.title}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-primary" />
    </Link>
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

  return (
    <Link
      className="flex min-h-[3.85rem] items-center gap-3 border-b border-border px-3 py-2.5 transition-colors last:border-b-0 active:bg-secondary"
      href={action.href}
    >
      <span className="icon-tile">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-semibold leading-5">
          {action.title}
        </span>
        <span className="mt-0.5 block text-xs text-primary">
          {action.subtitle}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function ReadinessMetricsPanel({ summary }: { summary: PreparationSummary }) {
  return (
    <section className="card-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">入院准备</h2>
        <span className="text-xs text-muted-foreground">
          {summary.readiness.percent}%
        </span>
      </div>
      <div className="grid gap-2">
        {summary.modules.map((metric) => (
          <ReadinessMetricRow key={metric.id} metric={metric} />
        ))}
        <Link
          className="rounded-lg border border-border bg-background p-3 text-xs leading-5 text-muted-foreground transition-colors active:bg-secondary"
          href="/contractions"
        >
          <span className="block font-semibold text-primary">
            {summary.contractionStatus.label}
          </span>
          <span className="mt-0.5 block break-words">
            {summary.contractionStatus.detail} · 不计入总准备进度
          </span>
        </Link>
      </div>
    </section>
  );
}

function ReadinessMetricRow({ metric }: { metric: PreparationModule }) {
  return (
    <Link
      className="grid gap-2 rounded-lg border border-border bg-background p-3 transition-colors active:bg-secondary"
      href={metric.href}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block break-words text-sm font-semibold leading-5">
            {metric.title}
          </span>
          <span className="mt-0.5 block break-words text-xs leading-4 text-muted-foreground">
            {metric.caption}
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-primary">
          {metric.completed}/{metric.total}
        </span>
      </span>
      <Progress value={metric.percent} />
    </Link>
  );
}

const homeTools = [
  {
    href: "/contractions",
    icon: CalendarClock,
    subtitle: "记录频率和持续时间",
    title: "宫缩记录",
    tone: "coral" as const,
  },
  {
    href: "/birth-plan",
    icon: ClipboardList,
    subtitle: "偏好与联系人",
    title: "入院沟通",
    tone: "blue" as const,
  },
  {
    href: "/go",
    icon: CheckCircle2,
    subtitle: "临出门前核对",
    title: "临出门检查",
    tone: "mint" as const,
  },
];

function HomeToolsPanel() {
  return (
    <section className="card-surface p-3">
      <h2 className="mb-2 text-sm font-semibold">快捷操作</h2>
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

  return (
    <Link
      className="grid min-h-[5.7rem] content-start gap-1 rounded-lg border border-border bg-background px-2.5 py-3 text-center transition-colors active:bg-secondary"
      href={tool.href}
    >
      <span className="icon-tile size-9 mx-auto">
        <Icon className="size-4" />
      </span>
      <span className="mt-1 text-xs font-semibold leading-4">{tool.title}</span>
      <span className="text-xs leading-4 text-muted-foreground">
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
