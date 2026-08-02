"use client";

import Link from "next/link";
import { CalendarClock, Users } from "lucide-react";
import { useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { PLANNING_PATH } from "@/lib/app-routes";
import { getLocalPlanningDate } from "@/lib/planning/date";
import {
  derivePlanningSummary,
  formatPlanningMoney,
} from "@/lib/planning/selectors";
import { useItemPlanningStore } from "@/lib/planning/store";
import { useDadKitStore } from "@/lib/store";

export function PlanningSummaryCard({ compact = false }: { compact?: boolean }) {
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistHydrated = useDadKitStore((state) => state.hydrated);
  const hydrateChecklist = useDadKitStore((state) => state.hydrate);
  const planning = useItemPlanningStore((state) => state.planning);
  const planningHydrated = useItemPlanningStore((state) => state.hydrated);
  const hydratePlanning = useItemPlanningStore((state) => state.hydrate);
  const today = getLocalPlanningDate();
  const summary = useMemo(
    () => derivePlanningSummary(checklist, planning, today),
    [checklist, planning, today],
  );

  useEffect(() => {
    hydrateChecklist();
    hydratePlanning();
  }, [hydrateChecklist, hydratePlanning]);

  if (!checklistHydrated || !planningHydrated) {
    return <div className="h-28 animate-pulse rounded-card bg-muted" />;
  }

  if (compact) {
    const started = summary.unassignedCount < summary.activeCount;
    const message =
      summary.overdueCount > 0
        ? `有 ${summary.overdueCount} 项已经超过完成期限`
        : started
          ? `已分工 ${summary.activeCount - summary.unassignedCount} 项 · 7 天内需完成 ${summary.dueSoonCount} 项`
          : "还没有分配负责人，可以先从核心物品开始。";

    return (
      <section className="flex min-h-28 items-center gap-3 rounded-card border border-primary/20 bg-card p-4">
        <span className="icon-tile size-12"><Users className="size-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="section-kicker">一起准备</p>
          <h2 className="mt-1 text-base font-semibold">家庭分工与采购</h2>
          <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
            {message}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={PLANNING_PATH}>{started ? "查看" : "开始分工"}</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-card border border-primary/20 bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="icon-tile size-12"><CalendarClock className="size-6" /></span>
        <div>
          <p className="section-kicker">当前安排</p>
          <h2 className="mt-1 text-lg font-semibold">分工与采购概览</h2>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            金额按项目总价统计，不会乘以清单数量。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SummaryMetric label="未分工" value={`${summary.unassignedCount}`} />
        <SummaryMetric label="已逾期" value={`${summary.overdueCount}`} alert={summary.overdueCount > 0} />
        <SummaryMetric label="未来 7 天" value={`${summary.dueSoonCount}`} />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
        <MoneyMetric
          label="预计总额"
          value={summary.estimatedCoverageCount > 0 ? formatPlanningMoney(summary.estimatedTotalFen) : "尚未记录"}
          coverage={summary.estimatedCoverageCount}
        />
        <MoneyMetric
          label="实际已记录总额"
          value={summary.actualCoverageCount > 0 ? formatPlanningMoney(summary.actualTotalFen) : "尚未记录"}
          coverage={summary.actualCoverageCount}
        />
      </div>
    </section>
  );
}

function SummaryMetric({
  alert = false,
  label,
  value,
}: {
  alert?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-inset bg-background/70 p-3 text-center">
      <strong className={alert ? "text-xl text-destructive" : "text-xl"}>{value}</strong>
      <span className="mt-1 block text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function MoneyMetric({
  coverage,
  label,
  value,
}: {
  coverage: number;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">已覆盖 {coverage} 项</p>
    </div>
  );
}
