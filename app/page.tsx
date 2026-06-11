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

import { ActionCard } from "@/components/ActionCard";
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

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-3">
        <SectionHeader
          className="lg:col-span-3"
          eyebrow="工具宫格"
          title="记录、沟通和产后办理"
        />
        <ActionCard
          description="记录开始、结束、持续和间隔，导出给医生或家人。"
          href="/contractions"
          icon={CalendarClock}
          title="宫缩记录"
          tone="amber"
        />
        <ActionCard
          description="整理紧急联系人、陪产人、过敏用药和沟通偏好。"
          href="/birth-plan"
          icon={ClipboardList}
          title="分娩偏好卡"
        />
        <ActionCard
          description="把出生证明、结算、保险和复查事项做成待确认清单。"
          href="/postpartum"
          icon={CheckCircle2}
          title="产后办理"
          tone="coral"
        />
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
    <Card className="overflow-hidden">
      <CardContent className="grid gap-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">孕期档案</p>
            <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
              DadKit 今日行动
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              从医院确认、购买清洗、核心打包到临出门检查，按预产期一步步收口。
            </p>
          </div>
          <span className="hidden rounded-md bg-accent px-3 py-1 text-sm font-medium text-accent-foreground sm:inline-flex">
            本地优先
          </span>
        </div>

        <div className="rounded-lg bg-primary p-4 text-primary-foreground">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-primary-foreground/80">距离预产期</p>
              <p className="mt-1 text-3xl font-semibold tracking-normal">
                {countdownLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-primary-foreground/80">
                {typeof daysLeft === "number"
                  ? dueAdvice(daysLeft)
                  : "填写预产期后，DadKit 会自动生成准备时间线。"}
              </p>
            </div>
            <div className="rounded-md bg-card/15 px-3 py-2 text-right">
              <p className="text-xs text-primary-foreground/75">孕期进度</p>
              <p className="mt-1 text-sm font-semibold">
                {pregnancyProgress.label}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={pregnancyProgress.percent} />
          </div>
          <p className="mt-2 text-xs text-primary-foreground/75">
            当前阶段：{stageTitle}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {archiveCards.map((card) => (
            <div
              className="rounded-lg border border-border bg-background p-3"
              key={card.label}
            >
              <p className="text-xs font-medium text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-1 truncate text-base font-semibold">{card.value}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {card.caption}
              </p>
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
          ? "flex min-h-12 items-center justify-between rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft"
          : "flex min-h-12 items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-sm font-semibold text-primary"
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
    <Card>
      <CardContent className="grid gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-primary">今日行动</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">
              {profileReady ? "今天该做" : "等待预产期"}
            </h2>
          </div>
          <Button asChild variant="outline">
            <Link href={profileReady ? "/timeline" : "/setup"}>
              {profileReady ? "全部" : "填写"}
            </Link>
          </Button>
        </div>

        {!profileReady ? (
          <p className="rounded-lg bg-secondary px-3 py-3 text-sm leading-6 text-primary">
            填写预产期后，DadKit 会自动生成准备时间线。
          </p>
        ) : tasks.length === 0 ? (
          <p className="rounded-lg bg-secondary px-3 py-3 text-sm leading-6 text-primary">
            当前阶段没有待处理任务。
          </p>
        ) : (
          <div className="grid gap-2">
            {tasks.map((task) => (
              <div
                className="grid gap-2 rounded-lg border border-border bg-background p-3"
                key={task.id}
              >
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {TIMELINE_STAGE_TITLES[task.stageId]}
                  </p>
                </div>
                <Button onClick={() => onDone(task.id)} size="sm" variant="outline">
                  <CheckCircle2 className="size-4" />
                  完成
                </Button>
              </div>
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
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-normal">{title}</h2>
    </div>
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
    <Card className={tone === "primary" ? "bg-primary text-primary-foreground" : ""}>
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
          <span className={`rounded-full p-2 ${toneClass}`}>
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
