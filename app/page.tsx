"use client";

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

import { CuteIllustration } from "@/components/CuteIllustration";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  buildArchiveCards,
  getCountdownLabel,
  getPregnancyProgress,
} from "@/lib/presentation/home-dashboard";
import { buildHomeSummary } from "@/lib/presentation/home-summary";
import { getHospitalForProfile } from "@/lib/rules";
import { useDadKitStore } from "@/lib/store";
import {
  DELIVERY_MODE_LABELS,
  type UserProfile,
} from "@/lib/types";
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

export default function HomePage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const hospitalAnswers = useDadKitStore((state) => state.hospitalAnswers);
  const timelineTaskStatuses = useDadKitStore(
    (state) => state.timelineTaskStatuses,
  );
  const updateTimelineTaskStatus = useDadKitStore(
    (state) => state.updateTimelineTaskStatus,
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

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-4 lg:max-w-none lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <PregnancyArchivePanel
          archiveCards={archiveCards}
          countdownLabel={getCountdownLabel(daysLeft)}
          daysLeft={daysLeft}
          pregnancyProgress={pregnancyProgress}
          profile={profile}
          stageTitle={profile?.dueDate ? currentStageTitle : "待填写预产期"}
        />
        <TodayTasksCard
          onDone={(taskId) => updateTimelineTaskStatus(taskId, "done")}
          profileReady={Boolean(profile?.dueDate)}
          tasks={todayTasks}
        />
      </section>

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-3">
        <SectionHeader
          className="lg:col-span-3"
          eyebrow="关键进度"
          title="今天最该盯住的三件事"
        />
        <PackingProgressCard
          icon={ClipboardList}
          label="核心打包"
          percent={summary.corePacking.percent}
          tone="primary"
        />
        <PackingProgressCard
          icon={Hospital}
          label="医院待问"
          percent={summary.hospitalQuestions.percent}
          tone="amber"
        />
        <PackingProgressCard
          icon={CalendarClock}
          label="临出门"
          percent={summary.lastMinute.percent}
          tone="coral"
        />
      </section>

      <section className="mobile-shell grid gap-3 lg:max-w-none">
        <SectionHeader
          eyebrow="工具宫格"
          title="记录、沟通和产后办理"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ToolGridLink
            caption="记录节奏"
            href="/contractions"
            icon={CalendarClock}
            title="宫缩记录"
            tone="coral"
          />
          <ToolGridLink
            caption="沟通偏好"
            href="/birth-plan"
            icon={ClipboardList}
            title="分娩偏好卡"
            tone="mint"
          />
          <ToolGridLink
            caption="手续材料"
            href="/postpartum"
            icon={CheckCircle2}
            title="产后办理"
            tone="amber"
          />
        </div>
      </section>

      <p className="mobile-shell text-xs leading-5 text-muted-foreground lg:max-w-none">
        非医疗建议，请以医院通知和产检确认结果为准。
      </p>
    </div>
  );
}

function PregnancyArchivePanel({
  archiveCards,
  countdownLabel,
  daysLeft,
  pregnancyProgress,
  profile,
  stageTitle,
}: {
  archiveCards: ReturnType<typeof buildArchiveCards>;
  countdownLabel: string;
  daysLeft?: number;
  pregnancyProgress: ReturnType<typeof getPregnancyProgress>;
  profile?: UserProfile;
  stageTitle: string;
}) {
  return (
    <Card className="overflow-hidden bg-card/95">
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <section className="app-hero-card grid min-h-56 gap-4 overflow-hidden p-4 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-end">
          <div className="relative z-10">
            <p className="text-sm font-semibold text-primary-foreground/75">
              DadKit 今日行动
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-tight tracking-normal">
              {countdownLabel}
            </h1>
            <p className="mt-2 text-sm font-semibold text-primary-foreground/80">
              {profile?.dueDate ? `预产期：${profile.dueDate}` : "预产期待填写"}
            </p>
            <p className="mt-1 text-sm font-semibold text-primary-foreground/80">
              {pregnancyProgress.label}
            </p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-card/25">
              <div
                className="h-full rounded-full bg-peach transition-all"
                style={{ width: `${pregnancyProgress.percent}%` }}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-primary-foreground/80">
              {typeof daysLeft === "number"
                ? dueAdvice(daysLeft)
                : "填写预产期后，DadKit 会自动生成准备时间线。"}
            </p>
            <p className="mt-1 text-xs font-semibold text-primary-foreground/65">
              当前阶段：{stageTitle}
            </p>
          </div>
          <CuteIllustration
            className="mx-auto min-h-32 w-full max-w-44 border-white/60 bg-card/15 sm:mx-0"
            imageClassName="object-contain p-1"
            priority
            sizes="(min-width: 1280px) 180px, 45vw"
            variant="family"
          />
        </section>

        <p className="section-kicker">孕期档案</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {archiveCards.map((card) => (
            <div
              className="app-list-row items-start bg-background/80"
              key={card.label}
            >
              <span className="app-icon-tile size-9 rounded-md">
                <CalendarClock className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-muted-foreground">
                  {card.label}
                </span>
                <span className="mt-1 block truncate text-base font-bold">
                  {card.value}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {card.caption}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <PrimaryHomeLink
            href={profile ? "/checklist" : "/setup"}
            label={profile ? "继续今日任务" : "创建清单"}
          />
          <PrimaryHomeLink href="/go" label="临出门检查" variant="outline" />
        </div>
      </CardContent>
    </Card>
  );
}

function PrimaryHomeLink({
  href,
  label,
  variant = "default",
}: {
  href: string;
  label: string;
  variant?: "default" | "outline";
}) {
  return (
    <Link
      className={
        variant === "default"
          ? "flex min-h-12 items-center justify-between rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform active:scale-[0.98]"
          : "flex min-h-12 items-center justify-between rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold text-primary transition-transform active:scale-[0.98]"
      }
      href={href}
    >
      <span>{label}</span>
      <ArrowRight className="size-4" />
    </Link>
  );
}

function TodayTasksCard({
  onDone,
  profileReady,
  tasks,
}: {
  onDone: (taskId: string) => void;
  profileReady: boolean;
  tasks: TimelineTask[];
}) {
  return (
    <Card className="bg-card/95">
      <CardContent className="grid gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-kicker">今日行动 3 项</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">
              {profileReady ? "今天该做" : "等待预产期"}
            </h2>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={profileReady ? "/timeline" : "/setup"}>
              {profileReady ? "全部" : "填写"}
            </Link>
          </Button>
        </div>

        {!profileReady ? (
          <p className="rounded-lg bg-secondary/80 px-3 py-3 text-sm leading-6 text-primary">
            填写预产期后，DadKit 会自动生成准备时间线。
          </p>
        ) : tasks.length === 0 ? (
          <p className="rounded-lg bg-secondary/80 px-3 py-3 text-sm leading-6 text-primary">
            当前阶段没有待处理任务。
          </p>
        ) : (
          <div className="grid gap-2">
            {tasks.map((task) => (
              <article
                className="app-list-row items-start bg-background/80"
                key={task.id}
              >
                <span className="app-icon-tile size-9 rounded-md">
                  <ClipboardList className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-5">
                    {task.title}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-coral-foreground">
                    建议今天完成
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {TIMELINE_STAGE_TITLES[task.stageId]}
                  </span>
                </span>
                <Button
                  className="size-9 shrink-0 rounded-full px-0"
                  onClick={() => onDone(task.id)}
                  size="sm"
                  variant="outline"
                >
                  <CheckCircle2 className="size-4" />
                  <span className="sr-only">完成</span>
                </Button>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  className,
  eyebrow,
  title,
}: {
  className?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className={className}>
      <p className="cute-eyebrow">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-normal">{title}</h2>
    </div>
  );
}

function ToolGridLink({
  caption,
  href,
  icon: Icon,
  title,
  tone,
}: {
  caption: string;
  href: string;
  icon: LucideIcon;
  title: string;
  tone: "amber" | "coral" | "mint";
}) {
  const toneClass =
    tone === "coral"
      ? "bg-coral-soft text-coral-foreground"
      : tone === "amber"
        ? "bg-amber-soft text-amber-foreground"
        : "bg-mint text-primary";

  return (
    <Link
      className="app-list-card grid min-h-24 place-items-center gap-2 p-3 text-center transition-transform active:scale-[0.99]"
      href={href}
    >
      <span
        className={`flex size-11 items-center justify-center rounded-lg shadow-sm ${toneClass}`}
      >
        <Icon className="size-5" />
      </span>
      <span className="text-sm font-bold leading-5">{title}</span>
      <span className="text-xs font-semibold text-muted-foreground">{caption}</span>
    </Link>
  );
}

function PackingProgressCard({
  icon: Icon,
  label,
  percent,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  percent: number;
  tone: "primary" | "amber" | "coral";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "amber"
        ? "bg-amber-soft text-amber-foreground"
        : "bg-coral-soft text-coral-foreground";

  return (
    <Card
      className={
        tone === "primary"
          ? "bg-primary text-primary-foreground"
          : tone === "amber"
            ? "border-amber/35 bg-amber-soft/80"
            : "border-coral/30 bg-coral-soft/80"
      }
    >
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={
                tone === "primary"
                  ? "text-sm text-primary-foreground/80"
                  : "text-sm text-muted-foreground"
              }
            >
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-normal">{percent}%</p>
          </div>
          <span className={`rounded-lg p-2 ${toneClass}`}>
            <Icon className="size-5" />
          </span>
        </div>
        <div className="mt-2">
          <Progress value={percent} />
        </div>
      </CardContent>
    </Card>
  );
}
