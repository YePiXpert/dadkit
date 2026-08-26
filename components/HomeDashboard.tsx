"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Baby,
  CarFront,
  ClipboardList,
  DatabaseBackup,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  HomeProgressSkeleton,
  HomeStageSkeleton,
} from "@/components/HomeDashboardSkeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { CHECKLIST_PATH } from "@/lib/app-routes";

const HomeStagePanel = dynamic(
  () =>
    import("@/components/HomeStagePanel").then(
      (module) => module.HomeStagePanel,
    ),
  { loading: () => <HomeStageSkeleton />, ssr: false },
);
const HomeProgressPanel = dynamic(
  () =>
    import("@/components/HomeProgressPanel").then(
      (module) => module.HomeProgressPanel,
    ),
  { loading: () => <HomeProgressSkeleton />, ssr: false },
);
const HomeHouseholdTitle = dynamic(
  () =>
    import("@/components/HomeHouseholdTitle").then(
      (module) => module.HomeHouseholdTitle,
    ),
  { loading: () => <HomeTitleFallback />, ssr: false },
);
const HouseholdFeaturePrompt = dynamic(
  () =>
    import("@/components/household/HouseholdFeaturePrompt").then(
      (module) => module.HouseholdFeaturePrompt,
    ),
  { ssr: false },
);

const HOME_ENTRIES = [
  {
    href: CHECKLIST_PATH,
    title: "待产包清单",
    description: "差什么一眼看齐",
    icon: ClipboardList,
    accent: "bg-tile-baby-bg text-tile-baby-fg",
  },
  {
    href: "/growth",
    title: "孕期成长记",
    description: "每周发育类比与产检提醒",
    icon: Sprout,
    accent: "bg-tile-dad-bg text-tile-dad-fg",
  },
  {
    href: "/baby",
    title: "宝宝记录",
    description: "喂养、尿布和睡眠随手记",
    icon: Baby,
    accent: "bg-tile-mom-bg text-tile-mom-fg",
  },
  {
    href: "/departure",
    title: "准备出发",
    description: "临产出发逐项确认",
    icon: CarFront,
    accent: "bg-tile-car-bg text-tile-car-fg",
  },
  {
    href: "/settings/backup",
    title: "备份与恢复",
    description: "导出备份，安心换设备",
    icon: DatabaseBackup,
    accent: "bg-tile-lastminute-bg text-tile-lastminute-fg",
  },
] as const satisfies readonly {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}[];

export function HomeDashboard() {
  const [stageReady, setStageReady] = useState(false);
  const [stageSettled, setStageSettled] = useState(false);
  const [progressReady, setProgressReady] = useState(false);
  const [progressSettled, setProgressSettled] = useState(false);
  const [householdReady, setHouseholdReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setStageReady(true));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!stageSettled) return;
    return scheduleHomeSection(() => setProgressReady(true), 180, 700);
  }, [stageSettled]);

  useEffect(() => {
    if (!progressSettled) return;
    return scheduleHomeSection(() => setHouseholdReady(true), 450, 900);
  }, [progressSettled]);

  const handleStageReady = useCallback(() => setStageSettled(true), []);
  const handleProgressReady = useCallback(() => setProgressSettled(true), []);

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-4 sm:max-w-[42rem]">
        <header className="grid gap-1 px-1 py-2">
          <p className="text-[13px] font-semibold text-primary">家庭首页</p>
          {householdReady ? <HomeHouseholdTitle /> : <HomeTitleFallback />}
          <p className="text-sm leading-6 text-muted-foreground">
            今天也一起稳稳准备。
          </p>
        </header>

        {stageReady ? (
          <HomeStagePanel onReady={handleStageReady} />
        ) : (
          <HomeStageSkeleton />
        )}

        <HomeEntryGrid />

        {progressReady ? (
          <HomeProgressPanel onReady={handleProgressReady} />
        ) : (
          <HomeProgressSkeleton />
        )}

        {householdReady ? <HouseholdFeaturePrompt /> : null}
      </section>
    </div>
  );
}

function scheduleHomeSection(
  callback: () => void,
  delay: number,
  idleTimeout: number,
) {
  let idleCallback: number | undefined;
  const timer = setTimeout(() => {
    if ("requestIdleCallback" in window) {
      idleCallback = window.requestIdleCallback(callback, {
        timeout: idleTimeout,
      });
    } else {
      callback();
    }
  }, delay);

  return () => {
    clearTimeout(timer);
    if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback);
  };
}

function HomeTitleFallback() {
  return (
    <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-[28px]">
      首页
    </h1>
  );
}

function HomeEntryGrid() {
  return (
    <section aria-label="常用工具" className="grid grid-cols-2 gap-3">
      {HOME_ENTRIES.map((entry) => {
        const Icon = entry.icon;

        return (
          <Link
            className="group flex min-w-0 flex-col gap-3 rounded-card bg-card p-4 shadow-sm transition-colors hover:shadow-md active:bg-secondary/30"
            href={entry.href}
            key={entry.href}
            prefetch={false}
          >
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${entry.accent}`}
            >
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-6 text-foreground">
                {entry.title}
              </span>
              <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">
                {entry.description}
              </span>
            </span>
          </Link>
        );
      })}
    </section>
  );
}

export function HomeDashboardSkeleton() {
  return (
    <div
      aria-label="正在准备首页"
      className="page-shell page-shell-with-nav"
      role="status"
    >
      <section className="mobile-shell grid gap-4 sm:max-w-[42rem]">
        <div className="grid gap-2 px-1 py-2">
          <Skeleton className="h-7 w-24 rounded-xl" />
          <Skeleton className="h-4 w-40 rounded-lg" />
        </div>
        <HomeStageSkeleton />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
        </div>
        <HomeProgressSkeleton />
      </section>
    </div>
  );
}
