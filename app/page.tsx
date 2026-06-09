"use client";

import Link from "next/link";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Eye,
  Hospital,
  Share2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { ActionCard } from "@/components/ActionCard";
import { DisclaimerBox } from "@/components/DisclaimerBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  calculateConfirmationCompletion,
  calculateLastMinuteCompletion,
  calculatePackingCompletion,
} from "@/lib/rules";
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
  const router = useRouter();
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const createProfile = useDadKitStore((state) => state.createProfile);
  const packing = calculatePackingCompletion(checklist);
  const confirmation = calculateConfirmationCompletion(checklist);
  const lastMinute = calculateLastMinuteCompletion(checklist);
  const daysLeft = profile?.dueDate
    ? differenceInCalendarDays(parseISO(profile.dueDate), new Date())
    : undefined;

  function openExample() {
    createProfile({
      dueDate: format(addDays(new Date(), 42), "yyyy-MM-dd"),
      hospitalMode: "preset",
      hospitalId: "cn-bj-yuquan-hospital",
      deliveryMode: "unknown",
      expectedStayDays: 3,
      breastfeeding: true,
      partnerPresent: true,
      coldWeather: false,
      hospitalProvidedItemIds: ["unknown"],
    });
    router.push("/checklist");
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-4 lg:max-w-none lg:grid-cols-[1fr_0.95fr] lg:items-start">
        <div className="rounded-[1.35rem] bg-card p-5 shadow-soft">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary">准爸爸任务控制台</p>
              <h1 className="mt-1 text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
                DadKit
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                先准备少数关键物品，再确认医院差异；不按电商大礼包打包。
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
              精简模式
            </span>
          </div>

          <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-secondary px-3 py-1 text-primary">
              本地优先
            </span>
            <span className="rounded-full bg-amber-soft px-3 py-1 text-amber-foreground">
              医院待确认
            </span>
            <span className="rounded-full bg-coral-soft px-3 py-1 text-coral-foreground">
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
            className="mt-4 flex items-center justify-between rounded-lg bg-coral-soft px-3 py-2 text-sm font-medium text-coral-foreground"
            href="/share"
          >
            <span>爸爸今天负责</span>
            <span className="text-xs">要拿 · 要问 · 要确认</span>
          </Link>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className="h-9">
              <Link href={profile ? "/checklist" : "/setup"}>
                {profile ? "打开清单" : "开始创建清单"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button className="h-9" variant="outline" onClick={openExample}>
              <Eye className="size-4" />
              查看示例
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          <PackingProgressCard
            completed={packing.completed}
            icon={ClipboardList}
            label="打包进度"
            percent={packing.percent}
            total={packing.total}
            tone="primary"
          />
          <div className="grid grid-cols-2 gap-3">
            <PackingProgressCard
              completed={confirmation.completed}
              icon={Hospital}
              label="医院确认"
              percent={confirmation.percent}
              total={confirmation.total}
              tone="amber"
            />
            <PackingProgressCard
              completed={lastMinute.completed}
              icon={CalendarClock}
              label="临出门检查"
              percent={lastMinute.percent}
              total={lastMinute.total}
              tone="coral"
            />
          </div>
        </div>
      </section>

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-3">
        <ActionCard
          description="陪产、入口、押金、提供物品，留到产检时问清楚。"
          href="/checklist"
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

      <Card className="mobile-shell lg:max-w-none">
        <CardContent className="p-5 text-sm leading-6 text-muted-foreground">
          DadKit 不是医院官方清单，也不提供医疗诊断。医院要求可能变化，请以最近一次产检、入院须知或医院通知为准。
        </CardContent>
      </Card>

      <DisclaimerBox />
    </div>
  );
}

function PackingProgressCard({
  completed,
  icon: Icon,
  label,
  percent,
  tone,
  total,
}: {
  completed: number;
  icon: typeof ClipboardList;
  label: string;
  percent: number;
  tone: "primary" | "amber" | "coral";
  total: number;
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
        <div className="mt-2 flex items-center gap-3">
          <Progress value={percent} />
          <span
            className={
              tone === "primary"
                ? "text-xs text-primary-foreground/80"
                : "text-xs text-muted-foreground"
            }
          >
            {completed}/{total}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
