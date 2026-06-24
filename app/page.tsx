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
  Share2,
  type LucideIcon,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
import {
  getCountdownLabel,
  getPregnancyProgress,
} from "@/lib/presentation/home-dashboard";
import {
  formatBabyZodiacLine,
  getBabyMascot,
} from "@/lib/baby-profile";
import {
  buildHomeReadinessMetrics,
  buildHomeSummary,
  type HomeReadinessMetric,
} from "@/lib/presentation/home-summary";
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
        ? generateTodayTasks(
            profile,
            checklist,
            timelineTaskStatuses,
            hospitalAnswers,
          ).slice(0, 3)
        : [],
    [checklist, hospitalAnswers, profile, timelineTaskStatuses],
  );
  const readinessMetrics = useMemo(
    () => buildHomeReadinessMetrics(summary),
    [summary],
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
        {profile?.dueDate ? <HomePlanReadyPanel /> : null}
        <TodayFocusPanel
          profileReady={Boolean(profile?.dueDate)}
          tasks={todayTasks}
        />
        <ReadinessMetricsPanel metrics={readinessMetrics} />
        <HomeLaborModePanel hasAdmissionInfo={hasAdmissionInfo} />
        <HomeToolsPanel />
      </section>

      <p className="mobile-shell text-center text-xs leading-5 text-muted-foreground">
        非医疗建议，请以医院通知和产检确认结果为准。
      </p>
    </div>
  );
}

function HomePlanReadyPanel() {
  const links = [
    {
      href: "/checklist",
      icon: ClipboardList,
      label: "核心清单",
      subtitle: "先核对必须带的物品",
    },
    {
      href: "/hospital",
      icon: Hospital,
      label: "医院确认",
      subtitle: "把规则和待问事项补齐",
    },
    {
      href: "/share",
      icon: Share2,
      label: "分享备份",
      subtitle: "发给陪产人或导出",
    },
  ];

  return (
    <section className="pony-soft-card p-3">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
          <CheckCircle2 className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-normal">方案已生成</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
            今天先做最影响入院准备的事，进度可以慢慢补。
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {links.map((link) => (
          <HomePlanLink key={link.href} link={link} />
        ))}
      </div>
    </section>
  );
}

function HomePlanLink({
  link,
}: {
  link: {
    href: string;
    icon: LucideIcon;
    label: string;
    subtitle: string;
  };
}) {
  const Icon = link.icon;

  return (
    <Link
      className="grid min-h-[3.7rem] grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-white/80 bg-background/60 px-3 py-2 shadow-sm transition-colors active:bg-secondary"
      href={link.href}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black leading-5">{link.label}</span>
        <span className="mt-0.5 block break-words text-xs font-semibold leading-4 text-muted-foreground">
          {link.subtitle}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-primary" />
    </Link>
  );
}

function HomeLaborModePanel({
  hasAdmissionInfo,
}: {
  hasAdmissionInfo: boolean;
}) {
  return (
    <Link
      className="pony-soft-card flex min-h-[5.25rem] items-center gap-3 p-3 transition-colors active:bg-secondary"
      href="/go"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mint text-primary">
        <Hospital className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-primary">临出门检查</span>
        <span className="mt-1 block break-words text-base font-black leading-5">
          电话 / 路线 / 必带物品确认
        </span>
        <span className="mt-1 block break-words text-xs font-semibold leading-4 text-muted-foreground">
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
  const mascot = getBabyMascot(profile);

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
        <p className="text-sm font-black text-primary-foreground/90">
          预产期倒计时
        </p>
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
          {babyLine}
        </p>
        <p className="mt-1 text-xs font-bold text-primary-foreground/80">
          {pregnancyProgress.label}
        </p>
      </div>

      <Image
        alt={mascot.alt}
        className="pointer-events-none absolute -right-9 bottom-[-1.7rem] h-[12rem] w-[12rem] object-contain drop-shadow-sm"
        height={1254}
        priority
        sizes="220px"
        src={mascot.src}
        width={1254}
      />
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
        <h2 className="text-base font-black tracking-normal">今日重点</h2>
        <Link
          className="inline-flex items-center gap-1 text-xs font-bold text-primary"
          href={profileReady ? "/timeline" : "/setup"}
        >
          准备节奏
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {primaryAction ? <PrimaryActionCard action={primaryAction} /> : null}
      {secondaryActions.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-white/90 bg-card/95 shadow-soft">
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
      className="pony-soft-card flex min-h-[6.4rem] items-center gap-3 p-4 transition-colors active:bg-secondary"
      href={action.href}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-black text-primary">
          {action.subtitle}
        </span>
        <span className="mt-1 block break-words text-lg font-black leading-6">
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
        <span className="block break-words text-sm font-bold leading-5">
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

function ReadinessMetricsPanel({ metrics }: { metrics: HomeReadinessMetric[] }) {
  return (
    <section className="pony-due-card p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black tracking-normal">入院准备</h2>
        <span className="text-xs font-bold text-muted-foreground">3 项</span>
      </div>
      <div className="grid gap-2">
        {metrics.map((metric) => (
          <ReadinessMetricRow key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
}

function ReadinessMetricRow({ metric }: { metric: HomeReadinessMetric }) {
  return (
    <Link
      className="grid gap-2 rounded-lg border border-white/80 bg-background/65 p-3 shadow-sm transition-colors active:bg-secondary"
      href={metric.href}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block break-words text-sm font-black leading-5">
            {metric.label}
          </span>
          <span className="mt-0.5 block break-words text-xs font-semibold leading-4 text-muted-foreground">
            {metric.caption}
          </span>
        </span>
        <span className="shrink-0 text-sm font-black text-primary">
          {metric.completed}/{metric.total}
        </span>
      </span>
      <Progress className="h-2 bg-primary/12" value={metric.percent} />
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
    <section className="pony-soft-card p-3">
      <h2 className="mb-2 text-sm font-black tracking-normal">快捷操作</h2>
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
