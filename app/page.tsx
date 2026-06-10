"use client";

import Link from "next/link";
import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Hospital,
  Share2,
  type LucideIcon,
} from "lucide-react";

import { ActionCard } from "@/components/ActionCard";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildHomeSummary } from "@/lib/presentation/home-summary";
import { useDadKitStore } from "@/lib/store";

function dueAdvice(daysLeft: number) {
  if (daysLeft > 35) {
    return "可以先确认医院规则，逐步准备核心物品。";
  }

  if (daysLeft > 21) {
    return "建议开始打包核心物品。";
  }

  return "建议把证件包、妈妈包、宝宝包和临出门物品放到固定位置。";
}

export default function HomePage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const hospitalAnswers = useDadKitStore((state) => state.hospitalAnswers);
  const summary = buildHomeSummary(checklist, hospitalAnswers);
  const daysLeft = profile?.dueDate
    ? differenceInCalendarDays(parseISO(profile.dueDate), new Date())
    : undefined;

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-4 lg:max-w-none lg:grid-cols-[1fr_0.95fr] lg:items-start">
        <div className="rounded-[1.35rem] bg-card p-5 shadow-soft">
          <div className="mb-3">
            <div>
              <p className="text-sm font-medium text-primary">准爸爸任务控制台</p>
              <h1 className="mt-1 text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
                DadKit
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                先准备少数关键物品，再确认医院差异；不按电商大礼包打包。
              </p>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
            <span className="rounded-full bg-secondary/70 px-3 py-1 text-primary">
              本地优先
            </span>
            <span className="rounded-full bg-secondary/70 px-3 py-1 text-primary">
              医院待确认
            </span>
            <span className="rounded-full bg-secondary/70 px-3 py-1 text-primary">
              爸爸任务流
            </span>
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
                    : "先填写基础信息，之后都能修改。"}
                </p>
              </div>
              <Link
                className="hidden rounded-2xl bg-card px-5 py-8 text-sm font-semibold text-primary sm:block"
                href="/checklist"
              >
                核心打包
              </Link>
            </div>
          </div>

          <Link
            className="mt-4 flex w-full items-center justify-between rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-soft"
            href={profile ? "/checklist" : "/setup"}
          >
            <span>{profile ? "打开我的清单" : "开始创建清单"}</span>
            <ArrowRight className="size-5" />
          </Link>

          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <SecondaryHomeLink href="/hospital" label="医院确认" />
            <SecondaryHomeLink href="/share" label="爸爸执行版" />
            <SecondaryHomeLink
              description="不影响当前数据"
              href="/checklist"
              label="查看示例"
            />
          </div>
        </div>

        <div className="grid gap-3">
          <PackingProgressCard
            icon={ClipboardList}
            label="核心打包"
            percent={summary.corePacking.percent}
            tone="primary"
          />
          <div className="grid grid-cols-2 gap-3">
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
          </div>
        </div>
      </section>

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-3">
        <ActionCard
          description="陪产、入口、押金、提供物品，留到产检时问清楚。"
          href="/hospital"
          icon={Hospital}
          title="到下次产检问清楚"
          tone="amber"
        />
        <ActionCard
          description="只看核心物品，按证件包、妈妈包、宝宝包处理。"
          href="/checklist"
          icon={ClipboardList}
          title="打开精简清单"
        />
        <ActionCard
          description="生成要拿、要问、要确认的执行清单。"
          href="/share"
          icon={Share2}
          title="生成爸爸执行版"
          tone="coral"
        />
      </section>

      <p className="mobile-shell text-xs leading-5 text-muted-foreground lg:max-w-none">
        非医疗建议，请以医院通知和产检确认结果为准。
      </p>
    </div>
  );
}

function SecondaryHomeLink({
  description,
  href,
  label,
}: {
  description?: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      className="flex min-h-12 flex-col items-center justify-center rounded-lg border border-border bg-background px-2 text-center font-medium text-muted-foreground"
      href={href}
    >
      <span>{label}</span>
      {description ? (
        <span className="text-[0.68rem] font-normal leading-4">{description}</span>
      ) : null}
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
