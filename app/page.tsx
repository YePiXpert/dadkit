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
  buildArchiveCards,
  getCountdownLabel,
  getPregnancyProgress,
} from "@/lib/presentation/home-dashboard";
import { buildHomeSummary, type HomeSummary } from "@/lib/presentation/home-summary";
import { getHospitalForProfile } from "@/lib/rules";
import { useDadKitStore } from "@/lib/store";
import { DELIVERY_MODE_LABELS, type UserProfile } from "@/lib/types";
import {
  TIMELINE_STAGE_TITLES,
  generateTodayTasks,
  getCurrentTimelineStageId,
  getDaysUntilDue,
  type TimelineTask,
} from "@/lib/timeline";

function dueAdvice(daysLeft: number) {
  if (daysLeft > 35) {
    return "先问清楚医院规则，确认哪些物品需要自己带。";
  }

  if (daysLeft > 21) {
    return "开始处理购买、清洗和核心打包。";
  }

  if (daysLeft > 7) {
    return "把证件包、妈妈包、宝宝包和爸爸背包收口。";
  }

  return "重点确认入院动线和临出门要拿的物品。";
}

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
  const currentStageId = useMemo(
    () => (profile ? getCurrentTimelineStageId(profile) : undefined),
    [profile],
  );
  const hospital = useMemo(
    () => (profile ? getHospitalForProfile(profile) : undefined),
    [profile],
  );
  const todayTasks = useMemo(
    () =>
      profile
        ? generateTodayTasks(profile, checklist, timelineTaskStatuses).slice(0, 3)
        : [],
    [checklist, profile, timelineTaskStatuses],
  );
  const currentStageTitle = currentStageId
    ? TIMELINE_STAGE_TITLES[currentStageId]
    : "未生成时间线";
  const archiveCards = useMemo(
    () =>
      buildArchiveCards({
        currentStageTitle: profile?.dueDate ? currentStageTitle : "待填写预产期",
        deliveryModeLabel: profile
          ? DELIVERY_MODE_LABELS[profile.deliveryMode]
          : "待填写",
        dueDate: profile?.dueDate,
        hospitalName: hospital?.name,
        summary,
      }),
    [currentStageTitle, hospital?.name, profile, summary],
  );
  const readyProgress = useMemo(() => overallProgress(summary), [summary]);

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-3">
        <HomeHeroCard
          countdownLabel={getCountdownLabel(daysLeft)}
          daysLeft={daysLeft}
          pregnancyProgress={pregnancyProgress}
          profile={profile}
        />
        <TodayActionsPanel
          profileReady={Boolean(profile?.dueDate)}
          tasks={todayTasks}
        />
        <OverallProgressPanel progress={readyProgress} />
        <TrustPillStrip />
        <ProfileArchiveList archiveCards={archiveCards} />
      </section>

      <p className="mobile-shell text-center text-xs leading-5 text-muted-foreground">
        非医疗建议，请以医院通知和产检确认结果为准。
      </p>
    </div>
  );
}

function HomeHeroCard({
  countdownLabel,
  daysLeft,
  pregnancyProgress,
  profile,
}: {
  countdownLabel: string;
  daysLeft?: number;
  pregnancyProgress: ReturnType<typeof getPregnancyProgress>;
  profile?: UserProfile;
}) {
  const countdownNumber = countdownLabel.match(/\d+/)?.[0];

  return (
    <section className="relative min-h-[11.25rem] overflow-hidden rounded-lg bg-primary p-4 text-primary-foreground shadow-soft">
      <span className="pointer-events-none absolute right-7 top-5 text-xl text-peach">
        ❤
      </span>
      <span className="pointer-events-none absolute right-28 top-11 text-sm text-amber">
        ✦
      </span>
      <span className="pointer-events-none absolute right-36 bottom-8 text-base text-blush">
        ❤
      </span>

      <div className="relative z-10 max-w-[52%]">
        <p className="text-xs font-bold text-primary-foreground/80">
          距离预产期还剩
        </p>
        <h1 className="mt-2 flex items-end gap-1 text-4xl font-black leading-none tracking-normal">
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
        <p className="mt-2 text-[11px] leading-5 text-primary-foreground/75">
          {typeof daysLeft === "number"
            ? dueAdvice(daysLeft)
            : "填写后自动生成准备时间线"}
        </p>
      </div>

      <div className="pointer-events-none absolute -bottom-2 -right-4 h-full w-[64%]">
        <Image
          alt="准爸爸和孕妈妈一起整理待产包"
          className="object-contain object-bottom"
          fill
          priority
          sizes="260px"
          src="/illustrations/dadkit-family-transparent.png"
        />
      </div>
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
      <div className="grid gap-2 rounded-lg border border-white/90 bg-card/95 p-2 shadow-soft">
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
      className="flex min-h-[3.6rem] items-center gap-3 rounded-lg bg-background/80 px-3 py-2.5 transition-transform active:scale-[0.99]"
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
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-normal">整体准备进度</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            已完成 {progress.completed} 项 / 全部 {progress.total} 项
          </p>
        </div>
        <span className="text-sm font-black text-primary">{progress.percent}%</span>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_4.25rem] items-end gap-3">
        <Progress className="h-2.5" value={progress.percent} />
        <Image
          alt="小熊助手提醒准备进度"
          className="ml-auto object-contain"
          height={68}
          src="/illustrations/dadkit-bear-transparent.png"
          width={68}
        />
      </div>
    </section>
  );
}

function TrustPillStrip() {
  const items = [
    {
      icon: CheckCircle2,
      text: "贴心可靠",
      tone: "bg-coral-soft text-coral-foreground",
    },
    {
      icon: Hospital,
      text: "有序不慌",
      tone: "bg-mint text-primary",
    },
    {
      icon: ClipboardList,
      text: "一起协作",
      tone: "bg-amber-soft text-amber-foreground",
    },
  ];

  return (
    <section className="grid w-full grid-cols-3 gap-1.5 overflow-hidden">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            className="min-w-0 rounded-lg border border-white/90 bg-card/90 p-1.5 text-center shadow-sm"
            key={item.text}
          >
            <span
              className={`mx-auto flex size-8 items-center justify-center rounded-full ${item.tone}`}
            >
              <Icon className="size-4" />
            </span>
            <p className="mt-1 truncate text-[11px] font-bold text-primary">
              {item.text}
            </p>
          </div>
        );
      })}
    </section>
  );
}

function ProfileArchiveList({
  archiveCards,
}: {
  archiveCards: ReturnType<typeof buildArchiveCards>;
}) {
  return (
    <details className="rounded-lg border border-white/90 bg-card/85 p-3 shadow-sm">
      <summary className="cursor-pointer text-sm font-bold text-primary">
        孕期档案
      </summary>
      <div className="mt-3 grid gap-2">
        {archiveCards.map((card) => (
          <div className="flex items-center gap-3 rounded-lg bg-background/80 p-3" key={card.label}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-mint text-primary">
              <CheckCircle2 className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-muted-foreground">
                {card.label}
              </span>
              <span className="mt-0.5 block truncate text-sm font-bold">
                {card.value}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {card.caption}
              </span>
            </span>
          </div>
        ))}
      </div>
    </details>
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
