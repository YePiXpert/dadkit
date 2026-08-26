"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo } from "react";

import { HomeProgressSkeleton } from "@/components/HomeDashboardSkeletons";
import { CHECKLIST_PATH } from "@/lib/app-routes";
import { deriveChecklistView } from "@/lib/checklist-v2";
import { useDadKitStore } from "@/lib/store";

export function HomeProgressPanel({ onReady }: { onReady?: () => void }) {
  const hydrated = useDadKitStore((state) => state.hydrated);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistMode = useDadKitStore((state) => state.checklistMode);

  useEffect(() => {
    if (!hydrated) hydrate();
    onReady?.();
  }, [hydrate, hydrated, onReady]);

  const { counts, packing } = useMemo(
    () => deriveChecklistView(checklist, { mode: checklistMode, view: "all" }),
    [checklist, checklistMode],
  );

  if (!hydrated) {
    return <HomeProgressSkeleton />;
  }

  return <ProgressSummaryCard counts={counts} packing={packing} />;
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
      className="group block rounded-card bg-card p-5 shadow-sm transition-colors hover:shadow-md active:bg-secondary/25"
      href={CHECKLIST_PATH}
      prefetch={false}
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
          className="block h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
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
