"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Baby,
  CarFront,
  ChevronRight,
  ClipboardList,
  DatabaseBackup,
  Hospital,
  Sprout,
  type LucideIcon,
} from "lucide-react";

import { BabyHomeCard } from "@/components/baby/BabyHomeCard";
import { GrowthAnalogyIllustration } from "@/components/GrowthAnalogyIllustration";
import { HouseholdFeaturePrompt } from "@/components/household/HouseholdFeaturePrompt";
import { Skeleton } from "@/components/ui/skeleton";
import { CHECKLIST_PATH } from "@/lib/app-routes";
import { hasBabyMode } from "@/lib/baby/portable";
import { useBabyStore } from "@/lib/baby/store";
import { deriveChecklistView } from "@/lib/checklist-v2";
import {
  getCurrentGrowthWeekFromDueDate,
  getDaysUntilDueDate,
  getGrowthWeek,
  MAX_GROWTH_WEEK,
} from "@/lib/growth";
import { useGrowthStore } from "@/lib/growth-store";
import { useHouseholdStore } from "@/lib/household/store";
import { useDadKitStore } from "@/lib/store";

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
    href: "/hospital",
    title: "医院档案",
    description: "建档信息与紧急联系",
    icon: Hospital,
    accent: "bg-tile-docs-bg text-tile-docs-fg",
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
  const hydrated = useDadKitStore((state) => state.hydrated);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistMode = useDadKitStore((state) => state.checklistMode);
  const household = useHouseholdStore((state) => state.household);
  const householdHydrated = useHouseholdStore((state) => state.hydrated);
  const hydrateHousehold = useHouseholdStore((state) => state.hydrate);
  const babyProfile = useBabyStore((state) => state.profile);
  const babyHydrated = useBabyStore((state) => state.hydrated);
  const hydrateBaby = useBabyStore((state) => state.hydrate);
  const dueDate = useGrowthStore((state) => state.dueDate);
  const growthHydrated = useGrowthStore((state) => state.hydrated);
  const hydrateGrowth = useGrowthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
    hydrateHousehold();
    hydrateBaby();
    hydrateGrowth();
  }, [hydrate, hydrateHousehold, hydrateBaby, hydrateGrowth]);

  const { counts, packing } = useMemo(
    () => deriveChecklistView(checklist, { mode: checklistMode, view: "all" }),
    [checklist, checklistMode],
  );

  if (!hydrated || !householdHydrated || !babyHydrated || !growthHydrated) {
    return <HomeDashboardSkeleton />;
  }

  const babyBorn = hasBabyMode(babyProfile);
  const householdName = household.householdName.value.trim();

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-4 sm:max-w-[42rem]">
        <header className="grid gap-1 px-1 py-2 text-center">
          <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-[28px]">
            {householdName || "首页"}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            今天也一起稳稳准备。
          </p>
        </header>

        <StageHero
          babyBirthDate={babyProfile.fields.birthDate.value}
          babyBorn={babyBorn}
          babyNickname={babyProfile.fields.nickname.value}
          dueDate={dueDate}
        />

        {babyBorn ? <BabyHomeCard /> : null}

        <HomeEntryGrid />

        <ProgressSummaryCard counts={counts} packing={packing} />

        <HouseholdFeaturePrompt />
      </section>
    </div>
  );
}

function StageHero({
  babyBirthDate,
  babyBorn,
  babyNickname,
  dueDate,
}: {
  babyBirthDate: string;
  babyBorn: boolean;
  babyNickname: string;
  dueDate: string;
}) {
  if (babyBorn) {
    const days = getDaysSinceBirth(babyBirthDate) ?? 1;
    const nickname = babyNickname.trim() || "宝宝";

    return (
      <Link
        className="hero-card group flex items-center gap-4 p-5 sm:p-6"
        href="/baby"
      >
        <span className="icon-tile size-12">
          <Baby className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-primary">
            宝宝已经来到身边
          </span>
          <span className="mt-1 block break-words text-2xl font-bold leading-tight text-foreground">
            {nickname}出生第 {days} 天
          </span>
          <span className="mt-1 block text-sm leading-6 text-muted-foreground">
            点这里记录喂养、尿布和睡眠。
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </Link>
    );
  }

  const daysUntilDue = getDaysUntilDueDate(dueDate);

  if (daysUntilDue === undefined) {
    return (
      <Link className="hero-card group block p-5 sm:p-6" href="/growth">
        <span className="flex items-center gap-4">
          <span className="icon-tile size-12">
            <Sprout className="size-6" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-primary">
              孕周状态
            </span>
            <span className="mt-1 block text-2xl font-bold leading-tight text-foreground">
              宝宝现在多大了？
            </span>
          </span>
        </span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">
          设置预产期后，这里会显示孕周、倒计时和成长类比。
        </span>
        <span className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-full bg-card px-4 text-sm font-semibold text-primary shadow-sm">
          设置预产期
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </span>
      </Link>
    );
  }

  const daysPregnant = Math.max(0, 280 - daysUntilDue);
  const overdue = daysUntilDue < 0;
  const displayWeek = Math.min(MAX_GROWTH_WEEK, Math.floor(daysPregnant / 7));
  const displayDay = overdue ? 0 : daysPregnant % 7;
  const weekData = getGrowthWeek(getCurrentGrowthWeekFromDueDate(dueDate));

  return (
    <Link className="hero-card group block p-5 sm:p-6" href="/growth">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">
            {weekData.trimester}
          </p>
          <p className="mt-1 text-3xl font-bold leading-tight text-foreground">
            孕 {displayWeek} 周{displayDay > 0 ? ` + ${displayDay} 天` : ""}
          </p>
          <p className="mt-1.5 text-sm font-medium text-foreground">
            {overdue
              ? `预产期已过 ${Math.abs(daysUntilDue)} 天`
              : `距预产期约 ${daysUntilDue} 天`}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            宝宝现在约有{weekData.analogy}那么大。
          </p>
        </div>
        <GrowthAnalogyIllustration
          analogy={weekData.analogy}
          className="w-24 shrink-0 sm:w-28"
          week={weekData.week}
        />
      </div>
    </Link>
  );
}

function HomeEntryGrid() {
  return (
    <section aria-label="常用工具" className="grid grid-cols-2 gap-3">
      {HOME_ENTRIES.map((entry) => {
        const Icon = entry.icon;

        return (
          <Link
            className="group flex min-w-0 flex-col gap-3 rounded-card bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            href={entry.href}
            key={entry.href}
          >
            <span
              className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${entry.accent}`}
            >
              <Icon className="size-5" />
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

function ProgressSummaryCard({
  counts,
  packing,
}: {
  counts: { shopping: number; packing: number; packed: number };
  packing: { percent: number; completed: number; total: number };
}) {
  return (
    <Link
      className="group block rounded-card bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
      href={CHECKLIST_PATH}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">准备进度</p>
          <div className="mt-1.5 flex flex-wrap items-end gap-x-2.5 gap-y-1">
            <span className="text-4xl font-bold leading-none text-foreground">
              {packing.percent}
              <span className="ml-0.5 text-xl">%</span>
            </span>
            <span className="pb-0.5 text-[13px] text-muted-foreground">
              已装包 {packing.completed} 项，共 {packing.total} 项
            </span>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 pt-1 text-[13px] font-semibold text-muted-foreground transition-colors group-hover:text-primary">
          查看完整清单
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </span>
      </div>

      <div
        aria-label={`清单完成 ${packing.percent}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={packing.percent}
        className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <span
          className="block h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${packing.percent}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 divide-x divide-border rounded-2xl bg-background py-3 text-center">
        <ProgressStat label="待买" value={counts.shopping} />
        <ProgressStat label="待装" value={counts.packing} />
        <ProgressStat label="已装" value={counts.packed} />
      </div>
      <span className="sr-only">
        待买 {counts.shopping}，待装 {counts.packing}，已装 {counts.packed} 项
      </span>
    </Link>
  );
}

function ProgressStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="grid gap-0.5 px-1">
      <strong className="text-lg font-bold leading-none text-foreground">
        {value}
      </strong>
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
    </span>
  );
}

function getDaysSinceBirth(birthDate: string) {
  if (!birthDate) return undefined;

  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return undefined;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(
    1,
    Math.floor((today.getTime() - birth.getTime()) / 86_400_000) + 1,
  );
}

export function HomeDashboardSkeleton() {
  return (
    <div className="page-shell page-shell-with-nav" aria-label="正在准备首页">
      <section className="mobile-shell grid gap-4 sm:max-w-[42rem]">
        <div className="grid gap-2 px-1 py-2">
          <Skeleton className="h-7 w-24 rounded-xl" />
          <Skeleton className="h-4 w-40 rounded-lg" />
        </div>
        <div className="rounded-card bg-muted p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-3">
              <Skeleton className="h-4 w-20 rounded-lg bg-background/70" />
              <Skeleton className="h-9 w-32 rounded-xl bg-background/70" />
              <Skeleton className="h-4 w-28 rounded-lg bg-background/70" />
            </div>
            <Skeleton className="h-[4.5rem] w-24 rounded-inset bg-background/70" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
        </div>
        <div className="grid gap-3 rounded-card bg-muted p-5">
          <Skeleton className="h-8 w-24 rounded-lg bg-background/70" />
          <Skeleton className="h-2 rounded-full bg-background/70" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-10 rounded-xl bg-background/70" />
            <Skeleton className="h-10 rounded-xl bg-background/70" />
            <Skeleton className="h-10 rounded-xl bg-background/70" />
          </div>
        </div>
      </section>
    </div>
  );
}
