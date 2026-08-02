"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  PackageCheck,
  Sprout,
  Users,
} from "lucide-react";

import { BabyHomeCard } from "@/components/baby/BabyHomeCard";
import { HomeHeroIllustration } from "@/components/HomeHeroIllustration";
import { HouseholdFeaturePrompt } from "@/components/household/HouseholdFeaturePrompt";
import { PlanningSummaryCard } from "@/components/PlanningSummaryCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CHECKLIST_PATH,
  DEPARTURE_PATH,
  GROWTH_PATH,
  HOSPITAL_PATH,
  PLANNING_PATH,
} from "@/lib/app-routes";
import { hasBabyMode } from "@/lib/baby/portable";
import { useBabyStore } from "@/lib/baby/store";
import { deriveChecklistView } from "@/lib/checklist-v2";
import { getDepartureProgress } from "@/lib/departure";
import { getCurrentGrowthWeekFromDueDate, getDaysUntilDueDate } from "@/lib/growth";
import { useGrowthStore } from "@/lib/growth-store";
import { useHouseholdStore } from "@/lib/household/store";
import { useDadKitStore } from "@/lib/store";

const QUICK_ENTRIES = [
  { href: DEPARTURE_PATH, label: "准备出发", icon: PackageCheck },
  { href: PLANNING_PATH, label: "家庭分工", icon: Users },
  { href: HOSPITAL_PATH, label: "医院档案", icon: Building2 },
  { href: GROWTH_PATH, label: "宝宝成长记", icon: Sprout },
] as const;

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
  const departureProgress = useMemo(
    () => getDepartureProgress(checklist),
    [checklist],
  );

  if (!hydrated || !householdHydrated || !babyHydrated || !growthHydrated) {
    return <HomeDashboardSkeleton />;
  }

  const babyBorn = hasBabyMode(babyProfile);
  const householdName = household.householdName.value.trim();

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-4 lg:max-w-2xl">
        <header className="grid gap-1 px-1 py-2 text-center">
          <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            {householdName || "首页"}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {getStageLine(
              babyBorn,
              babyProfile.fields.nickname.value,
              babyProfile.fields.birthDate.value,
              dueDate,
            )}
          </p>
        </header>

        {babyBorn ? <BabyHomeCard /> : <ProgressHero counts={counts} packing={packing} />}

        <section aria-label="快捷入口" className="grid grid-cols-4 gap-2">
          {QUICK_ENTRIES.map((entry) => {
            const Icon = entry.icon;
            const caption =
              entry.href === DEPARTURE_PATH
                ? getDepartureCaption(departureProgress)
                : null;

            return (
              <Link
                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-card border border-border bg-card p-3 text-center shadow-sm transition-colors hover:bg-secondary/35"
                href={entry.href}
                key={entry.href}
              >
                <span className="icon-tile size-10">
                  <Icon className="size-5" />
                </span>
                <span className="grid gap-0.5">
                  <span className="text-xs font-semibold leading-4">
                    {entry.label}
                  </span>
                  {caption ? (
                    <span className="text-[11px] leading-3 text-muted-foreground">
                      {caption}
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </section>

        {babyBorn ? <ProgressHero counts={counts} packing={packing} /> : <BabyHomeCard />}

        <PlanningSummaryCard compact />

        <HouseholdFeaturePrompt />
      </section>
    </div>
  );
}

function ProgressHero({
  counts,
  packing,
}: {
  counts: { shopping: number; packing: number; packed: number };
  packing: { percent: number; completed: number; total: number };
}) {
  return (
    <Link className="hero-card group block p-5 sm:p-6" href={CHECKLIST_PATH}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">准备进度</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="text-5xl font-bold leading-none tracking-[-0.06em] text-foreground">
              {packing.percent}
              <span className="ml-1 text-2xl tracking-normal">%</span>
            </span>
            <span className="pb-1 text-sm text-muted-foreground">
              已装包 {packing.completed} 项，共 {packing.total} 项
            </span>
          </div>
        </div>
        <HomeHeroIllustration className="size-20 shrink-0 sm:size-24" />
      </div>

      <div
        aria-label={`清单完成 ${packing.percent}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={packing.percent}
        className="mt-5 h-2 overflow-hidden rounded-full bg-card/80"
        role="progressbar"
      >
        <span
          className="block h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${packing.percent}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-primary/10 rounded-2xl bg-card/70 py-3 text-center">
        <ProgressStat label="待买" value={counts.shopping} />
        <ProgressStat label="待装" value={counts.packing} />
        <ProgressStat label="已装" value={counts.packed} />
      </div>
      <span className="sr-only">
        待买 {counts.shopping}，待装 {counts.packing}，已装 {counts.packed} 项
      </span>

      <span className="mt-4 flex items-center justify-end gap-1 text-sm font-semibold text-primary">
        查看完整清单
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
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

function getDepartureCaption(progress: { remaining: number; total: number }) {
  if (progress.remaining > 0) return `还有 ${progress.remaining} 项待确认`;
  if (progress.total > 0) return "已全部确认";
  return null;
}

function getStageLine(
  babyBorn: boolean,
  babyNickname: string,
  babyBirthDate: string,
  dueDate: string,
) {
  if (babyBorn) {
    const days = getDaysSinceBirth(babyBirthDate);
    return `${babyNickname.trim() || "宝宝"}出生第 ${days ?? 1} 天`;
  }

  if (dueDate) {
    const week = getCurrentGrowthWeekFromDueDate(dueDate);
    const daysUntilDue = getDaysUntilDueDate(dueDate);

    if (daysUntilDue !== undefined) {
      return `孕 ${week} 周 · ${
        daysUntilDue >= 0
          ? `距预产期约 ${daysUntilDue} 天`
          : `预产期已过 ${Math.abs(daysUntilDue)} 天`
      }`;
    }
  }

  return "准备进度、出发、分工和宝宝记录，一眼看齐。";
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
      <section className="mobile-shell grid gap-4 lg:max-w-2xl">
        <div className="grid gap-2 px-1 py-2">
          <Skeleton className="h-7 w-24 rounded-xl" />
          <Skeleton className="h-4 w-56 rounded-lg" />
        </div>
        <div className="grid h-52 gap-4 rounded-card bg-muted p-5">
          <div className="flex items-start justify-between">
            <div className="grid gap-3">
              <Skeleton className="h-4 w-20 rounded-lg bg-background/70" />
              <Skeleton className="h-12 w-28 rounded-xl bg-background/70" />
            </div>
            <Skeleton className="size-20 rounded-inset bg-background/70" />
          </div>
          <Skeleton className="h-2 rounded-full bg-background/70" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-10 rounded-xl bg-background/70" />
            <Skeleton className="h-10 rounded-xl bg-background/70" />
            <Skeleton className="h-10 rounded-xl bg-background/70" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Skeleton className="h-20 rounded-card" />
          <Skeleton className="h-20 rounded-card" />
          <Skeleton className="h-20 rounded-card" />
          <Skeleton className="h-20 rounded-card" />
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
        </div>
      </section>
    </div>
  );
}
