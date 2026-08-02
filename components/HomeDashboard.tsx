"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, PackageCheck } from "lucide-react";

import { BabyHomeCard } from "@/components/baby/BabyHomeCard";
import { HomeHeroIllustration } from "@/components/HomeHeroIllustration";
import { HouseholdFeaturePrompt } from "@/components/household/HouseholdFeaturePrompt";
import { PageHeader } from "@/components/PageHeader";
import { PlanningSummaryCard } from "@/components/PlanningSummaryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { CHECKLIST_PATH, DEPARTURE_PATH } from "@/lib/app-routes";
import { deriveChecklistView } from "@/lib/checklist-v2";
import { getDepartureProgress } from "@/lib/departure";
import { useDadKitStore } from "@/lib/store";

export function HomeDashboard() {
  const hydrated = useDadKitStore((state) => state.hydrated);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistMode = useDadKitStore((state) => state.checklistMode);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const { counts, packing } = useMemo(
    () => deriveChecklistView(checklist, { mode: checklistMode, view: "all" }),
    [checklist, checklistMode],
  );
  const departureProgress = useMemo(
    () => getDepartureProgress(checklist),
    [checklist],
  );

  if (!hydrated) {
    return <HomeDashboardSkeleton />;
  }

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-4 lg:max-w-2xl">
        <PageHeader
          title="首页"
          subtitle="准备进度、出发、分工和宝宝记录，一眼看齐。"
        />

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

        <Link
          className="group flex min-h-24 items-center gap-3 rounded-card border border-primary/20 bg-card p-4 transition-colors hover:bg-secondary/35"
          href={DEPARTURE_PATH}
        >
          <span className="icon-tile size-12">
            <PackageCheck className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-base font-semibold">准备出发</strong>
            <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">
              {departureProgress.remaining > 0
                ? `还有 ${departureProgress.remaining} 项出发前需要确认`
                : departureProgress.total > 0
                  ? "关键物品已经确认，可以安心出发"
                  : "整理证件、随车物品和关键行李"}
            </span>
          </span>
          <ArrowRight
            aria-hidden="true"
            className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>

        <PlanningSummaryCard compact />

        <BabyHomeCard />

        <HouseholdFeaturePrompt />
      </section>
    </div>
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
        <div className="grid gap-4">
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
        </div>
      </section>
    </div>
  );
}
