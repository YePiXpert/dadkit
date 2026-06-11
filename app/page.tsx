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

import { ActionCard } from "@/components/ActionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildHomeSummary } from "@/lib/presentation/home-summary";
import { useDadKitStore } from "@/lib/store";
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
  const summary = buildHomeSummary(checklist, hospitalAnswers);
  const daysLeft = profile ? getDaysUntilDue(profile) : undefined;
  const currentStageId = profile ? getCurrentTimelineStageId(profile) : undefined;
  const todayTasks = profile
    ? generateTodayTasks(profile, checklist, timelineTaskStatuses).slice(0, 3)
    : [];
  const currentStageTitle = currentStageId
    ? TIMELINE_STAGE_TITLES[currentStageId]
    : "未生成时间线";

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-4 lg:max-w-none lg:grid-cols-[1fr_0.95fr] lg:items-start">
        <div className="rounded-[1.35rem] bg-card p-5 shadow-soft">
          <div>
            <p className="text-sm font-medium text-primary">准爸爸任务控制台</p>
            <h1 className="mt-1 text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
              DadKit
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              从医院确认、购买清洗、核心打包到临出门检查，按预产期一步步收口。
            </p>
          </div>

          <div className="mt-5 rounded-[1.35rem] bg-primary p-5 text-primary-foreground shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary-foreground/80">
                  距离预产期
                </p>
                <p className="mt-2 text-4xl font-semibold tracking-normal">
                  {typeof daysLeft === "number"
                    ? daysLeft >= 0
                      ? `还有 ${daysLeft} 天`
                      : "已经到预产期"
                    : "未设置"}
                </p>
                <p className="mt-2 text-sm leading-6 text-primary-foreground/80">
                  {typeof daysLeft === "number"
                    ? dueAdvice(daysLeft)
                    : "填写预产期后，DadKit 会自动生成准备时间线。"}
                </p>
                <p className="mt-3 inline-flex rounded-full bg-card/15 px-3 py-1 text-sm font-medium">
                  当前阶段：{profile?.dueDate ? currentStageTitle : "待填写预产期"}
                </p>
              </div>
              <Link
                className="hidden rounded-2xl bg-card px-5 py-8 text-sm font-semibold text-primary sm:block"
                href={profile ? "/timeline" : "/setup"}
              >
                时间线
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <PrimaryHomeLink
              href={profile ? "/checklist" : "/setup"}
              label={profile ? "清单" : "创建清单"}
            />
            <PrimaryHomeLink href="/hospital" label="医院确认" />
            <PrimaryHomeLink href="/timeline" label="时间线" />
            <PrimaryHomeLink href="/go" label="临出门" />
            <PrimaryHomeLink href="/settings" label="备份/设置" />
          </div>
        </div>

        <TodayTasksCard
          onDone={(taskId) => updateTimelineTaskStatus(taskId, "done")}
          profileReady={Boolean(profile?.dueDate)}
          tasks={todayTasks}
        />
      </section>

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-3">
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

function PrimaryHomeLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="flex min-h-12 items-center justify-between rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft"
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
            <p className="text-sm text-muted-foreground">今天该做</p>
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
